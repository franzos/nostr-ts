import { writeFile, access, readFile } from "fs/promises";
import {
  eventHasRelayRecommendation,
  EVENT_KIND,
  Event,
  RelayInformationDocument,
} from "@nostr-ts/common";
import { getRelayInformationDocument } from "./relay-information.js";
import { RelayEvent } from "@nostr-ts/common";
import { RELAY_MESSAGE_TYPE } from "@nostr-ts/common";

export interface DisoveredRelay {
  url: string;
  info: RelayInformationDocument;
}

export class RelayDiscovery {
  public recommendedRelays: Event[] = [];
  public discoveredRelays: DisoveredRelay[] = [];
  private relayUrlsWithError: string[] = [];

  constructor() {
    this.recommendedRelays = [];
    this.discoveredRelays = [];
  }

  private exists(url: string): boolean {
    const discovered =
      this.discoveredRelays.find((r) => r.url === url) !== undefined;
    const errors = this.relayUrlsWithError.find((r) => r === url) !== undefined;
    return discovered || errors;
  }

  public async add(event: RelayEvent) {
    if (!event) return;
    if (event[0] !== RELAY_MESSAGE_TYPE.EVENT) return;
    const eventData = event[2] as Event;
    if (eventData.kind != EVENT_KIND.RECOMMEND_RELAY) {
      return;
    }
    const relayUrl = eventHasRelayRecommendation(eventData);
    if (relayUrl && !this.exists(relayUrl)) {
      try {
        const info = await getRelayInformationDocument(relayUrl);
        console.log("=> Adding relay ...", relayUrl);
        this.recommendedRelays.push(eventData);
        this.discoveredRelays.push({ url: relayUrl, info });
      } catch (e) {
        this.relayUrlsWithError.push(relayUrl);
      }
    }
  }

  public async saveToFile(path?: string) {
    const filePath = path ? path : "./discovered-relays.json";
    let existingData: DisoveredRelay[] = [];

    try {
      await access(filePath);

      const fileContent = await readFile(filePath, "utf-8");

      existingData = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or other error occurred, ignore and use empty array
    }

    // Merge existing data with new ones, filter duplicates by URL
    const mergedData = [...this.discoveredRelays, ...existingData];
    const uniqueData = mergedData.filter(
      (relay, index, self) =>
        index === self.findIndex((r) => r.url === relay.url)
    );

    // Write the unique data back to the file
    await writeFile(filePath, JSON.stringify(uniqueData, null, 2));
  }
}
