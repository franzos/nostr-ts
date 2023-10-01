import { NEVENT_KIND, NEventContent } from "../types";
import { NOSTR_URL_PREFIX, NOSTR_URL_REGEX_GLOBAL } from "./nostr-url";
import { isValidWebSocketUrl } from "./websocket-url";

/**
 * Validate event content
 *
 * Accepts:
 * - "wss://relay.example.com"
 * - "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234 nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout [picture](https://picture.com/pic.jpg)"
 *
 * Specifically does not accept
 * - HTML
 * - Line breaks
 *
 * @param content
 */
export function isValidEventContent(
  content: string,
  kind?: NEVENT_KIND
): { isValid: boolean; error?: string } {
  // No content is valid content
  if (!content || content === "") return { isValid: true };

  if (kind === NEVENT_KIND.REPOST) {
    // Expect empty or json
    try {
      JSON.parse(content);
      return { isValid: true };
    } catch (e) {
      console.error(e);
      return { isValid: false, error: "Invalid JSON format" };
    }
  } else if (kind === NEVENT_KIND.RECOMMEND_RELAY) {
    if (!isValidWebSocketUrl(content)) {
      return {
        isValid: false,
        error: `Expected a valid websocket URL, got ${content}.`,
      };
    }
  }

  if (containsHTML(content)) {
    return { isValid: false, error: "HTML tags are not allowed" };
  }

  // TODO: Many users use line breaks to format their content.
  // if (containsLineBreaks(content)) {
  //   return { isValid: false, error: "Line breaks are not allowed" };
  // }

  // If none of the negative conditions are met
  return { isValid: true };
}

function containsHTML(content: string): boolean {
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(content);
}

function containsLineBreaks(content: string): boolean {
  return content.includes("\n");
}

/**
 * These are supported out of the box
 * including any other link, with media extention (mp4, mp3, ...)
 */
const StreamingProvider = [
  {
    name: "www.youtube.com",
  },
  {
    name: "music.youtube.com",
  },
  {
    name: "youtu.be",
    rewrite: (url: string) => {
      const videoId = url.split("/").pop();
      return `https://www.youtube.com/watch?v=${videoId}`;
    },
  },
  {
    name: "twitch.tv",
  },
  {
    name: "vimeo.com",
  },
  {
    name: "rumble.com",
  },
];

const ImageFormats = ["jpg", "jpeg", "png", "gif", "webp"];
const VideoFormats = ["mp4", "webm", "ogg"];

// const videoDomainRegex = StreamingProvider.map((provider) =>
//   provider.name.replace(/\./g, "\\.")
// ).join("|");

// const videoExtRegex = VideoFormats.join("|");

const videoProvidersPattern = StreamingProvider.map((provider) => {
  return provider.name.replace(/\./g, "\\.");
}).join("|");

const videoFormatsPattern = VideoFormats.join("|");

const videoRegexPattern = `https?:\\/\\/(${videoProvidersPattern})\\/?\\w*\\/([a-zA-Z0-9_-]+)(?:\\?[a-zA-Z0-9_=&-]+)?|https?:\\/\\/\\S+\\.(${videoFormatsPattern})`;
export const videoRegex = new RegExp(videoRegexPattern, "gi");

//

const imageFormatsRegex = ImageFormats.join("|");
export const imageRegex = new RegExp(
  `\\bhttps?:\\/\\/\\S+?\\.(${imageFormatsRegex})(?:\\?\\S+)?\\b`,
  "gi"
);

export function extractEventContent(content?: string): NEventContent {
  if (content === undefined) {
    return undefined;
  }

  const images: string[] | null = content?.match(imageRegex);
  const videos: string[] | null = content?.match(videoRegex);

  const data = Array.from(content.matchAll(NOSTR_URL_REGEX_GLOBAL), (m) =>
    m.slice(1, 3)
  );

  const nurls = data
    .map(([type, data]) => {
      if (Object.values(NOSTR_URL_PREFIX).includes(type as NOSTR_URL_PREFIX)) {
        return { type: type as NOSTR_URL_PREFIX, data };
      }
      return null;
    })
    .filter((n) => n !== null);

  const tagsRegex = /#[a-zA-Z0-9_-]+/gi;
  const tags = content?.match(tagsRegex);

  /**
   * Remove from content
   */
  if (images && content)
    images.forEach((img) => (content = content.replace(img, "")));
  if (videos && content)
    videos.forEach((vid) => (content = content.replace(vid, "")));

  /**
   * Rewrite URLs
   */
  if (videos) {
    videos.forEach((vid, i) => {
      const rewriteProvider = StreamingProvider.find((provider) =>
        vid.includes(provider.name)
      );
      if (rewriteProvider?.rewrite) {
        videos[i] = rewriteProvider.rewrite(vid);
      }
    });
  }

  return {
    images: images || undefined,
    videos: videos || undefined,
    nurls: nurls && nurls.length > 0 ? nurls : undefined,
    tags: tags || undefined,
    text: content.trim(),
  };
}
