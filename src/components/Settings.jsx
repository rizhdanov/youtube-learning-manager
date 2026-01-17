import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import authService from '../services/authService';
import storageService from '../services/storageService';
import { FiSave, FiDownload, FiUpload, FiTrash2, FiAlertCircle, FiCheckCircle, FiLogIn, FiLogOut, FiDatabase } from 'react-icons/fi';
import './Settings.css';

const Settings = () => {
  const { settings, updateSettings, exportData, importData, getStats } = useVideos();
  const [youtubeClientId, setYoutubeClientId] = useState(settings.youtubeClientId || '');
  const [youtubeClientSecret, setYoutubeClientSecret] = useState(settings.youtubeClientSecret || '');
  const [customPlaylistId, setCustomPlaylistId] = useState(settings.customPlaylistId || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(settings.openaiApiKey || '');
  const [categorizationPrompt, setCategorizationPrompt] = useState(settings.categorizationPrompt || '');
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const handleSave = () => {
    updateSettings({
      youtubeClientId,
      youtubeClientSecret,
      customPlaylistId,
      openaiApiKey,
      categorizationPrompt,
    });

    if (youtubeClientId && youtubeClientSecret) {
      authService.setCredentials(youtubeClientId, youtubeClientSecret);
    }

    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSignIn = () => {
    if (!youtubeClientId || !youtubeClientSecret) {
      setSaveMessage('Please save your OAuth credentials first!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    authService.setCredentials(youtubeClientId, youtubeClientSecret);
    authService.startOAuthFlow();
  };

  const handleSignOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setSaveMessage('Signed out successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleExport = (includeApiKeys = false) => {
    const success = storageService.exportToJSON(includeApiKeys);
    if (success) {
      setSaveMessage(includeApiKeys ? 'Full backup exported (includes API keys)!' : 'Data exported successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('Failed to export data');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await importData(file);
      setImportMessage(`Successfully imported ${result.videosCount} videos and ${result.categoriesCount} categories`);
      setTimeout(() => setImportMessage(''), 5000);
    } catch (error) {
      setImportMessage('Failed to import data: ' + error.message);
      setTimeout(() => setImportMessage(''), 5000);
    }

    event.target.value = '';
  };

  const stats = getStats();

  return (
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>YouTube OAuth 2.0 Configuration</h3>
        <p className="section-description">
          Configure OAuth 2.0 credentials to access your private Watch Later playlist.
        </p>

        {isAuthenticated && (
          <div className="auth-status-box success">
            <FiCheckCircle />
            <div>
              <strong>Signed In</strong>
              <p>You are authenticated with YouTube</p>
            </div>
            <button onClick={handleSignOut} className="sign-out-btn">
              <FiLogOut /> Sign Out
            </button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="auth-status-box">
            <FiAlertCircle />
            <div>
              <strong>Not Signed In</strong>
              <p>Sign in with Google to access your Watch Later videos</p>
            </div>
          </div>
        )}

        <div className="api-key-group">
          <label htmlFor="youtube-client-id">
            OAuth Client ID
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="help-link"
            >
              Create OAuth Client
            </a>
          </label>
          <input
            id="youtube-client-id"
            type="text"
            value={youtubeClientId}
            onChange={(e) => setYoutubeClientId(e.target.value)}
            placeholder="Enter your OAuth 2.0 Client ID"
            className="api-key-input"
          />
          <p className="input-hint">
            Create OAuth 2.0 credentials in Google Cloud Console. Set redirect URI to: http://localhost:5173/oauth/callback
          </p>
        </div>

        <div className="api-key-group">
          <label htmlFor="youtube-client-secret">
            OAuth Client Secret
          </label>
          <div className="input-with-toggle">
            <input
              id="youtube-client-secret"
              type={showClientSecret ? 'text' : 'password'}
              value={youtubeClientSecret}
              onChange={(e) => setYoutubeClientSecret(e.target.value)}
              placeholder="Enter your OAuth 2.0 Client Secret"
              className="api-key-input"
            />
            <button
              type="button"
              onClick={() => setShowClientSecret(!showClientSecret)}
              className="toggle-visibility"
            >
              {showClientSecret ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="oauth-actions">
          <button onClick={handleSave} className="save-button">
            <FiSave /> Save OAuth Credentials
          </button>
          {!isAuthenticated && (
            <button onClick={handleSignIn} className="sign-in-button">
              <FiLogIn /> Sign In with Google
            </button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>Playlist Configuration</h3>
        <p className="section-description">
          Specify which YouTube playlist to sync. Leave empty to use Watch Later (default).
        </p>

        <div className="api-key-group">
          <label htmlFor="custom-playlist-id">
            Custom Playlist URL or ID (Optional)
          </label>
          <input
            id="custom-playlist-id"
            type="text"
            value={customPlaylistId}
            onChange={(e) => setCustomPlaylistId(e.target.value)}
            placeholder="Enter playlist URL or ID (e.g., PLxxx... or https://www.youtube.com/playlist?list=PLxxx...)"
            className="api-key-input"
          />
          <p className="input-hint">
            <strong>Note:</strong> YouTube's Watch Later playlist may not be accessible via API.
            If sync returns 0 videos, create a custom public or unlisted playlist and enter its URL here.
          </p>
        </div>

        <button onClick={handleSave} className="save-button">
          <FiSave /> Save Playlist Settings
        </button>
      </div>

      <div className="settings-section">
        <h3>OpenAI API Configuration</h3>
        <p className="section-description">
          Configure your OpenAI API key for video summarization.
        </p>

        <div className="api-key-group">
          <label htmlFor="openai-api-key">
            OpenAI API Key
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="help-link"
            >
              Get API Key
            </a>
          </label>
          <div className="input-with-toggle">
            <input
              id="openai-api-key"
              type={showOpenaiKey ? 'text' : 'password'}
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="api-key-input"
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              className="toggle-visibility"
            >
              {showOpenaiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="input-hint">
            Required for video summarization. Pay-per-use (~$0.01-0.02 per summary).
          </p>
        </div>

        <button onClick={handleSave} className="save-button">
          <FiSave /> Save OpenAI API Key
        </button>
      </div>

      <div className="settings-section">
        <h3>Auto-Categorization Settings</h3>
        <p className="section-description">
          Configure the system prompt for automatic video categorization using OpenAI.
        </p>

        <div className="api-key-group">
          <label htmlFor="categorization-prompt">
            Categorization System Prompt
          </label>
          <textarea
            id="categorization-prompt"
            value={categorizationPrompt}
            onChange={(e) => setCategorizationPrompt(e.target.value)}
            placeholder="Enter system prompt for auto-categorization..."
            className="prompt-textarea"
            rows="4"
          />
          <p className="input-hint">
            This prompt will be used by OpenAI to automatically create categories and assign videos.
            The default prompt creates exactly 6 categories based on video titles and channels.
          </p>
        </div>

        <button onClick={handleSave} className="save-button">
          <FiSave /> Save Categorization Settings
        </button>
      </div>

      {saveMessage && (
        <div className={`message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
          {saveMessage.includes('Failed') ? <FiAlertCircle /> : <FiCheckCircle />}
          {saveMessage}
        </div>
      )}

      <div className="settings-section">
        <h3>Data Management</h3>
        <p className="section-description">
          Export your data for backup or import previously exported data. Full backup includes API keys.
        </p>

        <div className="data-actions">
          <button onClick={() => handleExport(false)} className="action-button export">
            <FiDownload /> Export (No Keys)
          </button>

          <button onClick={() => handleExport(true)} className="action-button export full-backup">
            <FiDatabase /> Full Backup (With Keys)
          </button>

          <label htmlFor="import-file" className="action-button import">
            <FiUpload /> Import Backup
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {importMessage && (
          <div className={`message ${importMessage.includes('Failed') ? 'error' : 'success'}`}>
            {importMessage.includes('Failed') ? <FiAlertCircle /> : <FiCheckCircle />}
            {importMessage}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Statistics & Stored Data</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Videos</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.watched}</div>
            <div className="stat-label">Watched</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.unwatched}</div>
            <div className="stat-label">Unwatched</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.categories?.length || 0}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-item highlight">
            <div className="stat-value">{stats.categories?.reduce((sum, c) => sum + (c.videoCount || 0), 0) || 0}</div>
            <div className="stat-label">Categorized Videos</div>
          </div>
          <div className="stat-item highlight">
            <div className="stat-value">{stats.withTranscripts || 0}</div>
            <div className="stat-label">With Transcripts</div>
          </div>
          <div className="stat-item highlight">
            <div className="stat-value">{stats.withSummaries}</div>
            <div className="stat-label">With Summaries</div>
          </div>
        </div>

        <div className="persistence-status">
          <h4>Persistence Status</h4>
          <ul className="status-list">
            <li className={settings.openaiApiKey ? 'saved' : 'not-saved'}>
              <FiCheckCircle /> OpenAI API Key: {settings.openaiApiKey ? 'Saved' : 'Not Set'}
            </li>
            <li className={settings.youtubeClientId ? 'saved' : 'not-saved'}>
              <FiCheckCircle /> YouTube Credentials: {settings.youtubeClientId ? 'Saved' : 'Not Set'}
            </li>
            <li className={settings.customPlaylistId ? 'saved' : 'not-saved'}>
              <FiCheckCircle /> Playlist ID: {settings.customPlaylistId ? 'Saved' : 'Not Set (using default)'}
            </li>
            <li className="saved">
              <FiCheckCircle /> Videos, Categories, Transcripts, Summaries: Auto-saved to browser storage
            </li>
          </ul>
        </div>

        {settings.lastSync && (
          <p className="last-sync">
            Last synced: {new Date(settings.lastSync).toLocaleString()}
          </p>
        )}
      </div>

      <div className="settings-section warning-section">
        <h3><FiAlertCircle /> Important Notes</h3>
        <ul className="warning-list">
          <li>All data (videos, categories, transcripts, summaries, API keys) is automatically saved to browser localStorage.</li>
          <li>Data persists between sessions - your settings and progress are kept when you close and reopen the app.</li>
          <li><strong>Export (No Keys)</strong>: Creates a backup without API keys (safe to share).</li>
          <li><strong>Full Backup</strong>: Includes API keys - keep this file secure and private!</li>
          <li>Import will restore all data including API keys if present in the backup file.</li>
          <li>YouTube API quota resets daily. If you exceed the quota, wait 24 hours.</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
