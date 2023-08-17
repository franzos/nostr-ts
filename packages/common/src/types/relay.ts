import { RelayInformationDocument } from "../";

export interface Relay {
  url: string;
  read: boolean;
  write: boolean;
}

export interface DiscoveredRelay extends Relay {
  info: RelayInformationDocument;
}

export interface DiscoveredRelayWithError extends Relay {
  error?: string;
}
