export interface RelayUpdateOptions {
  isEnabled?: boolean;
  read?: boolean;
  write?: boolean;
}

export interface RequestInformationPayload {
  source: "users" | "events" | "events:related";
  idsOrKeys: string[];
}