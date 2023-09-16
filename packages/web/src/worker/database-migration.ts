import { ProcessedUserBase, EventBase, NEVENT_KIND } from "@nostr-ts/common";

export function dbMigration(db, oldVersion, _newVersion, transaction) {
  if (oldVersion < 1) {
    // Initial version
    if (!db.objectStoreNames.contains("users")) {
      db.createObjectStore("users", { keyPath: "user.pubkey" });
    }
    if (!db.objectStoreNames.contains("following")) {
      db.createObjectStore("following", { keyPath: "user.pubkey" });
    }
  }

  if (oldVersion < 2) {
    if (db.objectStoreNames.contains("following")) {
      db.deleteObjectStore("following");
    }
  }

  if (oldVersion < 3) {
    if (!db.objectStoreNames.contains("lists")) {
      db.createObjectStore("lists", { keyPath: "id" });
      const listStore = transaction.objectStore("lists");
      listStore.createIndex("users", "userPubkeys", { multiEntry: true });
    }
  }

  if (oldVersion < 4) {
    const eventStore = db.createObjectStore("events", { keyPath: "id" });

    eventStore.createIndex("pubkey", "pubkey", { unique: false });
    eventStore.createIndex("kind", "kind", { unique: false });
    eventStore.createIndex("created_at", "created_at", { unique: false });

    eventStore.createIndex("kindAndPubkey", ["kind", "pubkey"], {
      unique: false,
    });

    const tagStore = db.createObjectStore("tags", { keyPath: "id" });

    tagStore.createIndex("eventId", "eventId", { unique: false });
    tagStore.createIndex("typeAndValue", ["type", "value"], {
      unique: false,
    });
  }
}

export interface NClientDB {
  users: {
    key: string;
    value: ProcessedUserBase;
    indexes: {
      user: {
        pubkey: string;
      };
    };
  };
  lists: {
    key: string;
    value: {
      title: string;
      description?: string;
      tags?: string[];
      userPubkeys?: string[];
    };
    indexes: {
      userPubkeys: string[];
    };
  };
  events: {
    key: string;
    value: EventBase;
    indexes: {
      pubkey: string;
      kind: NEVENT_KIND;
      created_at: number;
      kindAndPubkey: [NEVENT_KIND, string];
    };
  };
  tags: {
    key: string;
    value: {
      eventId: string;
      id: string;
      type: string;
      value: string;
    };
    indexes: {
      eventId: string;
      typeAndValue: [string, string];
    };
  };
}
