import { useVideos } from '../contexts/VideoContext';
import { FiVideo, FiCheck, FiClock, FiFileText, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import youtubeService from '../services/youtubeService';
import './Dashboard.css';

const Dashboard = () => {
  const { videos, categories, getStats } = useVideos();
  const stats = getStats();

  const totalDurationHours = Math.round(stats.totalDuration / 3600 * 10) / 10;
  const totalTimeSpentHours = Math.round(stats.totalTimeSpent / 60 * 10) / 10;
  const completionRate = stats.total > 0 ? Math.round((stats.watched / stats.total) * 100) : 0;

  const recentVideos = [...videos]
    .filter(v => v.lastWatched)
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, 5);

  const categoryData = stats.categories
    .filter(cat => cat.videoCount > 0)
    .sort((a, b) => b.videoCount - a.videoCount);

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return '#28a745';
    if (percentage >= 50) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="dashboard-container">
      <h2>Learning Dashboard</h2>
      <p className="dashboard-subtitle">Track your learning progress and insights</p>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#667eea' }}>
            <FiVideo />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Videos</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#28a745' }}>
            <FiCheck />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.watched}</div>
            <div className="stat-label">Watched</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffc107' }}>
            <FiClock />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#17a2b8' }}>
            <FiFileText />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.withSummaries}</div>
            <div className="stat-label">With Summaries</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3><FiTrendingUp /> Progress Overview</h3>
          <div className="progress-section">
            <div className="progress-item">
              <div className="progress-header">
                <span>Completion Rate</span>
                <span className="progress-value">{completionRate}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${completionRate}%`,
                    background: getProgressColor(completionRate),
                  }}
                />
              </div>
            </div>

            <div className="progress-details">
              <div className="detail-item">
                <span className="detail-label">Total Content Duration</span>
                <span className="detail-value">{totalDurationHours} hours</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Time Spent Learning</span>
                <span className="detail-value">{totalTimeSpentHours} hours</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Videos with Notes</span>
                <span className="detail-value">{stats.withNotes}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Average per Video</span>
                <span className="detail-value">
                  {stats.total > 0
                    ? youtubeService.formatDuration(Math.round(stats.totalDuration / stats.total))
                    : '0:00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3><FiPieChart /> Categories Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="category-breakdown">
              {categoryData.map(cat => {
                const percentage = stats.total > 0
                  ? Math.round((cat.videoCount / stats.total) * 100)
                  : 0;
                const watchedPercentage = cat.videoCount > 0
                  ? Math.round((cat.watchedCount / cat.videoCount) * 100)
                  : 0;

                return (
                  <div key={cat.id} className="category-stat-item">
                    <div className="category-stat-header">
                      <div className="category-name-box">
                        <span
                          className="category-color-dot"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="category-name">{cat.name}</span>
                      </div>
                      <span className="category-stat-value">
                        {cat.videoCount} videos ({percentage}%)
                      </span>
                    </div>
                    <div className="category-progress-bar">
                      <div
                        className="category-progress-fill"
                        style={{
                          width: `${watchedPercentage}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                    <div className="category-stat-footer">
                      {cat.watchedCount} of {cat.videoCount} watched
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">
              No categories yet. Create categories to organize your videos!
            </p>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <h3><FiClock /> Recent Activity</h3>
        {recentVideos.length > 0 ? (
          <div className="recent-activity">
            {recentVideos.map(video => (
              <div key={video.id} className="activity-item">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="activity-thumbnail"
                />
                <div className="activity-info">
                  <div className="activity-title">{video.title}</div>
                  <div className="activity-meta">
                    <span>{video.channelTitle}</span>
                    <span className="activity-separator">•</span>
                    <span>
                      {new Date(video.lastWatched).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className={`activity-status status-${video.watchStatus}`}>
                  {video.watchStatus === 'completed' ? 'Watched' :
                   video.watchStatus === 'in-progress' ? 'In Progress' : 'Unwatched'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No activity yet. Start watching videos to see your progress!
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
