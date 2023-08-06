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

  constructor() {
    this.users = [];
    this.store = "memory";
  }

  public byPubkey(pubkey: string): NUserBase | undefined {
    return this.users.find((u) => u.pubkey === pubkey);
  }

  public add(user: NUserBase): void {
    if (this.byPubkey(user.pubkey)) {
      return;
    }
    this.users.push(user);
  }

  public addFromEvent(event: EventBase) {
    if (event.kind !== 0) {
      return undefined;
    }
    const user = this.byPubkey(event.pubkey);
    if (!user) {
      const newUser = new NUserBase();
      newUser.fromEvent(event);
      this.add(newUser);
      console.log("added user", newUser);
    } else {
      console.log(`already have user ${user.pubkey}`);
    }
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
