import { EventBase } from "../types";
import { UserStoreBase } from "../types/user-store";
import { NUserBase } from "./user";

/**
 * In-memory user store
 *
 * This is okay for testing.
 * See platform specific packages (web, node) for more robust options
 */
export class NUserStoreMemory implements UserStoreBase {
  users: NUserBase[];
  store: "memory";

  maxUsers: number;
  trackMaxPubkeys: number;
  userPubkeys: {
    pubkey: string;
    count: number;
  }[];

  constructor(limits?: { maxUsers?: number; trackMaxPubkeys?: number }) {
    this.users = [];
    this.store = "memory";
    if (limits) {
      this.maxUsers = limits.maxUsers || 300;
      this.trackMaxPubkeys = limits.trackMaxPubkeys || 300;
    } else {
      this.maxUsers = 300;
      this.trackMaxPubkeys = 300;
    }
    this.userPubkeys = [];
  }

  /**
   * Track public key from event
   * This is to keep track of the most seen public keys, and have those users in memory
   * @param pubkey
   */
  public trackKey(pubkey: string): void {
    const index = this.userPubkeys.findIndex((u) => u.pubkey === pubkey);
    if (index === -1) {
      this.userPubkeys.push({
        pubkey,
        count: 1,
      });
    } else {
      this.userPubkeys[index].count += 1;
    }
    this.userPubkeys.sort((a, b) => b.count - a.count);
    if (this.userPubkeys.length > this.trackMaxPubkeys) {
      this.userPubkeys.pop();
    }
  }

  public pinKey(pubkey: string): void {
    const index = this.userPubkeys.findIndex((u) => u.pubkey === pubkey);
    if (index === -1) {
      this.userPubkeys.push({
        pubkey,
        count: 100,
      });
    } else {
      this.userPubkeys[index].count += 100;
    }
    this.userPubkeys.sort((a, b) => b.count - a.count);
    if (this.userPubkeys.length > this.trackMaxPubkeys) {
      this.userPubkeys.pop();
    }
  }

  public unpinKey(pubkey: string): void {
    const index = this.userPubkeys.findIndex((u) => u.pubkey === pubkey);
    if (index !== -1) {
      this.userPubkeys[index].count -= 100;
    }
    this.userPubkeys.sort((a, b) => b.count - a.count);
    if (this.userPubkeys.length > this.trackMaxPubkeys) {
      this.userPubkeys.pop();
    }
  }

  /**
   * 1. Run only if users.length > maxUsers
   * 2. sort users in the order of most seen public keys (so a user lists first, if the userPubkeys.count is highgest)
   * 3. make sure the users array does not exceed maxUsers - 20
   */
  public filterUsersByPubkeyCount() {
    if (this.users.length <= this.maxUsers) {
      return;
    }

    const pubkeys = this.userPubkeys.map((u) => u.pubkey);
    let additionalUsersNeeded = this.maxUsers - 50 - pubkeys.length;

    // If there are no pubkeys to track, simply limit the array to `maxUsers - 50` oldest users.
    if (pubkeys.length === 0) {
      this.users = this.users.slice(0, this.maxUsers - 50);
      return;
    }

    this.users = this.users
      .sort(
        (a, b) =>
          (b.pubkey in pubkeys ? 1 : -1) - (a.pubkey in pubkeys ? 1 : -1)
      )
      .filter((user, index) => {
        if (pubkeys.includes(user.pubkey)) {
          return true;
        }
        if (additionalUsersNeeded > 0) {
          additionalUsersNeeded -= 1;
          return true;
        }
        return false;
      });

    // If even after this, the users array is more than `maxUsers - 50`, limit it.
    if (this.users.length > this.maxUsers - 50) {
      this.users = this.users.slice(0, this.maxUsers - 50);
    }
  }

  public byPubkey(pubkey: string): NUserBase | undefined {
    return this.users.find((u) => u.pubkey === pubkey);
  }

  public add(user: NUserBase): void {
    if (this.byPubkey(user.pubkey)) {
      return;
    }

    this.users.push(user);
    this.filterUsersByPubkeyCount();
  }

  public addFromEvent(event: EventBase) {
    if (event.kind !== 0) {
      return undefined;
    }
    const newUser = new NUserBase();
    newUser.fromEvent(event);
    this.add(newUser);
    return newUser;
  }

  public update(user: NUserBase): void {
    const index = this.users.findIndex((u) => u.pubkey === user.pubkey);
    if (index !== -1) {
      this.users[index] = user;
    }
  }

  public remove(pubkey: string): void {
    const index = this.users.findIndex((u) => u.pubkey === pubkey);
    if (index !== -1) {
      this.users.splice(index, 1);
    }
  }
}
