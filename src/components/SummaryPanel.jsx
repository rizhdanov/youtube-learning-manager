import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import openaiService from '../services/openaiService';
import { FiX, FiRefreshCw, FiEdit, FiSave, FiAlertCircle } from 'react-icons/fi';
import './SummaryPanel.css';

const SummaryPanel = ({ video, onClose }) => {
  const { updateVideo, settings } = useVideos();
  const [summary, setSummary] = useState(video.summary || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    if (settings.openaiApiKey) {
      openaiService.setApiKey(settings.openaiApiKey);
    }
  }, [settings.openaiApiKey]);

  const handleGenerate = async () => {
    if (!settings.openaiApiKey) {
      setError('OpenAI API key not configured. Please add it in Settings.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const generatedSummary = await openaiService.summarizeVideoFromDescription(
        video.title,
        video.description
      );
      setSummary(generatedSummary);
      updateVideo(video.id, { summary: generatedSummary });
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to generate summary');
      setLoading(false);
    }
  };

  const handleSave = () => {
    updateVideo(video.id, { summary });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSummary(video.summary || '');
    setIsEditing(false);
  };

  return (
    <div className="summary-panel-modal" onClick={onClose}>
      <div className="summary-panel-content" onClick={(e) => e.stopPropagation()}>
        <div className="summary-header">
          <h3>Video Summary</h3>
          <button onClick={onClose} className="close-btn">
            <FiX />
          </button>
        </div>

        <div className="video-info-summary">
          <h4>{video.title}</h4>
          <p>{video.channelTitle}</p>
        </div>

        {error && (
          <div className="error-box">
            <FiAlertCircle />
            {error}
          </div>
        )}

        <div className="summary-actions">
          {!isEditing && (
            <>
              <button
                onClick={handleGenerate}
                disabled={loading || !settings.openaiApiKey}
                className="generate-btn"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="spinning" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    {summary ? 'Regenerate' : 'Generate'} Summary
                  </>
                )}
              </button>
              {summary && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-btn"
                  disabled={loading}
                >
                  <FiEdit /> Edit
                </button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <button onClick={handleSave} className="save-btn">
                <FiSave /> Save
              </button>
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="summary-content">
          {!summary && !loading && !error && (
            <p className="empty-summary">
              No summary yet. Click "Generate Summary" to create one using AI.
            </p>
          )}
          {loading && (
            <div className="loading-summary">
              <FiRefreshCw className="spinning" />
              <p>Generating summary... This may take a few moments.</p>
            </div>
          )}
          {summary && !isEditing && (
            <div className="summary-display">
              {summary.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}
          {summary && isEditing && (
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="summary-editor"
              rows={15}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
