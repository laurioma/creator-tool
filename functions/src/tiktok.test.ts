import { parseStatsFromHtml } from './tiktok';

describe('parseStatsFromHtml', () => {
  it('should correctly parse likes, comments, and shares from TikTok embed HTML', () => {
    const html = `<div data-e2e="Player-Layer-LayerInfo" class="css-bjn8wh es828bz4">
      <a target="_blank" href="https://www.tiktok.com/@vanessalopesr/video/7481809816910908678" rel="noreferrer" data-e2e="src-SmartWrapperExtension-a">
        <div data-e2e="Player-Layer-LayerLikeCommentShareComponent" class="css-1o8oa5s es828bz1">
          <span data-e2e="Player-Layer-LayerText" class="css-1rj220v es828bz0">721.4K</span>
        </div>
      </a>
      <a target="_blank" href="https://www.tiktok.com/@vanessalopesr/video/7481809816910908678" rel="noreferrer" data-e2e="src-SmartWrapperExtension-a">
        <div data-e2e="Player-Layer-LayerLikeCommentShareComponent" class="css-1o8oa5s es828bz1">
          <span data-e2e="Player-Layer-LayerText" class="css-1rj220v es828bz0">1352</span>
        </div>
      </a>
      <a target="_blank" href="https://www.tiktok.com/@vanessalopesr/video/7481809816910908678" rel="noreferrer" data-e2e="src-SmartWrapperExtension-a">
        <div data-e2e="Player-Layer-LayerLikeCommentShareComponent" class="css-1o8oa5s es828bz1">
          <span data-e2e="Player-Layer-LayerText" class="css-1rj220v es828bz0">2885</span>
        </div>
      </a>
    </div>`;

    const stats = parseStatsFromHtml(html);

    expect(stats).toEqual({
      likes: 721400, // 721.4K converted to number
      comments: 1352,
      shares: 2885,
      views: 0
    });
  });

  it('should handle missing stats gracefully', () => {
    const html = `<div data-e2e="Player-Layer-LayerInfo" class="css-bjn8wh es828bz4">
      <a target="_blank" href="https://www.tiktok.com/@vanessalopesr/video/7481809816910908678" rel="noreferrer" data-e2e="src-SmartWrapperExtension-a">
        <div data-e2e="Player-Layer-LayerLikeCommentShareComponent" class="css-1o8oa5s es828bz1">
          <span data-e2e="Player-Layer-LayerText" class="css-1rj220v es828bz0">1.2K</span>
        </div>
      </a>
    </div>`;

    const stats = parseStatsFromHtml(html);

    expect(stats).toEqual({
      likes: 1200,
      comments: 0,
      shares: 0,
      views: 0
    });
  });

  it('should throw error when no stats elements are found', () => {
    const html = `<div>No stats here</div>`;

    expect(() => parseStatsFromHtml(html)).toThrow('No stats elements found in HTML');
  });
}); 