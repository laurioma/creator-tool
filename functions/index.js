const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// Reuse the same scraping logic from the frontend
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

const extractPlatformFromUrl = (url) => {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'unknown';
};

const extractPostIdFromUrl = (url, platform) => {
  try {
    switch (platform) {
      case 'instagram':
        return url.match(/\/(p|reel)\/([^/?]+)/)?.[2];
      case 'tiktok':
        return url.match(/video\/(\d+)/)?.[1];
      case 'youtube':
        if (url.includes('youtu.be/')) {
          return url.split('youtu.be/')[1].split('?')[0];
        }
        const videoId = new URL(url).searchParams.get('v');
        return videoId;
      default:
        return null;
    }
  } catch (error) {
    console.error('Error extracting post ID:', error);
    return null;
  }
};

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
            lastUpdated: admin.firestore.Timestamp.now()
          }
        };
      })
    );

    await admin.firestore().collection('campaigns').doc(campaign.id).update({
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
exports.refreshAllCampaignStats = functions.pubsub.schedule('every 60 minutes').onRun(async (context) => {
  try {
    console.log('Starting scheduled refresh of all campaign stats');
    const campaignsSnapshot = await admin.firestore().collection('campaigns')
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