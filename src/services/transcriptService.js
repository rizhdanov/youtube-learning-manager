import axios from 'axios';

// Use environment variable for backend URL, fallback to localhost for development
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const TRANSCRIPT_API_URL = `${BACKEND_URL}/api`;

class TranscriptService {
  /**
   * Fetch transcript for a YouTube video using Python backend
   */
  async fetchTranscript(videoId) {
    try {
      console.log('Fetching transcript for video:', videoId);

      const response = await axios.get(`${TRANSCRIPT_API_URL}/transcript/${videoId}`);

      if (response.data.success) {
        console.log('Transcript fetched successfully');
        console.log('Language:', response.data.language);
        console.log('Is auto-generated:', response.data.is_generated);
        console.log('Transcript length:', response.data.transcript.length);

        return response.data.transcript;
      } else {
        throw new Error(response.data.error || 'Failed to fetch transcript');
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);

      if (error.response) {
        // Server responded with error
        const errorMessage = error.response.data?.error || 'Failed to fetch transcript';
        throw new Error(errorMessage);
      } else if (error.code === 'ERR_NETWORK') {
        throw new Error('Transcript server is not running. Please start the Python backend server.');
      }

      throw error;
    }
  }

  /**
   * Check if the transcript server is running
   */
  async checkServerHealth() {
    try {
      const response = await axios.get(`${TRANSCRIPT_API_URL}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Format transcript into readable paragraphs
   */
  formatTranscript(transcript, wordsPerParagraph = 100) {
    const words = transcript.split(' ');
    const paragraphs = [];

    for (let i = 0; i < words.length; i += wordsPerParagraph) {
      paragraphs.push(words.slice(i, i + wordsPerParagraph).join(' '));
    }

    return paragraphs.join('\n\n');
  }
}

export default new TranscriptService();
