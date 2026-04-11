/**
 * settingsStore.ts — User Settings State (Zustand)
 */

import { create } from 'zustand';
import type { UserSettings } from '@/lib/types';
import { loadSettings, saveSettings, syncSettingsToServer } from '@/lib/services/storageService';

interface SettingsState {
	settings: UserSettings;
	update: (patch: Partial<UserSettings>) => void;
	hydrateFromServer: (serverSettings: Partial<UserSettings>) => void;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
	settings: loadSettings(),

	update: (patch) => {
		const newSettings = { ...get().settings, ...patch };
		set({ settings: newSettings });
		saveSettings(newSettings);
		if (syncTimer) clearTimeout(syncTimer);
		syncTimer = setTimeout(() => syncSettingsToServer(newSettings), 3000);
	},

	hydrateFromServer: (serverSettings) => {
		const newSettings = { ...get().settings, ...serverSettings };
		set({ settings: newSettings });
		saveSettings(newSettings);
	}
}));
