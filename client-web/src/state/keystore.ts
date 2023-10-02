interface NClientKeystore {
  keystore: "none" | "localstore" | "nos2x" | "download";
  publicKey?: string;
  privateKey?: string;
}

export interface NClientNoStore extends NClientKeystore {
  keystore: "none";
}

export interface NClientLocalStore extends NClientKeystore {
  keystore: "localstore";
  publicKey: string;
}

export interface NClientNos2xStore extends NClientKeystore {
  keystore: "nos2x";
  publicKey: string;
}

export function loadKeyStoreConfig():
  | NClientLocalStore
  | NClientNos2xStore
  | NClientNoStore {
  const keystore = localStorage.getItem("nostr-client:keystore:keystore");
  if (keystore) {
    if (keystore === "localstore") {
      const publicKey = localStorage.getItem(
        "nostr-client:keystore:public-key"
      );
      const privateKey = localStorage.getItem(
        "nostr-client:keystore:private-key"
      );
      if (publicKey && privateKey) {
        return {
          keystore: "localstore",
          publicKey,
          privateKey,
        };
      }
    } else if (keystore === "nos2x") {
      const publicKey = localStorage.getItem(
        "nostr-client:keystore:public-key"
      );
      if (publicKey) {
        return {
          keystore: "nos2x",
          publicKey: publicKey,
          privateKey: undefined,
        };
      }
    }
  }
  return {
    keystore: "none",
    publicKey: undefined,
    privateKey: undefined,
  };
}

export function saveKeyStoreConfig(config: NClientKeystore) {
  localStorage.setItem("nostr-client:keystore:keystore", config.keystore);
  if (
    config.keystore === "localstore" &&
    config.publicKey &&
    config.privateKey
  ) {
    localStorage.setItem("nostr-client:keystore:public-key", config.publicKey);
    localStorage.setItem(
      "nostr-client:keystore:private-key",
      config.privateKey
    );
  } else if (config.keystore === "nos2x") {
    // TODO: Implement
  } else if (config.keystore === "download") {
    // TODO: Implement
  }
}
