import { getFunctions, httpsCallable } from 'firebase/functions';

// Define interfaces for the stats objects
export interface SocialMediaStats {
  likes: number;
  comments: number;
  shares?: number;
  views?: number;
  lastUpdated?: Date | string;
}

export interface YouTubeStats extends SocialMediaStats {
  views: number;
}

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'unknown';

// Initialize Firebase functions
const functions = getFunctions();

// Common fetch function for social media stats using httpsCallable
const fetchSocialMediaStats = async (endpoint: string, postId: string): Promise<SocialMediaStats> => {
  try {
    const getStats = httpsCallable(functions, endpoint);
    const result = await getStats({ postId });
    
    // Type assertion for the result data
    const data = result.data as { stats: SocialMediaStats };
    return data.stats;
  } catch (error) {
    console.error(`Error fetching ${endpoint} stats:`, error);
    return {
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

export const fetchInstagramStats = (postId: string): Promise<SocialMediaStats> => 
  fetchSocialMediaStats('getInstagramStats', postId);

export const fetchTikTokStats = (postId: string): Promise<SocialMediaStats> => 
  fetchSocialMediaStats('getTikTokStats', postId);

export const extractPlatformFromUrl = (url: string): PlatformType => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com')) return 'youtube';
  return 'unknown';
};

export const extractPostIdFromUrl = (url: string, platform: PlatformType): string | null => {
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

export const fetchYouTubeStats = async (postId: string): Promise<YouTubeStats> => {
  try {
    const getYouTubeStats = httpsCallable(functions, 'getYouTubeStats');
    const result = await getYouTubeStats({ postId });
    return result.data as YouTubeStats;
  } catch (error) {
    console.error('Error fetching YouTube stats:', error);
    return { views: 0, likes: 0, comments: 0 };
  }
}; 