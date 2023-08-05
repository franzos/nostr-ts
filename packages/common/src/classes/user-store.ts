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
    this.users.push(user);
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
