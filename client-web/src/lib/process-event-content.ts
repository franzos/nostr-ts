import { LightProcessedEvent } from "@nostr-ts/common";

export function processEventContentFrontend(data: LightProcessedEvent) {
  let content: string | undefined =
    data.event?.content && data.event?.content !== ""
      ? data.event?.content
      : undefined;

  if (content === undefined) {
    return undefined;
  }

  // Find images and videos
  const imageRegex =
    /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif|webp)(?:\?\S+)?\b/gi;
  const videoRegex =
    /\bhttps?:\/\/\S+?\.(?:mp4|webm|ogg)\b|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|vimeo\.com\/)[a-zA-Z0-9_-]{6,11}(?:\?[a-zA-Z0-9_=&-]+)?\b/gi;

  const images: string[] | null = content?.match(imageRegex);
  const videos: string[] | null = content?.match(videoRegex);

  // Remove found images and videos from content
  if (images) {
    for (const img of images) {
      content = content.replace(img, "");
    }
  }

  if (videos) {
    for (const vid of videos) {
      content = content.replace(vid, "");
    }
  }

  // process youtu.be links
  // rewrite for ex. from youtu.be/THhCKAyo1As?si=0wUo3rEfsudkK9_g to youtube.com/watch?v=THhCKAyo1As
  if (videos) {
    for (let i = 0; i < videos.length; i++) {
      if (videos[i].includes("youtu.be")) {
        const videoId = videos[i].split("/").pop();
        videos[i] = `https://youtube.com/watch?v=${videoId}`;
      }
    }
  }

  // Remove trailing and leading whitespaces
  content = content.trim();

  return {
    images: images ? images : undefined,
    videos: videos ? videos : undefined,
    text: content.trim(),
  };
}
