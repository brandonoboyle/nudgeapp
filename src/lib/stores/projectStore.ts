/**
 * projectStore.ts — Project State (Zustand)
 *
 * All project data lives here. Auto-saves to localStorage on mutation.
 */

import { create } from 'zustand';
import type { Project, NudgeFolder, NudgeFile, Conversation, Message, ProjectCore } from '@/lib/types';
import type { TemplateFolderDef } from '@/lib/types';
import {
	loadProjects,
	saveProjects,
	loadCurrentProjectId,
	saveCurrentProjectId,
	syncProjectToServer,
	deleteProjectFromServer
} from '@/lib/services/storageService';
import { TEMPLATES } from '@/lib/data/templates';

// ── ID generation ─────────────────────────────────────────────────────────────

function uid(): string {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Builder helpers ───────────────────────────────────────────────────────────

function makeConversation(): Conversation {
	return { id: uid(), messages: [] };
}

function makeFile(name: string, content: string): NudgeFile {
	const now = Date.now();
	return { id: uid(), name, content, createdAt: now, updatedAt: now };
}

function makeFolderFromDef(def: TemplateFolderDef, isMaster = false): NudgeFolder {
	return {
		id: uid(),
		name: def.name,
		isMaster,
		isExpanded: false,
		files: (def.files ?? []).map((f) => makeFile(f.name, f.content)),
		children: (def.children ?? []).map((c) => makeFolderFromDef(c))
	};
}

function makeMasterFolder(): NudgeFolder {
	return {
		id: uid(),
		name: 'The Draft',
		isMaster: true,
		isExpanded: true,
		files: [makeFile('Chapter 1.md', '')],
		children: []
	};
}

function buildProjectFromTemplate(name: string, template: typeof TEMPLATES[number]): Project {
	const masterFolder = makeMasterFolder();
	const collaborativeFolders = template.folders.map((f) => makeFolderFromDef(f));
	const now = Date.now();

	return {
		id: uid(),
		name,
		createdAt: now,
		updatedAt: now,
		masterFolder,
		projectFiles: [],
		collaborativeFolders,
		generalConversation: makeConversation(),
		localConversations: {},
		excludedFolderIds: []
	};
}

// ── Recursive folder helpers ──────────────────────────────────────────────────

function updateFileInFolder(folder: NudgeFolder, fileId: string, content: string): boolean {
	for (let i = 0; i < folder.files.length; i++) {
		if (folder.files[i].id === fileId) {
			folder.files[i] = { ...folder.files[i], content, updatedAt: Date.now() };
			return true;
		}
	}
	for (const child of folder.children) {
		if (updateFileInFolder(child, fileId, content)) return true;
	}
	return false;
}

function renameFileInFolder(folder: NudgeFolder, fileId: string, name: string): boolean {
	for (let i = 0; i < folder.files.length; i++) {
		if (folder.files[i].id === fileId) {
			folder.files[i] = { ...folder.files[i], name, updatedAt: Date.now() };
			return true;
		}
	}
	for (const child of folder.children) {
		if (renameFileInFolder(child, fileId, name)) return true;
	}
	return false;
}

function deleteFileInFolder(folder: NudgeFolder, fileId: string): boolean {
	const idx = folder.files.findIndex((f) => f.id === fileId);
	if (idx !== -1) {
		folder.files.splice(idx, 1);
		return true;
	}
	for (const child of folder.children) {
		if (deleteFileInFolder(child, fileId)) return true;
	}
	return false;
}

function addFileToFolder(folder: NudgeFolder, folderId: string, file: NudgeFile): boolean {
	if (folder.id === folderId) {
		folder.files.push(file);
		return true;
	}
	for (const child of folder.children) {
		if (addFileToFolder(child, folderId, file)) return true;
	}
	return false;
}

function addSubfolder(folder: NudgeFolder, parentId: string, child: NudgeFolder): boolean {
	if (folder.id === parentId) {
		folder.children.push(child);
		return true;
	}
	for (const sub of folder.children) {
		if (addSubfolder(sub, parentId, child)) return true;
	}
	return false;
}

function renameFolderInTree(folder: NudgeFolder, folderId: string, name: string): boolean {
	if (folder.id === folderId && !folder.isMaster) {
		folder.name = name;
		return true;
	}
	for (const child of folder.children) {
		if (renameFolderInTree(child, folderId, name)) return true;
	}
	return false;
}

function deleteFolderFromList(folders: NudgeFolder[], folderId: string): NudgeFolder[] {
	return folders
		.filter((f) => f.id !== folderId)
		.map((f) => ({ ...f, children: deleteFolderFromList(f.children, folderId) }));
}

function toggleFolderExpandedInTree(folder: NudgeFolder, folderId: string): boolean {
	if (folder.id === folderId) {
		folder.isExpanded = !folder.isExpanded;
		return true;
	}
	for (const child of folder.children) {
		if (toggleFolderExpandedInTree(child, folderId)) return true;
	}
	return false;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface ProjectState {
	projects: Project[];
	currentProjectId: string | null;

	// Computed
	getCurrentProject: () => Project | null;

	// Init & persistence
	init: () => void;
	hydrateFromServer: (projects: Project[]) => void;

	// Project CRUD
	createProject: (name: string, templateId: string, projectCore?: ProjectCore) => Project;
	switchProject: (id: string) => void;
	deleteProject: (id: string) => void;
	renameProject: (id: string, name: string) => void;

	// File operations
	updateFileContent: (fileId: string, content: string) => void;
	renameFile: (fileId: string, name: string) => void;
	deleteFile: (fileId: string) => void;
	addFile: (folderId: string, name?: string) => NudgeFile | null;

	// Folder operations
	addFolder: (parentId: string | null, name?: string) => NudgeFolder | null;
	renameFolder: (folderId: string, name: string) => void;
	deleteFolder: (folderId: string) => void;
	toggleFolderExpanded: (folderId: string) => void;
	toggleFolderContext: (folderId: string) => void;

	// Conversations
	addMessage: (conversationTarget: 'general' | string, message: Message) => void;
	updateLastAssistantMessage: (conversationTarget: 'general' | string, content: string, options?: { isError?: boolean }) => void;
	removeLastMessage: (conversationTarget: 'general' | string) => void;
	clearConversation: (conversationTarget: 'general' | string) => void;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

// Declared here, assigned once the store is created (see below).
// This avoids closing over a stale `state` snapshot in the debounced sync.
let storeGet: (() => ProjectState) | null = null;

function save(state: { projects: Project[]; currentProjectId: string | null }) {
	saveProjects(state.projects);
	saveCurrentProjectId(state.currentProjectId);

	// Debounced server sync — reads latest state at fire time via get()
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		const latest = storeGet?.();
		if (!latest) return;
		const p = latest.projects.find((proj) => proj.id === latest.currentProjectId);
		if (p) syncProjectToServer(p);
	}, 3000);
}

export const useProjectStore = create<ProjectState>((set, get) => {
storeGet = get;
return ({
	projects: [],
	currentProjectId: null,

	getCurrentProject: () => {
		const { projects, currentProjectId } = get();
		return projects.find((p) => p.id === currentProjectId) ?? null;
	},

	init: () => {
		const projects = loadProjects();
		const saved = loadCurrentProjectId();
		let currentProjectId: string | null = null;

		if (saved && projects.some((p) => p.id === saved)) {
			currentProjectId = saved;
		} else if (projects.length > 0) {
			currentProjectId = projects[0].id;
		}

		set({ projects, currentProjectId });
	},

	hydrateFromServer: (projects) => {
		saveProjects(projects);
		set((state) => {
			const currentExists = projects.find((p) => p.id === state.currentProjectId);
			return {
				projects,
				currentProjectId: currentExists ? state.currentProjectId : (projects[0]?.id ?? null)
			};
		});
	},

	createProject: (name, templateId, projectCore?) => {
		const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
		const project = buildProjectFromTemplate(name, template);

		if (projectCore) {
			const hasContent =
				projectCore.whatHappens.trim() ||
				projectCore.whatItsAbout.trim() ||
				projectCore.protagonist.trim();

			if (hasContent) {
				project.projectCore = projectCore;

				const coreContent = [
					'# Project Core',
					'',
					'## What happens',
					projectCore.whatHappens.trim() || '—',
					'',
					"## What it's really about",
					projectCore.whatItsAbout.trim() || '—',
					'',
					'## At the centre',
					projectCore.protagonist.trim() || '—',
				].join('\n');

				const coreFile = makeFile('Project Core.md', coreContent);
				project.projectFiles = [coreFile];
			}
		}

		set((state) => {
			const newState = {
				projects: [...state.projects, project],
				currentProjectId: project.id
			};
			save(newState);
			return newState;
		});
		return project;
	},

	switchProject: (id) => {
		set({ currentProjectId: id });
		saveCurrentProjectId(id);
	},

	deleteProject: (id) => {
		set((state) => {
			const projects = state.projects.filter((p) => p.id !== id);
			const currentProjectId = state.currentProjectId === id
				? (projects[0]?.id ?? null)
				: state.currentProjectId;
			const newState = { projects, currentProjectId };
			save(newState);
			return newState;
		});
		deleteProjectFromServer(id);
	},

	renameProject: (id, name) => {
		set((state) => {
			const projects = state.projects.map((p) =>
				p.id === id ? { ...p, name, updatedAt: Date.now() } : p
			);
			const newState = { ...state, projects };
			save(newState);
			return { projects };
		});
	},

	updateFileContent: (fileId, content) => {
		const p = get().getCurrentProject();
		if (!p) return;
		const projIdx = (p.projectFiles ?? []).findIndex((f) => f.id === fileId);
		if (projIdx !== -1) {
			p.projectFiles[projIdx] = { ...p.projectFiles[projIdx], content, updatedAt: Date.now() };
		} else {
			updateFileInFolder(p.masterFolder, fileId, content) ||
				p.collaborativeFolders.some((f) => updateFileInFolder(f, fileId, content));
		}
		p.updatedAt = Date.now();
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	renameFile: (fileId, name) => {
		const p = get().getCurrentProject();
		if (!p) return;
		const projIdx = (p.projectFiles ?? []).findIndex((f) => f.id === fileId);
		if (projIdx !== -1) {
			p.projectFiles[projIdx] = { ...p.projectFiles[projIdx], name, updatedAt: Date.now() };
		} else {
			renameFileInFolder(p.masterFolder, fileId, name) ||
				p.collaborativeFolders.some((f) => renameFileInFolder(f, fileId, name));
		}
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	deleteFile: (fileId) => {
		const p = get().getCurrentProject();
		if (!p) return;
		const projIdx = (p.projectFiles ?? []).findIndex((f) => f.id === fileId);
		if (projIdx !== -1) {
			p.projectFiles.splice(projIdx, 1);
		} else {
			deleteFileInFolder(p.masterFolder, fileId) ||
				p.collaborativeFolders.some((f) => deleteFileInFolder(f, fileId));
		}
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	addFile: (folderId, name = 'Untitled.md') => {
		const p = get().getCurrentProject();
		if (!p) return null;
		const file = makeFile(name, '');
		addFileToFolder(p.masterFolder, folderId, file) ||
			p.collaborativeFolders.some((f) => addFileToFolder(f, folderId, file));
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
		return file;
	},

	addFolder: (parentId, name = 'New Folder') => {
		const p = get().getCurrentProject();
		if (!p) return null;
		const folder: NudgeFolder = {
			id: uid(),
			name,
			isMaster: false,
			isExpanded: true,
			files: [],
			children: []
		};
		if (parentId === null) {
			p.collaborativeFolders = [...p.collaborativeFolders, folder];
		} else {
			p.collaborativeFolders.some((f) => addSubfolder(f, parentId, folder));
		}
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
		return folder;
	},

	renameFolder: (folderId, name) => {
		const p = get().getCurrentProject();
		if (!p) return;
		p.collaborativeFolders.some((f) => renameFolderInTree(f, folderId, name));
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	deleteFolder: (folderId) => {
		const p = get().getCurrentProject();
		if (!p) return;
		p.collaborativeFolders = deleteFolderFromList(p.collaborativeFolders, folderId);
		p.excludedFolderIds = p.excludedFolderIds.filter((id) => id !== folderId);
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	toggleFolderExpanded: (folderId) => {
		const p = get().getCurrentProject();
		if (!p) return;
		toggleFolderExpandedInTree(p.masterFolder, folderId) ||
			p.collaborativeFolders.some((f) => toggleFolderExpandedInTree(f, folderId));
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	toggleFolderContext: (folderId) => {
		const p = get().getCurrentProject();
		if (!p) return;
		p.excludedFolderIds = p.excludedFolderIds.includes(folderId)
			? p.excludedFolderIds.filter((id) => id !== folderId)
			: [...p.excludedFolderIds, folderId];
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	addMessage: (conversationTarget, message) => {
		const p = get().getCurrentProject();
		if (!p) return;

		if (conversationTarget === 'general') {
			p.generalConversation.messages = [...p.generalConversation.messages, message];
		} else {
			if (!p.localConversations[conversationTarget]) {
				p.localConversations[conversationTarget] = makeConversation();
			}
			p.localConversations[conversationTarget].messages = [
				...p.localConversations[conversationTarget].messages,
				message
			];
		}
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	updateLastAssistantMessage: (conversationTarget, content, options = {}) => {
		const p = get().getCurrentProject();
		if (!p) return;

		const conv =
			conversationTarget === 'general'
				? p.generalConversation
				: p.localConversations[conversationTarget];

		if (!conv) return;

		const msgs = conv.messages;
		if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
			msgs[msgs.length - 1] = {
				...msgs[msgs.length - 1],
				content,
				isStreaming: false,
				...(options.isError && { isError: true })
			};
			set((state) => {
				save(state);
				return { projects: [...state.projects] };
			});
		}
	},

	removeLastMessage: (conversationTarget) => {
		const p = get().getCurrentProject();
		if (!p) return;

		const conv =
			conversationTarget === 'general'
				? p.generalConversation
				: p.localConversations[conversationTarget];

		if (!conv || conv.messages.length === 0) return;
		conv.messages = conv.messages.slice(0, -1);
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	},

	clearConversation: (conversationTarget) => {
		const p = get().getCurrentProject();
		if (!p) return;
		if (conversationTarget === 'general') {
			p.generalConversation = makeConversation();
		} else {
			p.localConversations[conversationTarget] = makeConversation();
		}
		set((state) => {
			save(state);
			return { projects: [...state.projects] };
		});
	}
});
});

// Re-export templates for convenience
export { TEMPLATES };

/**
 * Selector hook for the current project. Uses a stable selector that only
 * triggers re-renders when the current project identity actually changes,
 * rather than on every state mutation.
 */
export function useCurrentProject(): Project | null {
	return useProjectStore((s) =>
		s.projects.find((p) => p.id === s.currentProjectId) ?? null
	);
}
