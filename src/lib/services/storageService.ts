/**
 * storageService.ts — localStorage Persistence
 *
 * Handles serialising and deserialising the project list.
 * Swap this for a real backend by replacing loadProjects / saveProjects.
 */

import type { Project, UserSettings } from '@/lib/types';

const STORAGE_KEY = 'nudge_projects';
const CURRENT_KEY = 'nudge_current_project';

export function loadProjects(): Project[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as Project[];
	} catch {
		console.warn('[Nudge] Failed to load projects from localStorage');
		return [];
	}
}

export function saveProjects(projects: Project[]): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
	} catch {
		console.warn('[Nudge] Failed to save projects to localStorage');
	}
}

export function loadCurrentProjectId(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(CURRENT_KEY);
}

export function saveCurrentProjectId(id: string | null): void {
	if (typeof window === 'undefined') return;
	if (id) {
		localStorage.setItem(CURRENT_KEY, id);
	} else {
		localStorage.removeItem(CURRENT_KEY);
	}
}

const SETTINGS_KEY = 'nudge_settings';

const DEFAULT_SETTINGS: UserSettings = {
	theme: 'warm',
	fontFamily: 'lora',
	fontSize: 'md',
	lineHeight: 'comfortable',
	letterSpacing: 'normal',
	templateDepth: 'guided',
};

export function loadSettings(): UserSettings {
	if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as UserSettings;
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(s: UserSettings): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
	} catch {
		console.warn('[Nudge] Failed to save settings to localStorage');
	}
}

// ── Server sync (async) ───────────────────────────────────────────────────────

export async function fetchProjectsFromServer(): Promise<Project[] | null> {
	try {
		const res = await fetch('/api/projects');
		if (!res.ok) return null;
		const projects = (await res.json()) as Project[];
		localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
		return projects;
	} catch {
		return null; // offline or error — local cache stands
	}
}

export async function syncProjectToServer(project: Project): Promise<void> {
	try {
		await fetch(`/api/projects/${project.id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(project)
		});
	} catch {
		// Silent failure — localStorage copy is intact, will sync next time
	}
}

export async function deleteProjectFromServer(id: string): Promise<void> {
	try {
		await fetch(`/api/projects/${id}`, { method: 'DELETE' });
	} catch {}
}

export async function fetchSettingsFromServer(): Promise<Partial<UserSettings> | null> {
	try {
		const res = await fetch('/api/settings');
		if (!res.ok) return null;
		return (await res.json()) as Partial<UserSettings>;
	} catch {
		return null;
	}
}

export async function syncSettingsToServer(settings: UserSettings): Promise<void> {
	try {
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(settings)
		});
	} catch {}
}
