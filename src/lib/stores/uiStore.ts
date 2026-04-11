/**
 * uiStore.ts — UI State (Zustand)
 */

import { create } from 'zustand';
import type { SaveState } from '@/lib/types';

interface UIState {
	currentFileId: string | null;
	currentFolderId: string | null;
	isInMasterFolder: boolean;
	saveState: SaveState;
	showNewProjectOverlay: boolean;

	selectFile: (fileId: string, folderId: string, inMaster: boolean) => void;
	selectFolder: (folderId: string, inMaster: boolean) => void;
	setSaveState: (state: SaveState) => void;
	setShowNewProjectOverlay: (show: boolean) => void;
}

let saveStateTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIState>((set, get) => ({
	currentFileId: null,
	currentFolderId: null,
	isInMasterFolder: false,
	saveState: 'idle',
	showNewProjectOverlay: false,

	selectFile: (fileId, folderId, inMaster) => {
		set({ currentFileId: fileId, currentFolderId: folderId, isInMasterFolder: inMaster });
	},

	selectFolder: (folderId, inMaster) => {
		set({ currentFolderId: folderId, isInMasterFolder: inMaster });
	},

	setSaveState: (state) => {
		set({ saveState: state });
		if (state === 'saved') {
			if (saveStateTimer) clearTimeout(saveStateTimer);
			saveStateTimer = setTimeout(() => {
				if (get().saveState === 'saved') set({ saveState: 'idle' });
			}, 2500);
		}
	},

	setShowNewProjectOverlay: (show) => {
		set({ showNewProjectOverlay: show });
	}
}));
