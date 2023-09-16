import { UserRecord } from "@nostr-ts/common";

export interface CreateListRecord {
  title: string;
  description?: string;
  tags?: string[];
  userPubkeys?: string[];
}

export interface ListRecord extends CreateListRecord {
  id: string;
}

export interface ProcessedListRecord extends ListRecord {
  users?: UserRecord[];
}

export type ProcessedEventKeys =
  | "reactions"
  | "replies"
  | "mentions"
  | "reposts"
  | "badgeAwards"
  | "zapReceipt";
