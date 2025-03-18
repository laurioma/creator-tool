// Common utilities for parsing social media URLs and stats
export const extractPlatformFromUrl = (url) => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'unknown';
};

export const extractPostIdFromUrl = (url, platform) => {
  try {
    switch (platform) {
      case 'instagram':
        return url.match(/\/(p|reel)\/([^/?]+)/)?.[2];
      case 'tiktok':
        return url.match(/video\/(\d+)/)?.[1];
      case 'youtube':
        if (url.includes('youtu.be/')) {
          return url.split('youtu.be/')[1].split('?')[0];
        }
        const videoId = new URL(url).searchParams.get('v');
        return videoId;
      default:
        return null;
    }
  } catch (error) {
    console.error('Error extracting post ID:', error);
    return null;
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
    const likes = html.match(/(\d+(?:,\d+)*) Likes/i)?.[1]?.replace(/,/g, '') || '0';
    const comments = html.match(/(\d+(?:,\d+)*) Comments/i)?.[1]?.replace(/,/g, '') || '0';
    const shares = html.match(/(\d+(?:,\d+)*) Shares/i)?.[1]?.replace(/,/g, '') || '0';

    return {
      likes: parseInt(likes),
      comments: parseInt(comments),
      shares: parseInt(shares),
      views: 0
    };
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