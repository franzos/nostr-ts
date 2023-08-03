import { writeFile, readFile } from "fs/promises";
import {
  eventHasRelayRecommendation,
  NEVENT_KIND,
  EventBase,
  RelayEvent,
  RELAY_MESSAGE_TYPE,
  DiscoveredRelay,
  DiscoveredRelayWithError,
} from "@nostr-ts/common";
import { getRelayInformationDocument } from "../utils/relay-information.js";

/**
 * The RelayDiscovery is responsible for discovering relays and storing them in a file.
 * To load existing relays, you can use the loadFromFile method.
 *
 * By default there's two files:
 * - discovered-relays.json: contains the relays that were successfully discovered
 * - discovered-relays-error.json: contains the relays that failed to be discovered
 */
export class RelayDiscovery {
  public recommendedRelays: EventBase[] = [];
  public discoveredRelays: DiscoveredRelay[] = [];
  public discoveredRelaysWithErrors: DiscoveredRelayWithError[] = [];

  /**
   * The path to the discovered relays file
   */
  private discoveredRelaysPath: string;
  /**
   * The path to the discovered relays with errors file
   */
  private errorsFilePath: string;

  constructor(discoveredFilePath?: string) {
    this.recommendedRelays = [];
    this.discoveredRelays = [];
    this.discoveredRelaysWithErrors = [];

    this.setPath(discoveredFilePath);
  }

  private setPath(discoveredRelaysPath?: string) {
    this.discoveredRelaysPath =
      discoveredRelaysPath || "discovered-relays.json";
    this.errorsFilePath =
      this.discoveredRelaysPath.split(".json")[0] + "-error.json";
  }

  private exists(url: string): boolean {
    const discovered =
      this.discoveredRelays.find((r) => r.url === url) !== undefined;
    const errors =
      this.discoveredRelaysWithErrors.find((r) => r.url === url) !== undefined;
    return discovered || errors;
  }

  public async add(event: RelayEvent) {
    if (!event) return;
    if (event[0] !== RELAY_MESSAGE_TYPE.EVENT) return;
    const eventData = event[2] as EventBase;
    if (eventData.kind != NEVENT_KIND.RECOMMEND_RELAY) {
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
        this.discoveredRelaysWithErrors.push({
          url: relayUrl,
        });
      }
    }
  }

  public get() {
    return this.discoveredRelays;
  }

  /**
   * Attempts to load discovered relays and previously found relays with errors
   * This will replace existing data.
   */
  public async loadFromFile() {
    try {
      const fileContent = await readFile(this.discoveredRelaysPath, "utf-8");
      this.discoveredRelays = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading file ${this.discoveredRelaysPath}:`, error);
    }

    try {
      const errorFileContent = await readFile(this.errorsFilePath, "utf-8");
      this.discoveredRelaysWithErrors = JSON.parse(errorFileContent);
    } catch (error) {
      console.error(`Error reading file ${this.errorsFilePath}:`, error);
    }
  }

  /**
   * Saves discovered relays and relays with errors
   * This will try to merge existing data.
   */
  public async saveToFile() {
    // TODO: It might be more predictable not to merge data
    // It should be safe to assume the user loads previous data first?
    const uniqueDiscoveredRelays = this.mergeUnique(this.discoveredRelays);
    const uniqueDiscoveredRelaysWithErrors = this.mergeUnique(
      this.discoveredRelaysWithErrors
    );

    await writeFile(
      this.discoveredRelaysPath,
      JSON.stringify(uniqueDiscoveredRelays, null, 2)
    );
    await writeFile(
      this.discoveredRelaysPath,
      JSON.stringify(uniqueDiscoveredRelaysWithErrors, null, 2)
    );
  }

  private mergeUnique(relays: any[]) {
    return relays.filter(
      (relay, index, self) =>
        index === self.findIndex((r) => r.url === relay.url)
    );
  }
}
