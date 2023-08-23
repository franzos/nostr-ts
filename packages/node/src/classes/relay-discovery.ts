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
import { getRelayInformationDocument } from "../utils/relay-information";
import {
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayNotice,
  RelayOK,
} from "@nostr-ts/common";

/**
 * The RelayDiscovery is responsible for discovering relays and storing them in a file.
 * To load existing relays, you can use the loadFromFile method.
 *
 * By default there's two files:
 * - discovered-relays.json: contains the relays that were successfully discovered
 * - discovered-relays-error.json: contains the relays that failed to be discovered
 */
export class RelayDiscovery {
  public recommendedRelays: string[] = [];
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
    // check if in discoveredRelays or discoveredRelaysWithErrors
    return (
      this.recommendedRelays.some((relay) => relay === url) ||
      this.discoveredRelays.some((relay) => relay.url === url) ||
      this.discoveredRelaysWithErrors.some((relay) => relay.url === url)
    );
  }

  public async add(
    event:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK
  ) {
    if (!event) return;
    if (event[0] !== RELAY_MESSAGE_TYPE.EVENT) return;
    const eventData = event[2] as EventBase;
    if (eventData.kind != NEVENT_KIND.RECOMMEND_RELAY) {
      return;
    }
    const relayUrl = eventHasRelayRecommendation(eventData);
    if (relayUrl && !this.exists(relayUrl)) {
      this.recommendedRelays.push(relayUrl);
      try {
        const info = await getRelayInformationDocument(relayUrl);
        this.discoveredRelays.push({
          url: relayUrl,
          info,
          read: true,
          write: true,
        });
      } catch (e) {
        this.discoveredRelaysWithErrors.push({
          url: relayUrl,
          read: true,
          write: true,
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
   */
  public async saveToFile() {
    try {
      await writeFile(
        this.discoveredRelaysPath,
        JSON.stringify(this.discoveredRelays, null, 2)
      );
    } catch (error) {
      console.error("Error saving discoveredRelays to file:", error);
    }

    try {
      await writeFile(
        this.errorsFilePath,
        JSON.stringify(this.discoveredRelaysWithErrors, null, 2)
      );
    } catch (error) {
      console.error("Error saving discoveredRelaysWithErrors to file:", error);
    }
  }
}
