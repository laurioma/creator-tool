import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  fetchInstagramStats,
  fetchTikTokStats,
  fetchYouTubeStats,
} from '../utils/socialMediaUtils';

export const refreshCampaignSocialMediaStats = async (campaign) => {
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
        const link = linkDoc.data();
        const url = link.url;
        const platform = extractPlatformFromUrl(url);
        const postId = extractPostIdFromUrl(url, platform);
        
        if (!postId) {
          console.error('Invalid URL format:', url);
          return { id: linkDoc.id, ...link };
        }

        try {
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
              return { id: linkDoc.id, ...link };
          }
          
          console.log(`Successfully fetched stats for ${platform} post:`, stats);
          
          // Create updated link data with platform info - preserve all existing fields
          const updatedLink = {
            ...link,
            url,
            platform, // Ensure platform is included
            stats: {
              ...stats,
              lastUpdated: new Date()
            }
          };
          
          // Update the link document with new stats and platform
          await updateDoc(doc(db, 'campaigns', campaign.id, 'links', linkDoc.id), {
            platform,
            stats: updatedLink.stats
          });
          
          return {
            id: linkDoc.id,
            ...updatedLink
          };
        } catch (error) {
          console.error(`Error fetching stats for ${platform} post:`, error);
          // Return original link if stats fetch fails, with platform added
          return { 
            id: linkDoc.id, 
            ...link, 
            platform: platform || 'unknown' 
          };
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

// Function to update social media stats in Firestore
export const updateSocialMediaStats = async (campaignId, linkId, stats) => {
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

export const fetchSocialMediaStats = async (url) => {
  try {
    const platform = extractPlatformFromUrl(url);
    const postId = extractPostIdFromUrl(url, platform);

    if (!postId) {
      throw new Error('Invalid URL format');
    }

    let stats;
    switch (platform) {
      case 'instagram':
        stats = await fetchInstagramStats(postId);
        break;
      case 'tiktok':
        stats = await fetchTikTokStats(postId);
        break;
      case 'youtube':
        // TODO: Implement YouTube stats fetching
        stats = {
          views: 0,
          likes: 0,
          comments: 0
        };
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