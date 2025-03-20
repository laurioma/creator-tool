import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  fetchInstagramStats,
  fetchTikTokStats,
  fetchYouTubeStats
} from './utils/socialMedia';
import { getInstagramStats } from './platforms/instagram';
import { getTikTokStats } from './platforms/tiktok';

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

interface SocialMediaStats {
  likes: number;
  comments: number;
  shares: number;
  views?: number;
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

        let stats: SocialMediaStats = {
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

export const refreshSocialMediaStats = onSchedule('*/30 * * * *', async (_event) => {
  const campaignsSnapshot = await db.collection('campaigns').get();

  for (const doc of campaignsSnapshot.docs) {
    const campaign = doc.data() as Campaign;
    if (!campaign.socialMediaUrl) continue;

    try {
      const platform = extractPlatformFromUrl(campaign.socialMediaUrl);
      const postId = extractPostIdFromUrl(campaign.socialMediaUrl, platform);

      if (!postId) {
        console.error(`Invalid URL format for campaign ${doc.id}`);
        continue;
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
          console.error(`Unsupported platform for campaign ${doc.id}`);
          continue;
      }

      await doc.ref.update({
        stats: {
          ...stats,
          lastUpdated: FieldValue.serverTimestamp()
        }
      });

      console.warn(`Updated stats for campaign ${doc.id}:`, stats);
    } catch (error) {
      console.error(`Error updating stats for campaign ${doc.id}:`, error);
    }
  }
});

// Re-export the HTTP endpoints
export { getInstagramStats, getTikTokStats }; 