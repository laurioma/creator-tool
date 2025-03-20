interface SocialMediaStats {
  likes: number;
  comments: number;
  shares: number;
  views?: number;
}

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

export const fetchInstagramStats = async (postId: string): Promise<SocialMediaStats> => {
  const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned`;
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Origin': 'https://www.instagram.com',
      'Referer': 'https://www.instagram.com/'
    }
  });
  
  const html = await response.text();
  const likesMatch = html.match(/"like_count":(\d+)/);
  const commentsMatch = html.match(/"comment_count":(\d+)/);
  const sharesMatch = html.match(/"share_count":(\d+)/);

  return {
    likes: likesMatch ? parseInt(likesMatch[1]) : 0,
    comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
    shares: sharesMatch ? parseInt(sharesMatch[1]) : 0
  };
};

export const fetchTikTokStats = async (postId: string): Promise<SocialMediaStats> => {
  const embedUrl = `https://www.tiktok.com/embed/v2/${postId}`;
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Origin': 'https://www.tiktok.com',
      'Referer': 'https://www.tiktok.com/'
    }
  });

  const html = await response.text();
  const statsElements = html.match(/data-e2e="Player-Layer-LayerText"[^>]*>([^<]+)</g);
  
  if (!statsElements) {
    return {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0
    };
  }

  const statsText = statsElements.map(el => el.match(/data-e2e="Player-Layer-LayerText"[^>]*>([^<]+)</)?.[1] || '0');
  
  const parseNumber = (str: string): number => {
    if (!str) return 0;
    if (str.includes('K')) {
      return Math.round(parseFloat(str) * 1000);
    }
    return parseInt(str);
  };

  return {
    likes: parseNumber(statsText[0]),
    comments: parseNumber(statsText[1]),
    shares: parseNumber(statsText[2]),
    views: 0
  };
};

export const fetchYouTubeStats = async (_videoId: string): Promise<SocialMediaStats> => {
  // TODO: Implement YouTube API integration
  return {
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0
  };
}; 