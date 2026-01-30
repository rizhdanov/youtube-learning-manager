from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import json
import os
import base64
import requests
import tempfile
import subprocess
from openai import OpenAI

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Create API instance
ytt_api = YouTubeTranscriptApi()

# YouTube Data API base URL
YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

# Temp directory for audio files
TEMP_DIR = tempfile.gettempdir()

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
    """Fetch transcript for a YouTube video using OAuth token"""
    # Get OAuth token from Authorization header
    auth_header = request.headers.get('Authorization')
    access_token = None

    if auth_header and auth_header.startswith('Bearer '):
        access_token = auth_header.split(' ')[1]

    # Try authenticated method first (YouTube Data API)
    if access_token:
        try:
            transcript = fetch_transcript_with_auth(video_id, access_token)
            if transcript:
                return jsonify({
                    'success': True,
                    'video_id': video_id,
                    'transcript': transcript,
                    'method': 'youtube_api'
                })
        except Exception as e:
            print(f"Authenticated transcript fetch failed: {e}")

    # Fallback to youtube_transcript_api (unauthenticated)
    try:
        transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB', 'ru', 'de', 'fr', 'es'])
        full_text = ' '.join([entry.text for entry in transcript])

        return jsonify({
            'success': True,
            'video_id': video_id,
            'transcript': full_text,
            'method': 'youtube_transcript_api'
        })

    except Exception as e:
        error_message = str(e)
        print(f"Error fetching transcript for {video_id}: {error_message}")

        # Try without language preference (get any available)
        try:
            transcript_list = ytt_api.list(video_id)
            # Iterate to get first available transcript
            transcript = None
            for t in transcript_list:
                transcript = t.fetch()
                break
            if not transcript:
                raise Exception("No transcripts available")
            full_text = ' '.join([entry.text for entry in transcript])

            return jsonify({
                'success': True,
                'video_id': video_id,
                'transcript': full_text,
                'method': 'youtube_transcript_api_fallback'
            })
        except Exception as e2:
            print(f"YouTube transcript fallback also failed: {e2}")

            # Final fallback: Use Whisper to transcribe audio
            try:
                print(f"Attempting Whisper transcription for {video_id}")
                transcript = transcribe_with_whisper(video_id)
                if transcript:
                    return jsonify({
                        'success': True,
                        'video_id': video_id,
                        'transcript': transcript,
                        'method': 'whisper'
                    })
                else:
                    raise Exception("Whisper transcription returned empty result")
            except Exception as e3:
                print(f"Whisper transcription failed: {e3}")
                return jsonify({
                    'success': False,
                    'error': f"All transcript methods failed. Last error: {str(e3)}"
                }), 404


def fetch_transcript_with_auth(video_id, access_token):
    """Fetch transcript using YouTube Data API with OAuth authentication"""
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json'
    }

    # Step 1: Get caption tracks for the video
    captions_url = f"{YOUTUBE_API_BASE}/captions"
    params = {
        'videoId': video_id,
        'part': 'snippet'
    }

    response = requests.get(captions_url, headers=headers, params=params)

    if response.status_code != 200:
        print(f"Failed to list captions: {response.status_code} - {response.text}")
        return None

    captions_data = response.json()

    if not captions_data.get('items'):
        print(f"No captions found for video {video_id}")
        return None

    # Find best caption track (prefer manual, then auto-generated, English first)
    caption_track = None
    for item in captions_data['items']:
        snippet = item['snippet']
        lang = snippet.get('language', '')
        track_kind = snippet.get('trackKind', '')

        # Prefer English tracks
        if lang.startswith('en'):
            if track_kind != 'ASR' or caption_track is None:
                caption_track = item
                if track_kind != 'ASR':  # Found manual English track, use it
                    break

    # If no English, take the first available
    if not caption_track:
        caption_track = captions_data['items'][0]

    caption_id = caption_track['id']
    print(f"Using caption track: {caption_id} ({caption_track['snippet'].get('language')})")

    # Step 2: Download the caption track
    download_url = f"{YOUTUBE_API_BASE}/captions/{caption_id}"
    params = {'tfmt': 'srt'}  # Request SRT format

    response = requests.get(download_url, headers=headers, params=params)

    if response.status_code != 200:
        print(f"Failed to download captions: {response.status_code} - {response.text}")
        # Try alternative: use timedtext API
        return fetch_transcript_timedtext(video_id, caption_track['snippet'].get('language', 'en'))

    # Parse SRT format to plain text
    srt_content = response.text
    return parse_srt_to_text(srt_content)


