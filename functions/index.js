import { onRequest, pubsub } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import {
  extractPlatformFromUrl,
  extractPostIdFromUrl,
  parseInstagramStats,
  parseTikTokStats,
  parseYouTubeStats
} from '../creator-tool-frontend/src/shared/parsers/socialMediaParser.js';

initializeApp();
const db = getFirestore();

// Reuse the same scraping logic from the frontend
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
      views: 0
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
exports.refreshAllCampaignStats = pubsub.schedule('every 60 minutes').onRun(async (context) => {
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

export const refreshSocialMediaStats = pubsub.schedule('*/30 * * * *').onRun(async (context) => {
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

      const response = await fetch(campaign.socialMediaUrl);
      const html = await response.text();

      let stats;
      switch (platform) {
        case 'instagram':
          stats = parseInstagramStats(html);
          break;
        case 'tiktok':
          stats = parseTikTokStats(html);
          break;
        case 'youtube':
          stats = parseYouTubeStats(html);
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