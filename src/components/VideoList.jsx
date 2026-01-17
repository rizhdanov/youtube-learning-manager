import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import VideoCard from './VideoCard';
import { FiGrid, FiList, FiFilter } from 'react-icons/fi';
import './VideoList.css';

const VideoList = () => {
  const { videos, categories } = useVideos();
  const [viewMode, setViewMode] = useState('list');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRank, setFilterRank] = useState('all');
  const [sortBy, setSortBy] = useState('addedAt');

  console.log('VideoList: videos from context:', videos.length);

  const filteredVideos = videos.filter(video => {
    // Filter by status
    if (filterStatus !== 'all' && video.watchStatus !== filterStatus) {
      return false;
    }

    // Filter by category
    if (filterCategory !== 'all') {
      if (!video.category || !video.category.includes(filterCategory)) {
        return false;
      }
    }

    // Filter by rank
    if (filterRank !== 'all') {
      if (filterRank === '0' && video.rank !== 0) return false;
      if (filterRank === '1-2' && (video.rank < 1 || video.rank > 2)) return false;
      if (filterRank === '3-4' && (video.rank < 3 || video.rank > 4)) return false;
      if (filterRank === '5' && video.rank !== 5) return false;
    }

    return true;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case 'addedAt':
        return new Date(b.addedAt) - new Date(a.addedAt);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'duration':
        return b.duration - a.duration;
      case 'rank':
        return b.rank - a.rank;
      default:
        return 0;
    }
  });

  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <p>No videos yet. Sync your Watch Later videos to get started!</p>
      </div>
    );
  }

  return (
    <div className="video-list-container">
      <div className="video-list-header">
        <div className="video-count">
          {sortedVideos.length} {sortedVideos.length === 1 ? 'video' : 'videos'}
        </div>

        <div className="video-list-controls">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select compact"
            title="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="unwatched">Unwatched</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select compact"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className="filter-select compact"
            title="Filter by rank"
          >
            <option value="all">All Ranks</option>
            <option value="5">★★★★★ (5)</option>
            <option value="3-4">★★★★ (3-4)</option>
            <option value="1-2">★★ (1-2)</option>
            <option value="0">☆ (0)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select compact"
            title="Sort by"
          >
            <option value="addedAt">Sort: Date Added</option>
            <option value="title">Sort: Title</option>
            <option value="duration">Sort: Duration</option>
            <option value="rank">Sort: Rank</option>
          </select>

          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FiGrid />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FiList />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' && sortedVideos.length > 0 && (
        <div className="list-header-row">
          <div className="list-cell title-cell">Title</div>
          <div className="list-cell author-cell">Author</div>
          <div className="list-cell duration-cell">Duration</div>
          <div className="list-cell category-cell">Category</div>
          <div className="list-cell status-cell">Status</div>
          <div className="list-cell transcript-cell">Transcript</div>
          <div className="list-cell summary-cell">Summary</div>
          <div className="list-cell sketchnote-cell">Sketchnote</div>
          <div className="list-cell notes-cell">Notes</div>
          <div className="list-cell review-cell">Review</div>
          <div className="list-cell rank-cell">Rank</div>
        </div>
      )}

      <div className={`video-${viewMode}`}>
        {sortedVideos.map(video => (
          <VideoCard key={video.id} video={video} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
};

export default VideoList;
