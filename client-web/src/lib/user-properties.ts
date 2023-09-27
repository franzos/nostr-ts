import { UserBase } from "@nostr-ts/common";

export interface UserOptions {
  showAbout?: boolean;
  showBanner?: boolean;
  showFollowing?: boolean;
  /**
   * Show block button
   */
  showBlock?: boolean;
  showLud?: boolean;
  relayUrls: string[];
  isBlocked?: boolean;
  lists?: {
    id: string;
    title: string;
  }[];

  /**
   * For pop-over
   */
  title?: string;
  /**
   * For reactions
   */
  reaction?: string;
  avatarSize?: "sm" | "md" | "lg" | "xl" | "2xl" | "2xs" | "xs" | "full";
}

export interface UserInfoProps {
  user: UserBase;
  opts: UserOptions;
}
