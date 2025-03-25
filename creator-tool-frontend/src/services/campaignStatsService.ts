import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, query, where, DocumentData, DocumentSnapshot } from 'firebase/firestore';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  fetchInstagramStats,
  fetchTikTokStats,
  fetchYouTubeStats,
  SocialMediaStats,
  PlatformType
} from '../utils/socialMediaUtils';

interface Campaign {
  id: string;
  [key: string]: any;
}

interface Link extends DocumentData {
  id: string;
  url: string;
  platform?: PlatformType;
  stats?: SocialMediaStats;
  [key: string]: any;
}

export const refreshCampaignSocialMediaStats = async (campaign: Campaign): Promise<Link[]> => {
  try {
    // Get all links for the campaign
    const linksRef = collection(db, 'campaigns', campaign.id, 'links');
    const linksSnapshot = await getDocs(linksRef);
    
    if (linksSnapshot.empty) {
      console.warn(`No links found for campaign ${campaign.id}`);
      return [];
    }
    
    console.log(`Refreshing ${linksSnapshot.size} links for campaign ${campaign.id}`);
    
    const updatedLinks = await Promise.all(
      linksSnapshot.docs.map(async (linkDoc) => {
        const linkData = linkDoc.data();
        const linkId = linkDoc.id;
        const url = linkData.url;
        const platform = extractPlatformFromUrl(url);
        const postId = extractPostIdFromUrl(url, platform);
        
        if (!postId) {
          console.error('Invalid URL format:', url);
          return { id: linkId, url, ...linkData } as Link;
        }

        try {
          let stats: SocialMediaStats = {
            likes: 0,
            comments: 0
          };

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
              return { id: linkId, url, ...linkData } as Link;
          }
          
          console.log(`Successfully fetched stats for ${platform} post:`, stats);
          
          // Create updated link data with platform info - preserve all existing fields
          const updatedLink: Link = {
            ...linkData,
            id: linkId,
            url,
            platform, // Ensure platform is included
            stats: {
              ...stats,
              lastUpdated: new Date()
            }
          };
          
          // Update the link document with new stats and platform
          await updateDoc(doc(db, 'campaigns', campaign.id, 'links', linkId), {
            platform,
            stats: updatedLink.stats
          });
          
          return updatedLink;
        } catch (error) {
          console.error(`Error fetching stats for ${platform} post:`, error);
          // Return original link if stats fetch fails, with platform added
          return { 
            id: linkId, 
            url,
            ...linkData, 
            platform: platform || 'unknown' as PlatformType
          } as Link;
        }
      })
    );

    console.log(`Successfully updated ${updatedLinks.length} links for campaign ${campaign.id}`);
    return updatedLinks;
  } catch (error) {
    console.error('Error refreshing social media stats:', error);
    throw error;
  }
};

interface ValidationResult {
  platform: PlatformType;
  postId: string;
}

export const validateSocialMediaUrl = (url: string): ValidationResult => {
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

// Function to update social media stats in Firestore
export const updateSocialMediaStats = async (campaignId: string, linkId: string, stats: SocialMediaStats): Promise<void> => {
  try {
    const linkRef = doc(db, 'campaigns', campaignId, 'links', linkId);
    await updateDoc(linkRef, {
      stats: {
        ...stats,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating social media stats:', error);
    throw error;
  }
};

export const updateRefreshInterval = async (campaignId: string, interval: number): Promise<boolean> => {
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

interface SocialMediaData {
  platform: PlatformType;
  postId: string;
  stats: SocialMediaStats;
  lastUpdated: string;
}

export const fetchSocialMediaStats = async (url: string): Promise<SocialMediaData> => {
  try {
    const platform = extractPlatformFromUrl(url);
    const postId = extractPostIdFromUrl(url, platform);

    if (!postId) {
      throw new Error('Invalid URL format');
    }

    let stats: SocialMediaStats;
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
        throw new Error('Unsupported platform. Please use Instagram, TikTok, or YouTube links.');
    }

    return {
      platform,
      postId,
      stats,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching social media stats:', error);
    throw error;
  }
}; 