import * as functions from 'firebase-functions';
import cors = require('cors');
import axios from 'axios';

const corsHandler = cors({
  origin: true,
  methods: ['GET']
});

interface TikTokStats {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

interface TikTokResponse {
  stats: TikTokStats;
}

export function parseStatsFromHtml(html: string): TikTokStats {
  // Find all elements with data-e2e="Player-Layer-LayerText"
  const statsElements = html.match(/data-e2e="Player-Layer-LayerText"[^>]*>([^<]+)</g);
  
  if (!statsElements) {
    throw new Error('No stats elements found in HTML');
  }

  // Extract the text content from each element
  const statsText = statsElements.map(el => el.match(/data-e2e="Player-Layer-LayerText"[^>]*>([^<]+)</)?.[1] || '0');
  
  // Parse numbers, handling K suffix
  const parseNumber = (str: string): number => {
    if (!str) return 0;
    if (str.includes('K')) {
      return Math.round(parseFloat(str) * 1000);
    }
    return parseInt(str);
  };

  // The order is: likes, comments, shares
  return {
    likes: parseNumber(statsText[0]),
    comments: parseNumber(statsText[1]),
    shares: parseNumber(statsText[2]),
    views: 0
  };
}

export const getTikTokStats = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      const postId = request.query.postId as string;
      
      if (!postId) {
        response.status(400).json({ error: 'Post ID is required' });
        return;
      }

      // Use embed approach
      const embedUrl = `https://www.tiktok.com/embed/v2/${postId}`;
      console.warn('Fetching embed from:', embedUrl);
      
      const embedResponse = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Origin': 'https://www.tiktok.com',
          'Referer': 'https://www.tiktok.com/'
        }
      });

      const html = embedResponse.data;
      console.warn('Embed HTML received, length:', html.length);
      
      const stats = parseStatsFromHtml(html);
      console.warn('Parsed stats:', stats);

      const result: TikTokResponse = { stats };
      console.warn('Final result:', result);
      response.json(result);
    } catch (error) {
      console.error('Error fetching TikTok stats:', error);
      response.status(500).json({ error: 'Failed to fetch TikTok stats' });
    }
  });
}); 