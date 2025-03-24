import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  fetchInstagramStats,
  fetchTikTokStats,
  fetchYouTubeStats
} from './socialMedia';

// Types
interface SocialMediaLink {
  link: string;
  stats?: {
    lastUpdated: FieldValue;
    [key: string]: unknown;
  };
}

interface Campaign {
  id: string;
  socialMediaLinks?: SocialMediaLink[];
  status?: string;
  socialMediaUrl?: string;
}

// Initialize Firebase
initializeApp();
const db = getFirestore();

const refreshCampaignStats = async (campaign: Campaign): Promise<SocialMediaLink[] | null> => {
  try {
    if (!campaign.socialMediaLinks || campaign.socialMediaLinks.length === 0) {
      console.warn(`No social media links for campaign ${campaign.id}`);
      return null;
    }

    console.warn(`Refreshing stats for campaign ${campaign.id}`);
    const updatedLinks = await Promise.all(
      campaign.socialMediaLinks.map(async (link) => {
        const platform = extractPlatformFromUrl(link.link);
        const postId = extractPostIdFromUrl(link.link, platform);
        
        if (!postId) {
          console.error(`Invalid URL format for campaign ${campaign.id}:`, link.link);
          return link;
        }

        let stats = {
          likes: 0,
          comments: 0,
          shares: 0
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
            return link;
        }

        // Create a new object that preserves all properties from the original link
        return {
          ...link,
          stats: {
            ...stats,
            lastUpdated: FieldValue.serverTimestamp()
          }
        };
      })
    );

    await db.collection('campaigns').doc(campaign.id).update({
      socialMediaLinks: updatedLinks
    });

    console.warn(`Successfully updated stats for campaign ${campaign.id}`);
    return updatedLinks;
  } catch (error) {
    console.error(`Error refreshing campaign ${campaign.id} stats:`, error);
    throw error;
  }
};

// Run every hour
export const refreshAllCampaignStats = onSchedule('every 60 minutes', async (_event) => {
  try {
    console.warn('Starting scheduled refresh of all campaign stats');
    const campaignsSnapshot = await db.collection('campaigns')
      .where('status', '==', 'active')
      .get();

    console.warn(`Found ${campaignsSnapshot.size} active campaigns`);
    const updatePromises = campaignsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Campaign))
      .map(refreshCampaignStats);

    await Promise.all(updatePromises);
    console.warn('Successfully completed refresh of all campaign stats');
  } catch (error) {
    console.error('Error in scheduled refresh:', error);
    throw error;
  }
});

// TikTok Stats Callable Function
export const getTikTokStats = onCall(async (request) => {
  try {
    const { postId } = request.data;

    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check if postId is provided
    if (!postId) {
      throw new HttpsError('invalid-argument', 'Post ID is required');
    }

    try {
      const stats = await fetchTikTokStats(postId);
      return { stats };
    } catch (error) {
      console.error('Error in getTikTokStats:', error);
      throw new HttpsError('internal', 'Failed to fetch TikTok stats');
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
});

// Instagram Stats Function
export const getInstagramStats = onCall(async (request) => {
  try {
    const { postId } = request.data;

    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    if (!postId) {
      throw new HttpsError('invalid-argument', 'Post ID is required');
    }

    try {
      const stats = await fetchInstagramStats(postId);
      return { stats };
    } catch (error) {
      console.error('Error in getInstagramStats:', error);
      throw new HttpsError('internal', 'Failed to fetch Instagram stats');
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
});

// YouTube Stats Function
export const getYouTubeStats = onCall(async (request) => {
  try {
    const { postId } = request.data;

    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    if (!postId) {
      throw new HttpsError('invalid-argument', 'Post ID is required');
    }

    try {
      const stats = await fetchYouTubeStats(postId);
      return { stats };
    } catch (error) {
      console.error('Error in getYouTubeStats:', error);
      throw new HttpsError('internal', 'Failed to fetch YouTube stats');
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred');
  }
}); 