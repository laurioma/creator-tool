import { onRequest } from "firebase-functions/v2/https";
import axios from 'axios';
import { authenticateRequest, AuthenticatedRequest } from '../utils/auth';

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

export const getInstagramStats = onRequest(
  { cors: true },
  async (request: AuthenticatedRequest, response) => {
    // Apply authentication middleware
    authenticateRequest(request, response, async () => {
      try {
        const postId = request.query.postId as string;
        console.warn('Received postId:', postId);
        
        if (!postId) {
          response.status(400).json({ error: 'Post ID is required' });
          return;
        }

        // Use embed approach
        const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned`;
        console.warn('Fetching embed from:', embedUrl);
        
        const embedResponse = await axios.get(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Origin': 'https://www.instagram.com',
            'Referer': 'https://www.instagram.com/'
          }
        });

        const html = embedResponse.data;
        console.warn('Embed HTML received, length:', html.length);
        
        const stats = parseStatsFromHtml(html);
        console.warn('Parsed stats:', stats);

        const result: InstagramResponse = { stats };
        console.warn('Final result:', result);
        response.json(result);
      } catch (error) {
        console.error('Error fetching Instagram stats:', error);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            status: error.response?.status,
            data: error.response?.data,
            config: error.config
          });
        }
        response.status(500).json({ 
          error: 'Failed to fetch Instagram stats',
          details: axios.isAxiosError(error) ? error.response?.data : undefined
        });
      }
    });
  }
); 