const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Dynamically get redirect URI based on current domain (works for localhost and production)
const getRedirectUri = () => `${window.location.origin}/oauth/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
];

class AuthService {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  setCredentials(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  loadTokens() {
    try {
      const tokens = localStorage.getItem('youtube_oauth_tokens');
      if (tokens) {
        const parsed = JSON.parse(tokens);
        this.accessToken = parsed.accessToken;
        this.refreshToken = parsed.refreshToken;
        this.tokenExpiry = parsed.tokenExpiry;
        return true;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    return false;
  }

  saveTokens() {
    try {
      localStorage.setItem('youtube_oauth_tokens', JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        tokenExpiry: this.tokenExpiry,
      }));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('youtube_oauth_tokens');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  startOAuthFlow() {
    if (!this.clientId) {
      throw new Error('Client ID not configured');
    }

    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_state_timestamp', Date.now().toString());

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async handleOAuthCallback(code, state) {
    const savedState = localStorage.getItem('oauth_state');
    const stateTimestamp = localStorage.getItem('oauth_state_timestamp');

    console.log('Received state:', state);
    console.log('Saved state:', savedState);

    if (!savedState) {
      throw new Error('No saved state found. Please try signing in again.');
    }

    // Check if state is expired (5 minutes)
    if (stateTimestamp && Date.now() - parseInt(stateTimestamp) > 5 * 60 * 1000) {
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_state_timestamp');
      throw new Error('Authentication session expired. Please try signing in again.');
    }

    if (state !== savedState) {
      throw new Error('Invalid state parameter. Please try signing in again.');
    }

    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_state_timestamp');

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAuth credentials not configured');
    }

    try {
      console.log('Exchanging code for token...');
      console.log('Client ID:', this.clientId);
      console.log('Redirect URI:', getRedirectUri());

      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: getRedirectUri(),
          grant_type: 'authorization_code',
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Token exchange error:', error);

        if (error.error === 'invalid_client') {
          throw new Error('Invalid Client ID or Client Secret. Please check your OAuth credentials in Settings.');
        }
        if (error.error === 'redirect_uri_mismatch') {
          throw new Error(`Redirect URI mismatch. Make sure ${getRedirectUri()} is configured in Google Cloud Console.`);
        }
        throw new Error(error.error_description || `Token exchange failed: ${error.error}`);
      }

      const data = await response.json();
      console.log('Token exchange successful!');

      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      this.saveTokens();
      return true;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('OAuth credentials not configured');
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'Failed to refresh token');
      }

      const data = await response.json();

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      this.saveTokens();
      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      throw error;
    }
  }

  async getValidAccessToken() {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return this.accessToken;
  }

  signOut() {
    this.clearTokens();
  }
}

export default new AuthService();
