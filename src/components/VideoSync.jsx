import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import authService from '../services/authService';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import './VideoSync.css';

const VideoSync = () => {
  const { syncVideos, loading, error, settings } = useVideos();
  const [maxResults, setMaxResults] = useState(50);
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async () => {
    setSyncMessage('');
    const success = await syncVideos(maxResults);
    if (success) {
      setSyncMessage('Videos synced successfully!');
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const isAuthenticated = authService.isAuthenticated();

  const playlistSource = settings.customPlaylistId
    ? `Custom Playlist (${settings.customPlaylistId.substring(0, 20)}...)`
    : 'Watch Later';

  return (
    <div className="video-sync-container">
      <div className="sync-header">
        <h3>Sync Your YouTube Videos</h3>
        <p>Syncing from: <strong>{playlistSource}</strong></p>
        {!settings.customPlaylistId && (
          <p className="hint-text">
            Note: If Watch Later returns 0 videos, configure a custom playlist in Settings.
          </p>
        )}
      </div>

      {!isAuthenticated && (
        <div className="warning-box">
          <FiAlertCircle />
          <div>
            <strong>Not signed in with YouTube</strong>
            <p>Please sign in with Google in Settings to access your Watch Later videos.</p>
          </div>
        </div>
      )}

      <div className="sync-controls">
        <div className="max-results-control">
          <label htmlFor="max-results">
            Maximum videos to fetch:
          </label>
          <input
            id="max-results"
            type="number"
            min="1"
            max="500"
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value) || 50)}
            disabled={loading || !isAuthenticated}
          />
        </div>

        <button
          onClick={handleSync}
          disabled={loading || !isAuthenticated}
          className="sync-button"
        >
          {loading ? (
            <>
              <FiRefreshCw className="spinning" />
              Syncing...
            </>
          ) : (
            <>
              <FiRefreshCw />
              Sync Videos
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle />
          {error}
        </div>
      )}

      {syncMessage && (
        <div className="success-message">
          <FiCheckCircle />
          {syncMessage}
        </div>
      )}

      {settings.lastSync && (
        <div className="last-sync-info">
          Last synced: {new Date(settings.lastSync).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default VideoSync;
