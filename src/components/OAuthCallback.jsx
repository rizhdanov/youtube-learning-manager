import { useEffect, useState } from 'react';
import authService from '../services/authService';
import { FiLoader } from 'react-icons/fi';
import './OAuthCallback.css';

const OAuthCallback = ({ onComplete }) => {
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          onComplete(false);
        }, 3000);
        return;
      }

      if (!code || !state) {
        setError('Invalid callback parameters');
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          onComplete(false);
        }, 3000);
        return;
      }

      try {
        await authService.handleOAuthCallback(code, state);
        window.history.replaceState({}, '', '/');
        onComplete(true);
      } catch (err) {
        setError(err.message || 'Failed to complete authentication');
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          onComplete(false);
        }, 3000);
      }
    };

    handleCallback();
  }, [onComplete]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-content">
        {error ? (
          <>
            <div className="oauth-error">❌</div>
            <h2>Authentication Failed</h2>
            <p>{error}</p>
            <p className="redirect-message">Redirecting back...</p>
          </>
        ) : (
          <>
            <FiLoader className="oauth-spinner" />
            <h2>Completing Authentication</h2>
            <p>Please wait while we complete your sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
