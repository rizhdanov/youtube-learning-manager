import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import { FiStar, FiFileText, FiEdit, FiTag, FiLoader, FiImage, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import youtubeService from '../services/youtubeService';
import transcriptService from '../services/transcriptService';
import openaiService from '../services/openaiService';
import storageService from '../services/storageService';
import CategoryPicker from './CategoryPicker';
import './VideoCard.css';

const VideoCard = ({ video, viewMode }) => {
  const { updateVideo, categories, settings } = useVideos();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSketchnote, setLoadingSketchnote] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showSketchnote, setShowSketchnote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState(video.notes || '');
  const [summaryProgress, setSummaryProgress] = useState('');
  const [showModelSelect, setShowModelSelect] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'in-progress':
        return '#ffc107';
      case 'unwatched':
      default:
        return '#6c757d';
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    updateVideo(video.id, {
      watchStatus: newStatus,
      lastWatched: newStatus !== 'unwatched' ? new Date().toISOString() : video.lastWatched,
    });
  };

  const handleRankChange = (rank) => {
    updateVideo(video.id, { rank });
  };

  const handleGenerateTranscript = async () => {
    setLoadingTranscript(true);
    try {
      const transcript = await transcriptService.fetchTranscript(video.id);
      updateVideo(video.id, { transcript });
      setShowTranscript(true);
    } catch (error) {
      alert(`Failed to generate transcript: ${error.message}`);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleSummaryProgress = (type, data) => {
    switch (type) {
      case 'info':
        setSummaryProgress(data.message);
        break;
      case 'chunk':
        setSummaryProgress(`Processing part ${data.current}/${data.total}...`);
        break;
      case 'merging':
        setSummaryProgress('Merging into final document...');
        break;
      default:
        break;
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryProgress('');

    // First, ensure we have a transcript
    if (!video.transcript) {
      setLoadingTranscript(true);
      setSummaryProgress('Fetching transcript...');
      try {
        const transcript = await transcriptService.fetchTranscript(video.id);
        updateVideo(video.id, { transcript });

        // Now generate summary from transcript
        setLoadingSummary(true);
        const summary = await openaiService.summarizeFromTranscript(video.title, transcript, handleSummaryProgress);
        updateVideo(video.id, { summary, transcript });
        setSummaryProgress('');
        setShowSummary(true);
      } catch (error) {
        alert(`Failed to generate transcript/summary: ${error.message}`);
      } finally {
        setLoadingTranscript(false);
        setLoadingSummary(false);
        setSummaryProgress('');
      }
    } else {
      // We already have transcript, just generate summary
      setLoadingSummary(true);
      try {
        const summary = await openaiService.summarizeFromTranscript(video.title, video.transcript, handleSummaryProgress);
        updateVideo(video.id, { summary });
        setSummaryProgress('');
        setShowSummary(true);
      } catch (error) {
        alert(`Failed to generate summary: ${error.message}`);
      } finally {
        setLoadingSummary(false);
        setSummaryProgress('');
      }
    }
  };

  const handleGenerateSketchnote = async (modelName = null) => {
    // First, ensure we have a summary
    if (!video.summary) {
      alert('Please generate a summary first before creating a sketchnote.');
      return;
    }

    setShowModelSelect(false);
    setLoadingSketchnote(true);
    try {
      const selectedModel = modelName || settings.imageModel || 'gpt-image-1';
      const sketchnoteBase64 = await openaiService.generateSketchnote(video.summary, video.title, selectedModel);

      // Save the image to a file on the backend
      await storageService.saveSketchnoteToFile(video.id, sketchnoteBase64);

      // Store the file URL reference (not the base64 data)
      const sketchnoteUrl = storageService.getSketchnoteUrl(video.id);
      updateVideo(video.id, { sketchnote: sketchnoteUrl, hasSketchnoteFile: true });
      setShowSketchnote(true);
    } catch (error) {
      alert(`Failed to generate sketchnote: ${error.message}`);
    } finally {
      setLoadingSketchnote(false);
    }
  };

  const handleSketchnoteClick = () => {
    if (!video.summary) {
      alert('Please generate a summary first before creating a sketchnote.');
      return;
    }
    setShowModelSelect(true);
  };

  const handleSaveNotes = () => {
    updateVideo(video.id, { notes: notesText });
    setShowNotes(false);
  };

  const handleSetReviewDate = () => {
    // Set review date to 3 months from now
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 3);
    updateVideo(video.id, { reviewDate: reviewDate.toISOString().split('T')[0] });
  };

  const handleClearReviewDate = () => {
    updateVideo(video.id, { reviewDate: null });
  };

  const handleReviewDateChange = (e) => {
    updateVideo(video.id, { reviewDate: e.target.value || null });
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDay = new Date(dateStr);
    reviewDay.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((reviewDay - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', class: 'overdue' };
    if (diffDays === 0) return { text: 'Today', class: 'today' };
    if (diffDays <= 7) return { text: `${diffDays}d`, class: 'soon' };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: 'normal' };
  };

  const formattedDuration = youtubeService.formatDuration(video.duration);
  const videoCategories = video.category
    .map(catId => categories.find(c => c.id === catId))
    .filter(Boolean);

  // Render stars for ranking
  const renderStars = () => {
    return (
      <div className="rank-stars">
        {[0, 1, 2, 3, 4, 5].map(starValue => (
          <FiStar
            key={starValue}
            className={`star ${video.rank >= starValue && starValue > 0 ? 'filled' : ''}`}
            onClick={() => handleRankChange(starValue)}
            title={starValue === 0 ? 'No rank' : `Rank ${starValue}`}
          />
        ))}
      </div>
    );
  };

  if (viewMode === 'list') {
    return (
      <>
        <div className="video-card-list">
          <div className="list-cell title-cell">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={video.title}
            >
              {video.title}
            </a>
          </div>

          <div className="list-cell author-cell">
            {video.channelTitle}
          </div>

          <div className="list-cell duration-cell">
            {formattedDuration}
          </div>

          <div className="list-cell category-cell">
            {videoCategories.length > 0 ? (
              <div className="category-tags">
                {videoCategories.map(cat => (
                  <span
                    key={cat.id}
                    className="category-tag-small"
                    style={{ backgroundColor: cat.color }}
                    title={cat.name}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="no-category-small">—</span>
            )}
            <button
              onClick={() => setShowCategoryPicker(true)}
              className="icon-btn"
              title="Edit categories"
            >
              <FiEdit />
            </button>
          </div>

          <div className="list-cell status-cell">
            <select
              value={video.watchStatus}
              onChange={handleStatusChange}
              className="status-select-small"
              style={{ borderColor: getStatusColor(video.watchStatus) }}
            >
              <option value="unwatched">Unwatched</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Watched</option>
            </select>
          </div>

          <div className="list-cell transcript-cell">
            {loadingTranscript ? (
              <FiLoader className="spinning" />
            ) : video.transcript ? (
              <button
                onClick={() => setShowTranscript(true)}
                className="action-btn-small has-content"
                title="View transcript"
              >
                <FiFileText /> View
              </button>
            ) : (
              <button
                onClick={handleGenerateTranscript}
                className="action-btn-small"
                title="Generate transcript"
              >
                <FiFileText /> Generate
              </button>
            )}
          </div>

          <div className="list-cell summary-cell">
            {loadingSummary ? (
              <div className="loading-with-text">
                <FiLoader className="spinning" />
                {summaryProgress && <span className="progress-text" title={summaryProgress}>{summaryProgress.substring(0, 20)}...</span>}
              </div>
            ) : video.summary ? (
              <button
                onClick={() => setShowSummary(true)}
                className="action-btn-small has-content"
                title="View summary"
              >
                <FiFileText /> View
              </button>
            ) : (
              <button
                onClick={handleGenerateSummary}
                className="action-btn-small"
                title="Generate summary"
              >
                <FiFileText /> Generate
              </button>
            )}
          </div>

          <div className="list-cell sketchnote-cell">
            {loadingSketchnote ? (
              <FiLoader className="spinning" />
            ) : video.sketchnote ? (
              <button
                onClick={() => setShowSketchnote(true)}
                className="action-btn-small has-content"
                title="View sketchnote"
              >
                <FiImage /> View
              </button>
            ) : (
              <div className="sketchnote-btn-container">
                <button
                  onClick={handleSketchnoteClick}
                  className="action-btn-small"
                  title="Generate sketchnote"
                  disabled={!video.summary}
                >
                  <FiImage /> Generate
                </button>
                {showModelSelect && (
                  <div className="model-select-dropdown">
                    <button onClick={() => handleGenerateSketchnote('gpt-image-1.5')} className="model-option">
                      GPT Image 1.5 (Best Quality)
                    </button>
                    <button onClick={() => handleGenerateSketchnote('gpt-image-1')} className="model-option">
                      GPT Image 1 (Standard)
                    </button>
                    <button onClick={() => handleGenerateSketchnote('gpt-image-1-mini')} className="model-option">
                      GPT Image 1 Mini (Faster)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="list-cell notes-cell">
            <button
              onClick={() => {
                setNotesText(video.notes || '');
                setShowNotes(true);
              }}
              className={`action-btn-small ${video.notes ? 'has-content' : ''}`}
              title={video.notes ? 'View/edit notes' : 'Add notes'}
            >
              <FiMessageSquare /> {video.notes ? 'View' : 'Add'}
            </button>
          </div>

          <div className="list-cell review-cell">
            {video.reviewDate ? (
              <div className="review-date-display">
                <span className={`review-badge ${formatReviewDate(video.reviewDate)?.class}`}>
                  {formatReviewDate(video.reviewDate)?.text}
                </span>
                <input
                  type="date"
                  value={video.reviewDate}
                  onChange={handleReviewDateChange}
                  className="review-date-input"
                  title="Change review date"
                />
                <button
                  onClick={handleClearReviewDate}
                  className="clear-review-btn"
                  title="Clear review date"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={handleSetReviewDate}
                className="action-btn-small"
                title="Set review in 3 months"
              >
                <FiCalendar /> Review
              </button>
            )}
          </div>

          <div className="list-cell rank-cell">
            {renderStars()}
          </div>
        </div>

        {showCategoryPicker && (
          <CategoryPicker
            video={video}
            onClose={() => setShowCategoryPicker(false)}
          />
        )}

        {showTranscript && (
          <div className="modal-overlay" onClick={() => setShowTranscript(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Transcript: {video.title}</h3>
                <button onClick={() => setShowTranscript(false)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <pre className="transcript-text">{video.transcript}</pre>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => {
                    setShowTranscript(false);
                    handleGenerateTranscript();
                  }}
                  className="regenerate-btn"
                  disabled={loadingTranscript}
                >
                  {loadingTranscript ? <FiLoader className="spinning" /> : <FiFileText />}
                  Regenerate Transcript
                </button>
              </div>
            </div>
          </div>
        )}

        {showSummary && (
          <div className="modal-overlay" onClick={() => setShowSummary(false)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Summary: {video.title}</h3>
                <button onClick={() => setShowSummary(false)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <div className="summary-text markdown-content">
                  <ReactMarkdown>{video.summary}</ReactMarkdown>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => {
                    setShowSummary(false);
                    handleGenerateSummary();
                  }}
                  className="regenerate-btn"
                  disabled={loadingSummary}
                >
                  {loadingSummary ? <FiLoader className="spinning" /> : <FiFileText />}
                  Regenerate Summary
                </button>
              </div>
            </div>
          </div>
        )}

        {showSketchnote && (
          <div className="modal-overlay" onClick={() => setShowSketchnote(false)}>
            <div className="modal-content modal-sketchnote" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Sketchnote: {video.title}</h3>
                <button onClick={() => setShowSketchnote(false)} className="close-btn">×</button>
              </div>
              <div className="modal-body sketchnote-body">
                <img
                  src={video.sketchnote}
                  alt={`Sketchnote for ${video.title}`}
                  className="sketchnote-image"
                />
              </div>
              <div className="modal-footer">
                <a
                  href={video.sketchnote}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sketchnote-download"
                >
                  Open in new tab
                </a>
                <div className="regenerate-sketchnote-container">
                  <button
                    onClick={() => setShowModelSelect(true)}
                    className="regenerate-btn"
                    disabled={loadingSketchnote}
                  >
                    {loadingSketchnote ? <FiLoader className="spinning" /> : <FiImage />}
                    Regenerate Sketchnote
                  </button>
                  {showModelSelect && (
                    <div className="model-select-dropdown modal-dropdown">
                      <button onClick={() => { setShowSketchnote(false); handleGenerateSketchnote('gpt-image-1.5'); }} className="model-option">
                        GPT Image 1.5 (Best Quality)
                      </button>
                      <button onClick={() => { setShowSketchnote(false); handleGenerateSketchnote('gpt-image-1'); }} className="model-option">
                        GPT Image 1 (Standard)
                      </button>
                      <button onClick={() => { setShowSketchnote(false); handleGenerateSketchnote('gpt-image-1-mini'); }} className="model-option">
                        GPT Image 1 Mini (Faster)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showNotes && (
          <div className="modal-overlay" onClick={() => setShowNotes(false)}>
            <div className="modal-content modal-notes" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Notes: {video.title}</h3>
                <button onClick={() => setShowNotes(false)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <textarea
                  className="notes-textarea"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Add your personal notes here..."
                  rows={10}
                />
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowNotes(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleSaveNotes} className="save-btn">
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Grid view (kept for compatibility but simplified)
  return (
    <div className="video-card grid">
      <div className="video-thumbnail-container">
        <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
        <div className="video-duration">{formattedDuration}</div>
      </div>
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <p className="video-channel">{video.channelTitle}</p>
        {renderStars()}
      </div>
    </div>
  );
};

export default VideoCard;
