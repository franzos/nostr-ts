import { LightProcessedEvent } from "@nostr-ts/common";

export function processEventContentFrontend(data: LightProcessedEvent) {
  // Initialize your variables
  let content = data.event?.content || "";

  // Find images and videos
  const imageRegex = /\bhttps?:\/\/\S+?\.(?:jpg|jpeg|png|gif)\b/gi;
  const videoRegex =
    /\bhttps?:\/\/\S+?\.(?:mp4|webm|ogg)\b|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|vimeo\.com\/)[a-zA-Z0-9_-]{6,11}\b/gi;
  const images = content?.match(imageRegex);
  const videos = content?.match(videoRegex);

  // Remove found images and videos from content
  if (images) {
    images.forEach((img) => {
      content = content.replace(img, "");
    });
  }

  if (videos) {
    videos.forEach((vid) => {
      content = content.replace(vid, "");
    });
  }

  // Remove trailing and leading whitespaces
  content = content.trim();

  // Check if content is empty after removing whitespaces
  if (content === "") {
    content = "";
  }

  return {
    images,
    videos,
    content,
  };
}
