import { create } from "zustand";

export type NewEventsBehavior = "sorted" | "top";

export interface AppSettings {
  // How long to wait before showing loading bar (in ms)
  lastRequestDelay: number;
  // How long to show loading bar (in ms)
  loadingDuration: number;
  // How to add new events when clicking "new events" button
  newEventsBehavior: NewEventsBehavior;
  // Character limit for truncating long event content (0 = disabled)
  contentTruncateLimit: number;
}

export interface SettingsState extends AppSettings {
  updateSettings: (settings: Partial<AppSettings>) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  lastRequestDelay: 30000, // 30 seconds
  loadingDuration: 2000, // 2 seconds
  newEventsBehavior: "sorted",
  contentTruncateLimit: 500, // 500 characters
};

const STORAGE_KEY = "nostr-client-settings";

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,

  updateSettings: (settings: Partial<AppSettings>) => {
    set(settings);
    get().saveSettings();
  },

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettings;
        set(parsed);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  saveSettings: () => {
    try {
      const settings: AppSettings = {
        lastRequestDelay: get().lastRequestDelay,
        loadingDuration: get().loadingDuration,
        newEventsBehavior: get().newEventsBehavior,
        contentTruncateLimit: get().contentTruncateLimit,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },
}));