export const extractPlatformFromUrl = (url: string): string => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com')) return 'youtube';
  return '';
};

export const extractPostIdFromUrl = (url: string, platform: string): string | null => {
  try {
    const urlObj = new URL(url);
    switch (platform) {
      case 'instagram':
        return urlObj.pathname.split('/')[2];
      case 'tiktok':
        return urlObj.pathname.split('/')[2];
      case 'youtube':
        return urlObj.searchParams.get('v');
      default:
        return null;
    }
  } catch {
    return null;
  }
};

export const fetchInstagramStats = async (postId: string) => {
  // TODO: Implement Instagram API integration
  return {
    likes: 0,
    comments: 0,
    shares: 0
  };
};

export const fetchTikTokStats = async (postId: string) => {
  // TODO: Implement TikTok API integration
  return {
    likes: 0,
    comments: 0,
    shares: 0
  };
};

export const fetchYouTubeStats = async (videoId: string) => {
  // TODO: Implement YouTube API integration
  return {
    views: 0,
    likes: 0,
    comments: 0
  };
};

export const parseInstagramStats = (data: any) => {
  // TODO: Implement Instagram stats parsing
  return {
    likes: 0,
    comments: 0,
    shares: 0
  };
};

export const parseTikTokStats = (data: any) => {
  // TODO: Implement TikTok stats parsing
  return {
    likes: 0,
    comments: 0,
    shares: 0
  };
};

export const parseYouTubeStats = (data: any) => {
  // TODO: Implement YouTube stats parsing
  return {
    views: 0,
    likes: 0,
    comments: 0
  };
}; 