def fetch_transcript_timedtext(video_id, lang='en'):
    """Fetch transcript using YouTube's timedtext API (alternative method)"""
    # This uses the same endpoint as youtube_transcript_api but with different parameters
    url = f"https://www.youtube.com/api/timedtext"
    params = {
        'v': video_id,
        'lang': lang,
        'fmt': 'json3'
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'events' in data:
                text_parts = []
                for event in data['events']:
                    if 'segs' in event:
                        for seg in event['segs']:
                            if 'utf8' in seg:
                                text_parts.append(seg['utf8'])
                return ' '.join(text_parts).replace('\n', ' ').strip()
    except Exception as e:
        print(f"Timedtext fetch failed: {e}")

    return None


def parse_srt_to_text(srt_content):
    """Parse SRT subtitle format to plain text"""
    lines = srt_content.strip().split('\n')
    text_parts = []

    for line in lines:
        line = line.strip()
        # Skip sequence numbers, timestamps, and empty lines
        if not line:
            continue
        if line.isdigit():
            continue
        if '-->' in line:
            continue
        text_parts.append(line)

    return ' '.join(text_parts)


def get_openai_api_key():
    """Get OpenAI API key from settings file"""
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                settings = json.load(f)
                return settings.get('openaiApiKey', '')
    except Exception as e:
        print(f"Error reading OpenAI API key: {e}")
    return None


def transcribe_with_whisper(video_id):
    """Download video audio and transcribe using OpenAI Whisper"""
    api_key = get_openai_api_key()
    if not api_key:
        raise Exception("OpenAI API key not configured")

    audio_path = None
    try:
        # Download audio using yt-dlp
        audio_path = download_audio(video_id)
        if not audio_path or not os.path.exists(audio_path):
            raise Exception("Failed to download audio")

        print(f"Audio downloaded to: {audio_path}")

        # Transcribe with Whisper
        client = OpenAI(api_key=api_key)

        with open(audio_path, 'rb') as audio_file:
            print("Sending audio to Whisper API...")
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )

        print(f"Whisper transcription complete, length: {len(transcription)}")
        return transcription

    finally:
        # Clean up audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"Cleaned up audio file: {audio_path}")
            except Exception as e:
                print(f"Failed to clean up audio file: {e}")


def download_audio(video_id):
    """Download audio from YouTube video using yt-dlp"""
    import yt_dlp

    url = f"https://www.youtube.com/watch?v={video_id}"
    output_path = os.path.join(TEMP_DIR, f"{video_id}.mp3")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(TEMP_DIR, f"{video_id}.%(ext)s"),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '64',  # Lower quality for faster upload
        }],
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Downloading audio for video: {video_id}")
            ydl.download([url])

        if os.path.exists(output_path):
            return output_path
        else:
            # Check for other extensions in case ffmpeg isn't available
            for ext in ['m4a', 'webm', 'opus']:
                alt_path = os.path.join(TEMP_DIR, f"{video_id}.{ext}")
                if os.path.exists(alt_path):
                    return alt_path

        raise Exception("Audio file not found after download")

    except Exception as e:
        print(f"Error downloading audio: {e}")
        raise


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Transcript API is running'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"Starting Transcript API server on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
