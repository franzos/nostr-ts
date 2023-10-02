export enum INTEGRATION_PROVIDER {
  SATTELITE_CDN = "sattelite_cdn",
}

export interface Integration {
  kind: INTEGRATION_PROVIDER;
}

export interface StorageIntegrationProvider extends Integration {
  expiresOn: number;
  credit: number;
  storageTotal: number;
  storageRemaining: number;
}

export interface SatteliteCDNIntegration extends StorageIntegrationProvider {
  kind: INTEGRATION_PROVIDER.SATTELITE_CDN;
}
