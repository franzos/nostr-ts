import { NUserBase } from "../classes/user";
import { EventBase } from "./event";

/**
 * User store skeleton
 * Base for all implementations
 */
export interface UserStoreBase {
  /**
   * in-memory only
   */
  users?: NUserBase[];

  /**
   * Not all stores are available on all platforms.
   */
  store: "memory" | "indexeddb" | "sqlite";

  byPubkey(pubkey: string): NUserBase | undefined;
  add(user: NUserBase): void;
  addFromEvent(event: EventBase): void;
  update(user: NUserBase): void;
  remove(pubkey: string): void;
}
