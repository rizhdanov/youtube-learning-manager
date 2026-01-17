import axios from 'axios';
import authService from './authService';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

class YouTubeService {
  constructor() {
    this.authService = authService;
  }

  // Alternative approach: Get videos from user's playlists
  async getUserPlaylists() {
    try {
      const accessToken = await this.authService.getValidAccessToken();
      console.log('Fetching user playlists...');

      const response = await axios.get(`${YOUTUBE_API_BASE_URL}/playlists`, {
        params: {
          part: 'snippet,contentDetails',
          mine: true,
          maxResults: 50,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('User playlists:', response.data);
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw error;
    }
  }

  async fetchWatchLaterPlaylist() {
    try {
      const accessToken = await this.authService.getValidAccessToken();
      console.log('Fetching Watch Later playlist ID...');

      // First, try to get the user's channel info
      const response = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
        params: {
          part: 'contentDetails,id',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Full channel response:', response.data);

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        console.log('Channel ID:', channel.id);
        console.log('Related playlists:', channel.contentDetails?.relatedPlaylists);

        // Try to get Watch Later from related playlists
        const watchLaterFromAPI = channel.contentDetails?.relatedPlaylists?.watchLater;

        if (watchLaterFromAPI) {
          console.log('✅ Found Watch Later playlist ID from API:', watchLaterFromAPI);
          return watchLaterFromAPI;
        }

        // If not found in API, construct the user-specific WL ID
        // Format: WL + channel ID (without "UC" prefix if present)
        const channelId = channel.id;
        let watchLaterId;

        if (channelId.startsWith('UC')) {
          // Replace UC with WL
          watchLaterId = 'WL' + channelId.substring(2);
        } else {
          watchLaterId = 'WL' + channelId;
        }

        console.log('✅ Constructed Watch Later ID:', watchLaterId);
        return watchLaterId;
      }

      throw new Error('No channel data found. Make sure you granted YouTube access.');
    } catch (error) {
      console.error('Error fetching Watch Later playlist:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      throw error;
    }
  }

  async fetchPlaylistVideos(playlistId, maxResults = 50) {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    try {
      const accessToken = await this.authService.getValidAccessToken();
      console.log('Fetching videos from playlist:', playlistId);

      let allVideos = [];
      let nextPageToken = null;

      do {
        const params = {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: Math.min(maxResults - allVideos.length, 50),
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        console.log('Fetching page with params:', params);

        const response = await axios.get(`${YOUTUBE_API_BASE_URL}/playlistItems`, {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        console.log('Full API response:', response.data);
        console.log(`Fetched ${response.data.items?.length || 0} videos`);

        // Check if there's an error in the response
        if (response.data.error) {
          console.error('API returned error:', response.data.error);
          throw new Error(response.data.error.message);
        }

        // Check if playlist is empty vs not accessible
        if (!response.data.items || response.data.items.length === 0) {
          if (response.data.pageInfo) {
            console.log('Page info:', response.data.pageInfo);
            console.log('Total results:', response.data.pageInfo.totalResults);

            if (response.data.pageInfo.totalResults === 0) {
              console.warn('⚠️ Watch Later playlist is showing 0 videos. This might be due to YouTube API limitations.');
              console.warn('⚠️ Watch Later playlists are private and may not be accessible via OAuth API.');
            }
          }
        }

        if (response.data.items) {
          allVideos = [...allVideos, ...response.data.items];
        }

        nextPageToken = response.data.nextPageToken;

        if (allVideos.length >= maxResults) {
          break;
        }
      } while (nextPageToken);

      console.log(`Total videos fetched: ${allVideos.length}`);
      return allVideos;
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      throw error;
    }
  }

  async getVideoDetails(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return [];
    }

    try {
      const accessToken = await this.authService.getValidAccessToken();

      const batchSize = 50;
      const batches = [];

      for (let i = 0; i < videoIds.length; i += batchSize) {
        batches.push(videoIds.slice(i, i + batchSize));
      }

      const results = await Promise.all(
        batches.map(async (batch) => {
          const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
            params: {
              part: 'snippet,contentDetails,statistics',
              id: batch.join(','),
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          return response.data.items || [];
        })
      );

      return results.flat();
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  }

  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  extractPlaylistId(input) {
    if (!input) return null;

    // If it's already a playlist ID (starts with PL or is WL)
    if (input.startsWith('PL') || input === 'WL' || input.startsWith('WL')) {
      return input;
    }

    // If it's a URL, extract the playlist ID
    try {
      const url = new URL(input);
      const listParam = url.searchParams.get('list');
      if (listParam) {
        return listParam;
      }
    } catch (e) {
      // Not a valid URL, might be just an ID
    }

    return input; // Return as-is if we can't determine
  }

  async fetchAllWatchLaterVideos(maxResults = 50, customPlaylistId = null) {
    try {
      console.log('=== Starting fetchAllWatchLaterVideos ===');

      let playlistId;

      // If custom playlist ID is provided, use it
      if (customPlaylistId) {
        playlistId = this.extractPlaylistId(customPlaylistId);
        console.log('✅ Using custom playlist ID:', playlistId);
      } else {
        // Otherwise, try to get Watch Later
        console.log('🔍 Checking user playlists to see if Watch Later is accessible...');
        const playlists = await this.getUserPlaylists();
        const watchLaterInPlaylists = playlists.find(p =>
          p.snippet?.title?.toLowerCase().includes('watch later') ||
          p.id === 'WL'
        );

        if (watchLaterInPlaylists) {
          console.log('✅ Found Watch Later in user playlists!', watchLaterInPlaylists.id);
        } else {
          console.warn('⚠️ Watch Later not found in accessible playlists');
        }

        playlistId = await this.fetchWatchLaterPlaylist();
        console.log('Got Watch Later playlist ID:', playlistId);
      }

      const playlistItems = await this.fetchPlaylistVideos(playlistId, maxResults);
      console.log('Playlist items fetched:', playlistItems.length);

      if (playlistItems.length === 0) {
        if (customPlaylistId) {
          console.error('❌ No videos fetched from custom playlist:', playlistId);
          throw new Error(`Custom playlist "${playlistId}" is empty or not accessible. Please check that the playlist exists and is set to public or unlisted.`);
        } else {
          console.error('❌ No videos fetched from Watch Later playlist');
          console.error('This is likely due to YouTube API limitations - Watch Later is a private playlist that may not be accessible via OAuth');
          console.log('\n💡 WORKAROUND: Create a custom YouTube playlist (public or unlisted) and enter its URL in Settings > Playlist Configuration');
          throw new Error('Watch Later playlist is not accessible via API. Please create a custom public or unlisted playlist and enter its URL in Settings.');
        }
      }

      const videoIds = playlistItems
        .map(item => item.snippet?.resourceId?.videoId)
        .filter(Boolean);

      console.log('Video IDs extracted:', videoIds.length);

      if (videoIds.length === 0) {
        console.warn('No video IDs found in playlist items');
        return [];
      }

      console.log('Fetching video details for', videoIds.length, 'videos...');
      const videoDetails = await this.getVideoDetails(videoIds);
      console.log('Video details fetched:', videoDetails.length);

      const videos = videoDetails.map((video, index) => {
        const playlistItem = playlistItems.find(
          item => item.snippet?.resourceId?.videoId === video.id
        );

        return {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail: video.snippet.thumbnails?.high?.url ||
                     video.snippet.thumbnails?.medium?.url ||
                     video.snippet.thumbnails?.default?.url,
          duration: this.parseDuration(video.contentDetails.duration),
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          addedAt: playlistItem?.snippet?.publishedAt || new Date().toISOString(),
          watchStatus: 'unwatched',
          watchProgress: 0,
          category: [],
          rank: 0,
          transcript: '',
          summary: '',
          notes: '',
          keyTakeaways: [],
          lastWatched: null,
          timeSpent: 0,
        };
      });

      console.log('Processed videos:', videos.length);
      console.log('First video sample:', videos[0]);
      console.log('=== fetchAllWatchLaterVideos complete ===');

      return videos;
    } catch (error) {
      console.error('Error fetching all watch later videos:', error);
      throw error;
    }
  }
}

export default new YouTubeService();
