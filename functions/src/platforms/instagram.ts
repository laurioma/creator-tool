import * as functions from 'firebase-functions';
import cors = require('cors');
import axios from 'axios';

const corsHandler = cors({
  origin: true,
  methods: ['GET']
});

interface InstagramStats {
  likes: number;
  comments: number;
  shares: number;
}

interface InstagramResponse {
  stats: InstagramStats;
}

export function parseStatsFromHtml(html: string): InstagramStats {
  try {
    // Extract stats from Instagram embed HTML
    const likesMatch = html.match(/"like_count":(\d+)/);
    const commentsMatch = html.match(/"comment_count":(\d+)/);
    const sharesMatch = html.match(/"share_count":(\d+)/);

    return {
      likes: likesMatch ? parseInt(likesMatch[1]) : 0,
      comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
      shares: sharesMatch ? parseInt(sharesMatch[1]) : 0
    };
  } catch (error) {
    console.error('Error parsing Instagram stats:', error);
    return {
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
}

export const getInstagramStats = functions.https.onRequest((request, response) => {
  return corsHandler(request, response, async () => {
    try {
      const { postId } = request.query;

      if (!postId) {
        response.status(400).json({ error: 'Post ID is required' });
        return;
      }

      const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned`;
      
      const { data: html } = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Origin': 'https://www.instagram.com',
          'Referer': 'https://www.instagram.com/'
        }
      });

      const stats = parseStatsFromHtml(html);
      const result: InstagramResponse = { stats };

      response.json(result);
    } catch (error) {
      console.error('Error fetching Instagram stats:', error);
      response.status(500).json({ error: 'Failed to fetch Instagram stats' });
    }
  });
}); 