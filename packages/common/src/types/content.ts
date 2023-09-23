import { NOSTR_URL_PREFIX } from "../utils";

export interface NEventContent {
  images: string[] | undefined;
  videos: string[] | undefined;
  nurls:
    | {
        type: NOSTR_URL_PREFIX;
        data: string;
      }[]
    | undefined;
  tags: string[] | undefined;
  text: string | undefined;
}
