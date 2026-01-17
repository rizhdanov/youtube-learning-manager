from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import json
import os
import base64

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Create API instance
ytt_api = YouTubeTranscriptApi()

# Data directory paths (stored in backend/data folder)
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
VIDEOS_FILE = os.path.join(DATA_DIR, 'videos.json')
CATEGORIES_FILE = os.path.join(DATA_DIR, 'categories.json')
SKETCHNOTES_DIR = os.path.join(DATA_DIR, 'sketchnotes')

# Ensure data directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SKETCHNOTES_DIR, exist_ok=True)

# Default settings
DEFAULT_SETTINGS = {
    'youtubeClientId': '',
    'youtubeClientSecret': '',
    'customPlaylistId': '',
    'openaiApiKey': '',
    'imageModel': 'gpt-image-1',
    'categorizationPrompt': 'Analyze the list of YouTube videos (titles and channel names) and create exactly 6 distinct categories that best organize these videos. Categories should be broad enough to group multiple videos but specific enough to be meaningful. Return only the category names, one per line.',
    'lastSync': None,
}


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Load settings from file"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                merged = {**DEFAULT_SETTINGS, **settings}
                return jsonify({'success': True, 'settings': merged})
        else:
            return jsonify({'success': True, 'settings': DEFAULT_SETTINGS})
    except Exception as e:
        print(f"Error loading settings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/settings', methods=['POST'])
def save_settings():
    """Save settings to file"""
    try:
        settings = request.get_json()
        if not settings:
            return jsonify({'success': False, 'error': 'No settings provided'}), 400

        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)

        return jsonify({'success': True, 'message': 'Settings saved successfully'})
    except Exception as e:
        print(f"Error saving settings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/videos', methods=['GET'])
def get_videos():
    """Load videos from file"""
    try:
        if os.path.exists(VIDEOS_FILE):
            with open(VIDEOS_FILE, 'r', encoding='utf-8') as f:
                videos = json.load(f)
                return jsonify({'success': True, 'videos': videos})
        else:
            return jsonify({'success': True, 'videos': []})
    except Exception as e:
        print(f"Error loading videos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/videos', methods=['POST'])
def save_videos():
    """Save videos to file"""
    try:
        videos = request.get_json()
        if videos is None:
            return jsonify({'success': False, 'error': 'No videos provided'}), 400

        with open(VIDEOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(videos, f, indent=2, ensure_ascii=False)

        return jsonify({'success': True, 'message': 'Videos saved successfully'})
    except Exception as e:
        print(f"Error saving videos: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Load categories from file"""
    try:
        if os.path.exists(CATEGORIES_FILE):
            with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
                categories = json.load(f)
                return jsonify({'success': True, 'categories': categories})
        else:
            return jsonify({'success': True, 'categories': []})
    except Exception as e:
        print(f"Error loading categories: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/categories', methods=['POST'])
def save_categories():
    """Save categories to file"""
    try:
        categories = request.get_json()
        if categories is None:
            return jsonify({'success': False, 'error': 'No categories provided'}), 400

        with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
            json.dump(categories, f, indent=2, ensure_ascii=False)

        return jsonify({'success': True, 'message': 'Categories saved successfully'})
    except Exception as e:
        print(f"Error saving categories: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/sketchnote/<video_id>', methods=['GET'])
def get_sketchnote(video_id):
    """Get sketchnote image for a video"""
    try:
        image_path = os.path.join(SKETCHNOTES_DIR, f"{video_id}.png")
        if os.path.exists(image_path):
            return send_file(image_path, mimetype='image/png')
        else:
            return jsonify({'success': False, 'error': 'Sketchnote not found'}), 404
    except Exception as e:
        print(f"Error loading sketchnote: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/sketchnote/<video_id>', methods=['POST'])
def save_sketchnote(video_id):
    """Save sketchnote image for a video (accepts base64 data)"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'No image data provided'}), 400

        image_data = data['image']

        # Handle data URL format (data:image/png;base64,...)
        if image_data.startswith('data:'):
            # Extract base64 part
            image_data = image_data.split(',', 1)[1]

        # Decode base64 and save as PNG
        image_bytes = base64.b64decode(image_data)
        image_path = os.path.join(SKETCHNOTES_DIR, f"{video_id}.png")

        with open(image_path, 'wb') as f:
            f.write(image_bytes)

        return jsonify({'success': True, 'message': 'Sketchnote saved successfully', 'path': image_path})
    except Exception as e:
        print(f"Error saving sketchnote: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/transcript/<video_id>', methods=['GET'])
def get_transcript(video_id):
    """Fetch transcript for a YouTube video"""
    try:
        # Fetch transcript using the new API (requires instance)
        transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB', 'ru', 'de', 'fr', 'es'])

        # Combine all text segments into a single string
        full_text = ' '.join([entry.text for entry in transcript])

        return jsonify({
            'success': True,
            'video_id': video_id,
            'transcript': full_text
        })

    except Exception as e:
        error_message = str(e)
        print(f"Error fetching transcript for {video_id}: {error_message}")

        # Try without language preference (get any available)
        try:
            transcript_list = ytt_api.list(video_id)
            # Get the first available transcript
            transcript = transcript_list[0].fetch()
            full_text = ' '.join([entry.text for entry in transcript])

            return jsonify({
                'success': True,
                'video_id': video_id,
                'transcript': full_text
            })
        except Exception as e2:
            return jsonify({
                'success': False,
                'error': str(e2)
            }), 404


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Transcript API is running'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"Starting Transcript API server on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
