# Custom Playlist Guide

## Why Use a Custom Playlist?

YouTube's **Watch Later** playlist is a special private system playlist that may not be accessible via the YouTube Data API, even with proper OAuth authentication. If you're experiencing issues where the sync returns 0 videos despite having videos in your Watch Later playlist, you'll need to use a custom playlist instead.

## How to Set Up a Custom Playlist

### Step 1: Create a New Playlist on YouTube

1. Go to [YouTube](https://www.youtube.com)
2. Click on your profile icon (top right) → **Your channel**
3. Click on **Playlists** tab
4. Click **"New playlist"** or **"+ Create playlist"**
5. Give it a name (e.g., "Learning Videos", "My Course Videos", etc.)
6. Set the privacy to:
   - **Public** - Anyone can view (recommended for sharing)
   - **Unlisted** - Only people with the link can view (recommended for privacy)
   - **Private** - Only you can view (NOT recommended - may not work with API)

### Step 2: Add Videos to Your Custom Playlist

#### Option A: Move from Watch Later
1. Go to your [Watch Later playlist](https://www.youtube.com/playlist?list=WL)
2. For each video:
   - Click the three dots (...) menu
   - Select **"Add to playlist"**
   - Check your custom playlist
   - Optionally uncheck "Watch Later" to remove it

#### Option B: Add Videos Directly
- When watching any video, click **"Save"** button
- Select your custom playlist

### Step 3: Get Your Playlist URL or ID

1. Go to your custom playlist page
2. Copy the URL from the browser address bar
   - It will look like: `https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. You can copy:
   - The **full URL**: `https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Or just the **playlist ID**: `PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

Both formats work in our app!

### Step 4: Configure in YouTube Learning Manager

1. Open the app at `http://localhost:5173`
2. Go to **Settings** tab
3. Find the **"Playlist Configuration"** section
4. Paste your playlist URL or ID in the **"Custom Playlist URL or ID"** field
5. Click **"Save Playlist Settings"**
6. Go to **Videos** tab
7. Click **"Sync Videos"**

Your videos should now sync successfully!

## Troubleshooting

### "No videos fetched from custom playlist"

**Possible causes:**
1. **Playlist is set to Private**
   - Solution: Change to Public or Unlisted in YouTube playlist settings

2. **Wrong playlist ID**
   - Solution: Double-check the URL/ID you copied

3. **Playlist is empty**
   - Solution: Add some videos to the playlist first

4. **OAuth not authenticated**
   - Solution: Sign in with Google in Settings

### "Custom playlist is not accessible"

**Possible causes:**
1. **Playlist doesn't exist**
   - Solution: Make sure the playlist ID is correct

2. **You don't own the playlist**
   - Solution: The API can only access playlists you own or have access to

## Benefits of Custom Playlists

- **Works reliably** with YouTube Data API
- **Better organization** - Create multiple playlists for different topics
- **Easy sharing** - Set to Public or Unlisted to share with others
- **More control** - Full control over what videos to include

## Can I Still Use Watch Later?

Yes! You can continue using Watch Later for quick saves on YouTube. Just periodically move videos from Watch Later to your custom playlist when you want to manage them in the Learning Manager app.

## Example Workflow

1. **Throughout the week**: Save videos to Watch Later as you browse YouTube
2. **Once a week**:
   - Go to Watch Later playlist
   - Select videos you want to study
   - Add them to your "Learning Videos" custom playlist
   - Remove from Watch Later (optional)
3. **In Learning Manager**:
   - Click "Sync Videos"
   - Organize, categorize, and summarize your learning videos
   - Track your progress

## Multiple Playlists

You can create multiple custom playlists for different topics:
- "Programming Tutorials"
- "Data Science Courses"
- "Language Learning"
- "Fitness & Health"

Just switch the playlist URL in Settings to sync from different playlists!

## API Quota

The YouTube Data API has a daily quota limit of **10,000 units**. Typical usage:
- Syncing 50 videos: ~150-200 units
- Syncing 500 videos: ~1,500-2,000 units

You can sync multiple times per day without hitting the limit.
