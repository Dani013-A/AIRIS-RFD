const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? "";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export interface YouTubeVideoResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  url: string;
}

// Keep recent search results in memory so we don't request them from YouTube too often.
const searchCache = new Map<string, { results: YouTubeVideoResult[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // Keep search results in memory for up to 10 minutes before getting fresh ones.

/**
 * Fetch video lessons from YouTube matching a search topic, using cached results if they are still fresh.
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults = 4
): Promise<YouTubeVideoResult[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  const cacheKey = `${query}::${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const queryString = [
    `part=snippet`,
    `q=${encodeURIComponent(query)}`,
    `type=video`,
    `videoEmbeddable=true`,
    `safeSearch=moderate`,
    `maxResults=${maxResults}`,
    `key=${YOUTUBE_API_KEY}`,
  ].join("&");

  const response = await fetch(`${YOUTUBE_SEARCH_URL}?${queryString}`);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  const results: YouTubeVideoResult[] = (data.items ?? [])
    .filter((item: any) => item?.id?.videoId)
    .map((item: any) => {
      const videoId: string = item.id.videoId;
      const snippet = item.snippet ?? {};
      return {
        videoId,
        title: snippet.title ?? "",
        description: snippet.description ?? "",
        thumbnailUrl:
          snippet.thumbnails?.maxres?.url ??
          snippet.thumbnails?.high?.url ??
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: snippet.channelTitle ?? "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });

  searchCache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });
  return results;
}

/** Build the ad-reduced nocookie embed URL for a given YouTube video ID. */
export function buildNoCookieEmbedUrl(videoId: string): string {
  const embedParams = [
    "rel=0",
    "modestbranding=1",
    "iv_load_policy=3",
    "playsinline=1",
    "fs=1",
    "color=white",
    "enablejsapi=1",
  ].join("&");
  return `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams}`;
}
