import axios from 'axios';

interface TikTokStats {
    likes: number;
    comments: number;
    shares: number;
    views: number;
}

export interface SocialMediaStats {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
}

/**
 * Extracts the social media platform from a URL
 * @param url The social media URL
 * @returns The platform name ('tiktok', 'instagram', 'youtube', or null)
 */
export function extractPlatformFromUrl(url: string): string | null {
    if (!url) return null;
    
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        if (hostname.includes('tiktok.com')) return 'tiktok';
        if (hostname.includes('instagram.com')) return 'instagram';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
        
        return null;
    } catch (error) {
        console.error('Error extracting platform from URL:', error);
        return null;
    }
}

/**
 * Extracts post ID from a social media URL
 * @param url The social media URL
 * @param platform The platform name (tiktok, instagram, youtube)
 * @returns The post ID
 */
export function extractPostIdFromUrl(url: string, platform: string | null): string | null {
    if (!url || !platform) return null;
    
    try {
        const urlObj = new URL(url);
        
        switch (platform) {
            case 'tiktok': {
                const pathParts = urlObj.pathname.split('/');
                if (pathParts.includes('video')) {
                    return pathParts[pathParts.indexOf('video') + 1];
                }
                // For "/username/video/1234567890"
                if (pathParts.length >= 4 && pathParts[2] === 'video') {
                    return pathParts[3];
                }
                return pathParts[pathParts.length - 1];
            }
            
            case 'instagram': {
                const pathParts = urlObj.pathname.split('/');
                // Format: /p/{postId}/
                if (pathParts.includes('p')) {
                    return pathParts[pathParts.indexOf('p') + 1];
                }
                // Format: /reel/{postId}/
                if (pathParts.includes('reel')) {
                    return pathParts[pathParts.indexOf('reel') + 1];
                }
                return null;
            }
            
            case 'youtube': {
                // For youtube.com/watch?v=videoId
                if (urlObj.hostname.includes('youtube.com')) {
                    return urlObj.searchParams.get('v');
                }
                // For youtu.be/videoId
                if (urlObj.hostname.includes('youtu.be')) {
                    return urlObj.pathname.substring(1);
                }
                return null;
            }
            
            default:
                return null;
        }
    } catch (error) {
        console.error('Error extracting post ID from URL:', error);
        return null;
    }
}

export function parseTikTokStatsFromHtml(html: string): TikTokStats {
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

/**
 * Fetches stats for a TikTok video
 * @param postId The TikTok video ID or URL
 * @returns TikTok stats including likes, comments, shares
 */
export async function fetchTikTokStats(postId: string): Promise<SocialMediaStats> {
    try {
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
                throw new Error('Invalid TikTok URL format');
            }
        }

        // Validate video ID format (should be a number)
        if (!/^\d+$/.test(videoId)) {
            throw new Error('Invalid video ID format');
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

        const stats = parseTikTokStatsFromHtml(html);
        console.warn('Parsed stats:', stats);

        return stats;
    } catch (error: unknown) {
        console.error('Error fetching TikTok stats:', error);
        
        // Type assertion for axios error
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', {
                status: error.response?.status,
                data: error.response?.data,
            });
        }

        throw new Error('Failed to fetch TikTok stats');
    }
}

/**
 * Fetches stats for an Instagram post
 * @param postId The Instagram post ID
 * @returns Instagram stats including likes, comments, shares
 */
export async function fetchInstagramStats(postId: string): Promise<SocialMediaStats> {
    try {
        // Use embed approach for Instagram
        const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned`;

        const embedResponse = await axios.get(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Origin': 'https://www.instagram.com',
                'Referer': 'https://www.instagram.com/'
            }
        });

        const html = embedResponse.data;

        // Parse Instagram stats
        const likesMatch = html.match(/"like_count":(\d+)/);
        const commentsMatch = html.match(/"comment_count":(\d+)/);
        const sharesMatch = html.match(/"share_count":(\d+)/);

        const stats = {
            likes: likesMatch ? parseInt(likesMatch[1]) : 0,
            comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
            shares: sharesMatch ? parseInt(sharesMatch[1]) : 0
        };

        return stats;
    } catch (error: unknown) {
        console.error('Error fetching Instagram stats:', error);
        
        // Type assertion for axios error
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', {
                status: error.response?.status,
                data: error.response?.data,
            });
        }

        throw new Error('Failed to fetch Instagram stats');
    }
}

/**
 * Fetches stats for a YouTube video
 * @param postId The YouTube video ID
 * @returns YouTube stats including views, likes
 */
export async function fetchYouTubeStats(postId: string): Promise<SocialMediaStats> {
    try {
        // Get YouTube video page
        const videoUrl = `https://www.youtube.com/watch?v=${postId}`;

        const response = await axios.get(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        });

        const html = response.data;

        // Parse YouTube stats
        const views = html.match(/"viewCount":"(\d+)"/)?.[1] || '0';
        const likes = html.match(/"likes":"(\d+)"/)?.[1] || '0';

        const stats = {
            views: parseInt(views),
            likes: parseInt(likes),
            comments: 0,
            shares: 0
        };

        return stats;
    } catch (error: unknown) {
        console.error('Error fetching YouTube stats:', error);
        
        // Type assertion for axios error
        if (axios.isAxiosError(error)) {
            console.error('Axios error details:', {
                status: error.response?.status,
                data: error.response?.data,
            });
        }

        throw new Error('Failed to fetch YouTube stats');
    }
}

