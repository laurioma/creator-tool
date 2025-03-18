import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  parseInstagramStats,
  parseTikTokStats,
  parseYouTubeStats
} from '../shared/parsers/socialMediaParser';

const PROXY_URL = 'https://api.allorigins.win/raw?url=';

const fetchInstagramStats = async (postId) => {
  try {
    const response = await fetch(PROXY_URL + encodeURIComponent(`https://www.instagram.com/p/${postId}/embed/captioned`));
    const html = await response.text();
    
    const likes = html.match(/(\d+(?:,\d+)*) likes/i)?.[1]?.replace(/,/g, '') || '0';
    const views = html.match(/(\d+(?:,\d+)*) views/i)?.[1]?.replace(/,/g, '') || '0';
    const comments = html.match(/(\d+(?:,\d+)*) comments/i)?.[1]?.replace(/,/g, '') || '0';

    return {
      likes: parseInt(likes),
      views: parseInt(views),
      comments: parseInt(comments)
    };
  } catch (error) {
    console.error('Error fetching Instagram stats:', error);
    return { likes: 0, views: 0, comments: 0 };
  }
};

const fetchTikTokStats = async (postId) => {
  try {
    const response = await fetch(PROXY_URL + encodeURIComponent(`https://www.tiktok.com/embed/v2/${postId}`));
    const html = await response.text();

    const likes = html.match(/(\d+(?:,\d+)*) Likes/i)?.[1]?.replace(/,/g, '') || '0';
    const comments = html.match(/(\d+(?:,\d+)*) Comments/i)?.[1]?.replace(/,/g, '') || '0';
    const shares = html.match(/(\d+(?:,\d+)*) Shares/i)?.[1]?.replace(/,/g, '') || '0';

    return {
      likes: parseInt(likes),
      comments: parseInt(comments),
      shares: parseInt(shares),
      views: 0 // TikTok doesn't show view count in embed
    };
  } catch (error) {
    console.error('Error fetching TikTok stats:', error);
    return { likes: 0, comments: 0, shares: 0, views: 0 };
  }
};

const fetchYouTubeStats = async (postId) => {
  try {
    const response = await fetch(PROXY_URL + encodeURIComponent(`https://www.youtube.com/watch?v=${postId}`));
    const html = await response.text();

    const views = html.match(/"viewCount":"(\d+)"/)?.[1] || '0';
    const likes = html.match(/"likes":"(\d+)"/)?.[1] || '0';

    return {
      views: parseInt(views),
      likes: parseInt(likes)
    };
  } catch (error) {
    console.error('Error fetching YouTube stats:', error);
    return { views: 0, likes: 0 };
  }
};

export const refreshCampaignSocialMediaStats = async (campaign) => {
  try {
    const updatedLinks = await Promise.all(
      campaign.socialMediaLinks.map(async (link) => {
        const platform = extractPlatformFromUrl(link.link);
        const postId = extractPostIdFromUrl(link.link, platform);
        
        if (!postId) {
          console.error('Invalid URL format:', link.link);
          return link;
        }

        let stats = {};
        switch (platform) {
          case 'instagram':
            stats = await fetchInstagramStats(postId);
            break;
          case 'tiktok':
            stats = await fetchTikTokStats(postId);
            break;
          case 'youtube':
            stats = await fetchYouTubeStats(postId);
            break;
          default:
            return link;
        }

        return {
          ...link,
          stats: {
            ...stats,
            lastUpdated: new Date()
          }
        };
      })
    );

    // Update Firestore
    const campaignRef = doc(db, 'campaigns', campaign.id);
    await updateDoc(campaignRef, {
      socialMediaLinks: updatedLinks
    });

    return updatedLinks;
  } catch (error) {
    console.error('Error refreshing social media stats:', error);
    throw error;
  }
};

export const validateSocialMediaUrl = (url) => {
  const platform = extractPlatformFromUrl(url);
  const postId = extractPostIdFromUrl(url, platform);
  
  if (platform === 'unknown') {
    throw new Error('Unsupported platform. Please use Instagram, TikTok, or YouTube links.');
  }
  
  if (!postId) {
    throw new Error('Invalid URL format. Please check your link and try again.');
  }
  
  return { platform, postId };
};

// Helper function to extract Instagram media ID from URL
const extractInstagramMediaId = (url) => {
  try {
    // Handle different Instagram URL formats
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Handle instagram.com/p/... format
    if (pathParts.includes('p')) {
      const shortcode = pathParts[pathParts.indexOf('p') + 1];
      return shortcode;
    }
    
    // Handle instagram.com/reel/... format
    if (pathParts.includes('reel')) {
      const shortcode = pathParts[pathParts.indexOf('reel') + 1];
      return shortcode;
    }

    return null;
  } catch (error) {
    console.error('Error extracting Instagram media ID:', error);
    return null;
  }
};

// Function to update social media stats in Firestore
export const updateSocialMediaStats = async (campaignId, linkIndex, stats) => {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      [`socialMediaLinks.${linkIndex}.stats`]: stats
    });
  } catch (error) {
    console.error('Error updating social media stats:', error);
    throw error;
  }
};

export const updateRefreshInterval = async (campaignId, interval) => {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      refreshInterval: interval
    });
    return true;
  } catch (error) {
    console.error('Error updating refresh interval:', error);
    throw error;
  }
};

export const getSocialMediaStats = async (url) => {
  const platform = extractPlatformFromUrl(url);
  const postId = extractPostIdFromUrl(url, platform);

  if (!postId) {
    throw new Error('Invalid URL format');
  }

  try {
    const response = await fetch(`/api/social-media-stats?url=${encodeURIComponent(url)}`);
    const data = await response.text();

    switch (platform) {
      case 'instagram':
        return parseInstagramStats(data);
      case 'tiktok':
        return parseTikTokStats(data);
      case 'youtube':
        return parseYouTubeStats(data);
      default:
        throw new Error('Unsupported platform');
    }
  } catch (error) {
    console.error('Error fetching social media stats:', error);
    throw error;
  }
}; 