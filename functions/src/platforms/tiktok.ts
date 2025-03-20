import { onRequest } from "firebase-functions/v2/https";
import axios from 'axios';
import { authenticateRequest, AuthenticatedRequest } from '../utils/auth';

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

export const getTikTokStats = onRequest(
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

        // Extract the video ID from the post ID if it's a full URL
        let videoId = postId;
        
        if (postId.includes('tiktok.com')) {
          try {
            const url = new URL(postId);
            const pathParts = url.pathname.split('/');
            if (pathParts.includes('video')) {
              videoId = pathParts[pathParts.indexOf('video') + 1];
            } else {
              videoId = pathParts[pathParts.length - 1];
            }
            console.warn('Extracted video ID from URL:', videoId);
          } catch (error) {
            console.error('Error parsing TikTok URL:', error);
            response.status(400).json({ 
              error: 'Invalid TikTok URL format',
              receivedId: postId
            });
            return;
          }
        }

        // Validate video ID format (should be a number)
        if (!/^\d+$/.test(videoId)) {
          console.error('Invalid video ID format:', videoId);
          response.status(400).json({ 
            error: 'Invalid video ID format',
            receivedId: postId,
            extractedId: videoId
          });
          return;
        }

        // Use embed approach with proper video ID
        const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
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
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            status: error.response?.status,
            data: error.response?.data,
            config: error.config
          });
        }
        response.status(500).json({ 
          error: 'Failed to fetch TikTok stats',
          details: axios.isAxiosError(error) ? error.response?.data : undefined
        });
      }
    });
  }
); 