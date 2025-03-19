import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  fetchInstagramStats,
  fetchTikTokStats,
  fetchYouTubeStats,
  parseInstagramStats,
  parseTikTokStats,
  parseYouTubeStats
} from './src/utils/socialMedia';

initializeApp();
const db = getFirestore();

const refreshCampaignStats = async (campaign) => {
  try {
    if (!campaign.socialMediaLinks || campaign.socialMediaLinks.length === 0) {
      console.log(`No social media links for campaign ${campaign.id}`);
      return null;
    }

    console.log(`Refreshing stats for campaign ${campaign.id}`);
    const updatedLinks = await Promise.all(
      campaign.socialMediaLinks.map(async (link) => {
        const platform = extractPlatformFromUrl(link.link);
        const postId = extractPostIdFromUrl(link.link, platform);
        
        if (!postId) {
          console.error(`Invalid URL format for campaign ${campaign.id}:`, link.link);
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
            lastUpdated: FieldValue.serverTimestamp()
          }
        };
      })
    );

    await db.collection('campaigns').doc(campaign.id).update({
      socialMediaLinks: updatedLinks
    });

    console.log(`Successfully updated stats for campaign ${campaign.id}`);
    return updatedLinks;
  } catch (error) {
    console.error(`Error refreshing campaign ${campaign.id} stats:`, error);
    throw error;
  }
};

// Run every hour
export const refreshAllCampaignStats = onSchedule('every 60 minutes', async (event) => {
  try {
    console.log('Starting scheduled refresh of all campaign stats');
    const campaignsSnapshot = await db.collection('campaigns')
      .where('status', '==', 'active')
      .get();

    console.log(`Found ${campaignsSnapshot.size} active campaigns`);
    const updatePromises = campaignsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .map(refreshCampaignStats);

    await Promise.all(updatePromises);
    console.log('Successfully completed refresh of all campaign stats');
    return null;
  } catch (error) {
    console.error('Error in scheduled refresh:', error);
    throw error;
  }
});

export const refreshSocialMediaStats = onSchedule('*/30 * * * *', async (event) => {
  const campaignsSnapshot = await db.collection('campaigns').get();

  for (const doc of campaignsSnapshot.docs) {
    const campaign = doc.data();
    if (!campaign.socialMediaUrl) continue;

    try {
      const platform = extractPlatformFromUrl(campaign.socialMediaUrl);
      const postId = extractPostIdFromUrl(campaign.socialMediaUrl, platform);

      if (!postId) {
        console.error(`Invalid URL format for campaign ${doc.id}`);
        continue;
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

      console.log(`Updated stats for campaign ${doc.id}:`, stats);
    } catch (error) {
      console.error(`Error updating stats for campaign ${doc.id}:`, error);
    }
  }
}); 