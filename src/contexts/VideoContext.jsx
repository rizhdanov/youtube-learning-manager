import { createContext, useContext, useState, useEffect } from 'react';
import storageService from '../services/storageService';
import youtubeService from '../services/youtubeService';
import openaiService from '../services/openaiService';
import authService from '../services/authService';

const VideoContext = createContext();

export const useVideos = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideos must be used within a VideoProvider');
  }
  return context;
};

export const VideoProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    youtubeClientId: '',
    youtubeClientSecret: '',
    customPlaylistId: '',
    openaiApiKey: '',
    imageModel: 'gpt-image-1',
    categorizationPrompt: 'Analyze the list of YouTube videos (titles and channel names) and create exactly 6 distinct categories that best organize these videos. Categories should be broad enough to group multiple videos but specific enough to be meaningful. Return only the category names, one per line.',
    lastSync: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Load all data from backend files on startup
    const initializeApp = async () => {
      console.log('=== Initializing app, loading data from files ===');
      let dataLoaded = false;

      try {
        // Load settings from file (this has the API keys)
        const fileSettings = await storageService.loadSettingsFromFile();
        if (fileSettings) {
          console.log('Settings loaded from file');
          setSettings(fileSettings);
          if (fileSettings.youtubeClientId && fileSettings.youtubeClientSecret) {
            authService.setCredentials(fileSettings.youtubeClientId, fileSettings.youtubeClientSecret);
          }
          if (fileSettings.openaiApiKey) {
            openaiService.setApiKey(fileSettings.openaiApiKey);
          }
        }

        // Load videos from file
        const fileVideos = await storageService.loadVideosFromFile();
        if (fileVideos && fileVideos.length > 0) {
          console.log('Videos loaded from file:', fileVideos.length);
          // Update sketchnote URLs for videos that have files stored
          const videosWithUpdatedUrls = fileVideos.map(video => {
            if (video.hasSketchnoteFile) {
              return {
                ...video,
                sketchnote: storageService.getSketchnoteUrl(video.id)
              };
            }
            return video;
          });
          setVideos(videosWithUpdatedUrls);
          dataLoaded = true;
        }

        // Load categories from file
        const fileCategories = await storageService.loadCategoriesFromFile();
        if (fileCategories && fileCategories.length > 0) {
          console.log('Categories loaded from file:', fileCategories.length);
          setCategories(fileCategories);
        }

      } catch (error) {
        console.log('Error loading from files, falling back to localStorage:', error);
      }

      // Only load from localStorage if no file data was found
      if (!dataLoaded) {
        console.log('No file data found, loading from localStorage');
        loadData();
      }

      setInitialized(true);
      console.log('=== App initialization complete ===');
    };
    initializeApp();
  }, []);

  useEffect(() => {
    // Only save after initialization to prevent overwriting file data with empty state
    if (initialized) {
      console.log('Saving videos to file, count:', videos.length);
      storageService.saveVideos(videos);
    }
  }, [videos, initialized]);

  useEffect(() => {
    // Only save after initialization
    if (initialized) {
      console.log('Saving categories to file, count:', categories.length);
      storageService.saveCategories(categories);
    }
  }, [categories, initialized]);

  useEffect(() => {
    // Only save settings after initialization, but always update services
    if (initialized) {
      console.log('Saving settings to file');
      storageService.saveSettings(settings);
    }
    if (settings.youtubeClientId && settings.youtubeClientSecret) {
      authService.setCredentials(settings.youtubeClientId, settings.youtubeClientSecret);
    }
    if (settings.openaiApiKey) {
      openaiService.setApiKey(settings.openaiApiKey);
    }
  }, [settings, initialized]);

  const loadData = () => {
    try {
      const loadedVideos = storageService.loadVideos();
      const loadedCategories = storageService.loadCategories();
      const loadedSettings = storageService.loadSettings();

      setVideos(loadedVideos);
      setCategories(loadedCategories);
      setSettings(loadedSettings);

      if (loadedSettings.youtubeClientId && loadedSettings.youtubeClientSecret) {
        authService.setCredentials(loadedSettings.youtubeClientId, loadedSettings.youtubeClientSecret);
      }
      if (loadedSettings.openaiApiKey) {
        openaiService.setApiKey(loadedSettings.openaiApiKey);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from storage');
    }
  };

  const syncVideos = async (maxResults = 50) => {
    if (!authService.isAuthenticated()) {
      setError('Not signed in with YouTube');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('=== VideoContext: Starting sync ===');
      const customPlaylistId = settings.customPlaylistId || null;
      console.log('VideoContext: Custom playlist ID:', customPlaylistId);

      const fetchedVideos = await youtubeService.fetchAllWatchLaterVideos(maxResults, customPlaylistId);
      console.log('VideoContext: Fetched videos count:', fetchedVideos.length);

      const existingVideosMap = new Map(videos.map(v => [v.id, v]));
      console.log('VideoContext: Existing videos count:', existingVideosMap.size);

      const mergedVideos = fetchedVideos.map(newVideo => {
        const existing = existingVideosMap.get(newVideo.id);
        if (existing) {
          return {
            ...newVideo,
            watchStatus: existing.watchStatus,
            watchProgress: existing.watchProgress,
            category: existing.category,
            rank: existing.rank || 0,
            transcript: existing.transcript || '',
            summary: existing.summary,
            sketchnote: existing.sketchnote || '',
            hasSketchnoteFile: existing.hasSketchnoteFile || false,
            notes: existing.notes || '',
            reviewDate: existing.reviewDate || null,
            keyTakeaways: existing.keyTakeaways,
            lastWatched: existing.lastWatched,
            timeSpent: existing.timeSpent,
          };
        }
        return newVideo;
      });

      console.log('VideoContext: Merged videos count:', mergedVideos.length);
      console.log('VideoContext: Setting videos in state...');
      setVideos(mergedVideos);

      setSettings(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));

      setLoading(false);
      console.log('VideoContext: Sync complete!');
      return true;
    } catch (err) {
      console.error('Error syncing videos:', err);
      setError(err.message || 'Failed to sync videos');
      setLoading(false);
      return false;
    }
  };

  const updateVideo = (videoId, updates) => {
    setVideos(prev =>
      prev.map(video =>
        video.id === videoId ? { ...video, ...updates } : video
      )
    );
  };

  const deleteVideo = (videoId) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
  };

  const addCategory = (category) => {
    const newCategory = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: category.name,
      color: category.color || '#667eea',
      videoCount: 0,
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  };

  const updateCategory = (categoryId, updates) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    );
  };

  const deleteCategory = (categoryId) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setVideos(prev =>
      prev.map(video => ({
        ...video,
        category: video.category.filter(catId => catId !== categoryId),
      }))
    );
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const exportData = () => {
    return storageService.exportToJSON();
  };

  const importData = async (file) => {
    try {
      const result = await storageService.importFromJSON(file);
      loadData();
      return result;
    } catch (err) {
      console.error('Error importing data:', err);
      throw err;
    }
  };

  const getStats = () => {
    const stats = {
      total: videos.length,
      watched: videos.filter(v => v.watchStatus === 'completed').length,
      inProgress: videos.filter(v => v.watchStatus === 'in-progress').length,
      unwatched: videos.filter(v => v.watchStatus === 'unwatched').length,
      withSummaries: videos.filter(v => v.summary).length,
      withTranscripts: videos.filter(v => v.transcript).length,
      withSketchnotes: videos.filter(v => v.sketchnote).length,
      withNotes: videos.filter(v => v.notes).length,
      totalTimeSpent: videos.reduce((sum, v) => sum + (v.timeSpent || 0), 0),
      totalDuration: videos.reduce((sum, v) => sum + (v.duration || 0), 0),
    };

    const categoryStats = categories.map(cat => ({
      ...cat,
      videoCount: videos.filter(v => v.category.includes(cat.id)).length,
      watchedCount: videos.filter(
        v => v.category.includes(cat.id) && v.watchStatus === 'completed'
      ).length,
    }));

    return { ...stats, categories: categoryStats };
  };

  const value = {
    videos,
    categories,
    settings,
    loading,
    error,
    syncVideos,
    updateVideo,
    deleteVideo,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    exportData,
    importData,
    getStats,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};
