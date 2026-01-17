const STORAGE_KEYS = {
  VIDEOS: 'youtube_learning_videos',
  CATEGORIES: 'youtube_learning_categories',
  SETTINGS: 'youtube_learning_settings',
};

// Use environment variable for backend URL, fallback to localhost for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class StorageService {
  constructor() {
    this.settingsLoaded = false;
  }
  saveVideos(videos) {
    try {
      // Save to localStorage for quick access
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      // Also save to backend file
      this.saveVideosToFile(videos);
      return true;
    } catch (error) {
      console.error('Error saving videos to localStorage:', error);
      return false;
    }
  }

  async saveVideosToFile(videos) {
    try {
      console.log('Attempting to save videos to backend, count:', videos.length);
      const response = await fetch(`${BACKEND_URL}/api/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videos),
      });
      const result = await response.json();
      if (result.success) {
        console.log('Videos saved to file successfully');
      } else {
        console.error('Backend returned error:', result.error);
      }
    } catch (error) {
      console.error('Error saving videos to file:', error);
    }
  }

  async loadVideosFromFile() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/videos`);
      const result = await response.json();
      if (result.success && result.videos) {
        console.log('Videos loaded from file successfully:', result.videos.length);
        localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(result.videos));
        return result.videos;
      }
    } catch (error) {
      console.error('Error loading videos from file:', error);
    }
    return null;
  }

  loadVideos() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VIDEOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading videos from localStorage:', error);
      return [];
    }
  }

  saveCategories(categories) {
    try {
      // Save to localStorage for quick access
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      // Also save to backend file
      this.saveCategoriesToFile(categories);
      return true;
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
      return false;
    }
  }

  async saveCategoriesToFile(categories) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categories),
      });
      const result = await response.json();
      if (result.success) {
        console.log('Categories saved to file successfully');
      }
    } catch (error) {
      console.error('Error saving categories to file:', error);
    }
  }

  async loadCategoriesFromFile() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`);
      const result = await response.json();
      if (result.success && result.categories) {
        console.log('Categories loaded from file successfully:', result.categories.length);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(result.categories));
        return result.categories;
      }
    } catch (error) {
      console.error('Error loading categories from file:', error);
    }
    return null;
  }

  loadCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading categories from localStorage:', error);
      return [];
    }
  }

  // Save sketchnote image to backend file
  async saveSketchnoteToFile(videoId, imageData) {
    try {
      console.log('Attempting to save sketchnote for video:', videoId);
      console.log('Image data length:', imageData ? imageData.length : 0);
      const response = await fetch(`${BACKEND_URL}/api/sketchnote/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      const result = await response.json();
      if (result.success) {
        console.log('Sketchnote saved to file successfully:', result.path);
        return true;
      } else {
        console.error('Backend returned error saving sketchnote:', result.error);
      }
    } catch (error) {
      console.error('Error saving sketchnote to file:', error);
    }
    return false;
  }

  // Get sketchnote URL from backend
  getSketchnoteUrl(videoId) {
    return `${BACKEND_URL}/api/sketchnote/${videoId}`;
  }

  saveSettings(settings) {
    try {
      // Save to localStorage for quick access
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

      // Also save to backend file for persistence
      this.saveSettingsToFile(settings);

      return true;
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      return false;
    }
  }

  async saveSettingsToFile(settings) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (result.success) {
        console.log('Settings saved to file successfully');
      } else {
        console.error('Failed to save settings to file:', result.error);
      }
    } catch (error) {
      console.error('Error saving settings to file:', error);
    }
  }

  async loadSettingsFromFile() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      const result = await response.json();
      if (result.success && result.settings) {
        console.log('Settings loaded from file successfully');
        // Also update localStorage
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(result.settings));
        return result.settings;
      }
    } catch (error) {
      console.error('Error loading settings from file:', error);
    }
    return null;
  }

  loadSettings() {
    // Return from localStorage (sync method)
    // The async file loading is done separately at startup
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        youtubeClientId: '',
        youtubeClientSecret: '',
        customPlaylistId: '',
        openaiApiKey: '',
        imageModel: 'gpt-image-1',
        categorizationPrompt: 'Analyze the list of YouTube videos (titles and channel names) and create exactly 6 distinct categories that best organize these videos. Categories should be broad enough to group multiple videos but specific enough to be meaningful. Return only the category names, one per line.',
        lastSync: null,
      };
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      return {
        youtubeClientId: '',
        youtubeClientSecret: '',
        customPlaylistId: '',
        openaiApiKey: '',
        imageModel: 'gpt-image-1',
        categorizationPrompt: 'Analyze the list of YouTube videos (titles and channel names) and create exactly 6 distinct categories that best organize these videos. Categories should be broad enough to group multiple videos but specific enough to be meaningful. Return only the category names, one per line.',
        lastSync: null,
      };
    }
  }

  exportToJSON(includeApiKeys = false) {
    try {
      const currentSettings = this.loadSettings();
      const data = {
        videos: this.loadVideos(),
        categories: this.loadCategories(),
        settings: includeApiKeys ? currentSettings : {
          ...currentSettings,
          youtubeClientId: '',
          youtubeClientSecret: '',
          openaiApiKey: '',
        },
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = includeApiKeys ? '-full' : '';
      link.download = `youtube-learning-backup${suffix}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting data to JSON:', error);
      return false;
    }
  }

  async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.videos) {
            this.saveVideos(data.videos);
          }

          if (data.categories) {
            this.saveCategories(data.categories);
          }

          if (data.settings) {
            const currentSettings = this.loadSettings();
            // Import API keys if they exist in backup, otherwise keep current
            this.saveSettings({
              ...data.settings,
              youtubeClientId: data.settings.youtubeClientId || currentSettings.youtubeClientId,
              youtubeClientSecret: data.settings.youtubeClientSecret || currentSettings.youtubeClientSecret,
              openaiApiKey: data.settings.openaiApiKey || currentSettings.openaiApiKey,
              customPlaylistId: data.settings.customPlaylistId || currentSettings.customPlaylistId,
            });
          }

          resolve({
            success: true,
            videosCount: data.videos?.length || 0,
            categoriesCount: data.categories?.length || 0,
            hasApiKeys: !!(data.settings?.openaiApiKey || data.settings?.youtubeClientId),
          });
        } catch (error) {
          console.error('Error parsing imported JSON:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.VIDEOS);
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  getStorageStats() {
    try {
      const videos = this.loadVideos();
      const categories = this.loadCategories();
      const settings = this.loadSettings();

      return {
        totalVideos: videos.length,
        watchedVideos: videos.filter(v => v.watchStatus === 'completed').length,
        inProgressVideos: videos.filter(v => v.watchStatus === 'in-progress').length,
        unwatchedVideos: videos.filter(v => v.watchStatus === 'unwatched').length,
        totalCategories: categories.length,
        videosWithSummaries: videos.filter(v => v.summary).length,
        videosWithTranscripts: videos.filter(v => v.transcript).length,
        videosWithNotes: videos.filter(v => v.notes).length,
        hasOpenAiKey: !!settings.openaiApiKey,
        hasYoutubeCredentials: !!(settings.youtubeClientId && settings.youtubeClientSecret),
        hasPlaylistId: !!settings.customPlaylistId,
        lastSync: settings.lastSync,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }
}

export default new StorageService();
