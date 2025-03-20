import { getAuth, getIdToken } from 'firebase/auth';

// Common utilities for parsing social media URLs and stats
const PROXY_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5001/reactapp-c5e96/us-central1/'
  : 'https://us-central1-reactapp-c5e96.cloudfunctions.net/';

// Helper function to get auth token
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await getIdToken(user);
};

export const extractPlatformFromUrl = (url) => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com')) return 'youtube';
  return '';
};

export const extractPostIdFromUrl = (url, platform) => {
  try {
    const urlObj = new URL(url);
    switch (platform) {
      case 'instagram':
        return urlObj.pathname.split('/')[2];
      case 'tiktok':
        // TikTok URLs can be in formats:
        // https://www.tiktok.com/@username/video/1234567890
        // https://vm.tiktok.com/1234567890
        // https://www.tiktok.com/t/1234567890
        const pathParts = urlObj.pathname.split('/');
        
        // Handle vm.tiktok.com format
        if (urlObj.hostname === 'vm.tiktok.com') {
          return pathParts[1];
        }
        
        // Handle www.tiktok.com format
        if (pathParts.includes('video')) {
          return pathParts[pathParts.indexOf('video') + 1];
        }
        
        // Handle t/ format
        if (pathParts.includes('t')) {
          return pathParts[pathParts.indexOf('t') + 1];
        }
        
        // If no specific format found, try the last part
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && /^\d+$/.test(lastPart)) {
          return lastPart;
        }
        
        return null;
      case 'youtube':
        return urlObj.searchParams.get('v');
      default:
        return null;
    }
  } catch {
    return null;
  }
};

export const fetchInstagramStats = async (postId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${PROXY_URL}getInstagramStats?postId=${encodeURIComponent(postId)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch Instagram stats');
    }
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching Instagram stats:', error);
    return {
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

export const fetchTikTokStats = async (postId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${PROXY_URL}getTikTokStats?postId=${encodeURIComponent(postId)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch TikTok stats');
    }
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Error fetching TikTok stats:', error);
    return {
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

export const fetchYouTubeStats = async (postId) => {
  try {
    const token = await getAuthToken();
    const response = await fetch(PROXY_URL + encodeURIComponent(`https://www.youtube.com/watch?v=${postId}`), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const html = await response.text();
    return parseYouTubeStats(html);
  } catch (error) {
    console.error('Error fetching YouTube stats:', error);
    return { views: 0, likes: 0 };
  }
};

export const parseInstagramStats = (html) => {
  try {
    const likes = html.match(/(\d+(?:,\d+)*) likes/i)?.[1]?.replace(/,/g, '') || '0';
    const views = html.match(/(\d+(?:,\d+)*) views/i)?.[1]?.replace(/,/g, '') || '0';
    const comments = html.match(/(\d+(?:,\d+)*) comments/i)?.[1]?.replace(/,/g, '') || '0';

    return {
      likes: parseInt(likes),
      views: parseInt(views),
      comments: parseInt(comments)
    };
  } catch (error) {
    console.error('Error parsing Instagram stats:', error);
    return { likes: 0, views: 0, comments: 0 };
  }
};

export const parseTikTokStats = (html) => {
  try {
    console.log('Parsing TikTok stats from HTML');
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));

    // Updated regex patterns to match the new embed structure
    const likesMatch = html.match(/data-e2e="Player-Layer-LayerText"[^>]*>([\d.]+)K?/i);
    const commentsMatch = html.match(/data-e2e="Player-Layer-LayerText"[^>]*>(\d+)/g)?.[1]?.match(/\d+/);
    const sharesMatch = html.match(/data-e2e="Player-Layer-LayerText"[^>]*>(\d+)/g)?.[2]?.match(/\d+/);

    console.log('Regex matches:', {
      likes: likesMatch?.[1],
      comments: commentsMatch?.[0],
      shares: sharesMatch?.[0]
    });

    // Convert K to actual numbers
    const parseNumber = (str) => {
      if (!str) return 0;
      if (str.includes('K')) {
        return Math.round(parseFloat(str) * 1000);
      }
      return parseInt(str);
    };

    const likes = parseNumber(likesMatch?.[1] || '0');
    const comments = parseInt(commentsMatch?.[0] || '0');
    const shares = parseInt(sharesMatch?.[0] || '0');

    const stats = {
      likes,
      comments,
      shares,
      views: 0
    };

    console.log('Final parsed TikTok stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error parsing TikTok stats:', error);
    return { likes: 0, comments: 0, shares: 0, views: 0 };
  }
};

export const parseYouTubeStats = (html) => {
  try {
    const views = html.match(/"viewCount":"(\d+)"/)?.[1] || '0';
    const likes = html.match(/"likes":"(\d+)"/)?.[1] || '0';

    return {
      views: parseInt(views),
      likes: parseInt(likes)
    };
  } catch (error) {
    console.error('Error parsing YouTube stats:', error);
    return { views: 0, likes: 0 };
  }
}; 