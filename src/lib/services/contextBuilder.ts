/**
 * contextBuilder.ts — AI Context Assembly
 *
 * Assembles context from collaborative folders for injection into system prompts.
 * ARCHITECTURAL GUARANTEE: Master folder content is NEVER included.
 * This function only accepts collaborativeFolders — master folder is not a parameter.
 */

import type { NudgeFolder, NudgeFile, ProjectCore } from '@/lib/types';

const MAX_CONTEXT_CHARS = 14000; // ~3500 tokens — conservative budget

// Priority order for context inclusion when truncation is needed
const PRIORITY_KEYWORDS = [
	'character',
	'protagonist',
	'world',
	'setting',
	'magic',
	'system',
	'plot',
	'outline',
	'theme',
	'lore',
	'history'
];

function formatProjectCore(core: ProjectCore): string {
	const lines: string[] = [];
	if (core.whatHappens.trim()) lines.push(`**What happens:** ${core.whatHappens.trim()}`);
	if (core.whatItsAbout.trim()) lines.push(`**What it's really about:** ${core.whatItsAbout.trim()}`);
	if (core.protagonist.trim()) lines.push(`**At the centre:** ${core.protagonist.trim()}`);
	if (lines.length === 0) return '';
	return ['# Project Core', ...lines].join('\n\n');
}

function folderPriority(folderName: string): number {
	const lower = folderName.toLowerCase();
	for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
		if (lower.includes(PRIORITY_KEYWORDS[i])) return i;
	}
	return PRIORITY_KEYWORDS.length; // Low priority = last
}

function formatFile(file: NudgeFile): string {
	if (!file.content.trim()) return '';
	return `### ${file.name.replace(/\.md$/, '')}\n\n${file.content.trim()}`;
}

function formatFolder(folder: NudgeFolder, depth = 0): string {
	const prefix = '#'.repeat(Math.min(depth + 2, 4));
	const parts: string[] = [`${prefix} ${folder.name}`];

	const fileContent = folder.files.map(formatFile).filter(Boolean).join('\n\n');
	if (fileContent) parts.push(fileContent);

	for (const child of folder.children) {
		const childContent = formatFolder(child, depth + 1);
		if (childContent) parts.push(childContent);
	}

	return parts.join('\n\n');
}

/**
 * Build global context from ALL collaborative folders.
 * NEVER pass the master folder here — this is enforced by the function signature.
 * projectCore is prepended as a stable story anchor so the AI always knows the "what, about, who".
 */
export function buildGlobalContext(
	collaborativeFolders: NudgeFolder[],
	projectCore?: ProjectCore,
	excludedFolderIds?: string[]
): string {
	const parts: string[] = [];

	// Project Core is always first — stable anchor even when no collab files exist
	if (projectCore) {
		const coreText = formatProjectCore(projectCore);
		if (coreText) parts.push(coreText);
	}

	// Filter out folders the user has toggled off
	const included = excludedFolderIds?.length
		? collaborativeFolders.filter((f) => !excludedFolderIds.includes(f.id))
		: collaborativeFolders;

	if (included.length === 0) return parts.join('\n\n');

	// Sort by priority
	const sorted = [...included].sort(
		(a, b) => folderPriority(a.name) - folderPriority(b.name)
	);

	parts.push('# Project World Bible');

	let totalChars = parts.join('\n\n').length;

	for (const folder of sorted) {
		const folderText = formatFolder(folder);
		if (!folderText.trim()) continue;

		if (totalChars + folderText.length > MAX_CONTEXT_CHARS) {
			// Truncate this folder's content
			const remaining = MAX_CONTEXT_CHARS - totalChars - 100;
			if (remaining > 200) {
				parts.push(folderText.slice(0, remaining) + '\n\n[...truncated]');
			}
			break;
		}

		parts.push(folderText);
		totalChars += folderText.length;
	}

	return parts.join('\n\n');
}

/**
 * Build local context for the current folder.
 * Used when chat mode is 'local'.
 * NEVER pass the master folder here.
 */
export function buildLocalContext(
	currentFolder: NudgeFolder,
	collaborativeFolders: NudgeFolder[],
	projectCore?: ProjectCore,
	excludedFolderIds?: string[]
): string {
	const globalContext = buildGlobalContext(collaborativeFolders, projectCore, excludedFolderIds);
	const localFolder = formatFolder(currentFolder);

	if (!localFolder.trim()) return globalContext;

	return `${globalContext}\n\n---\n\n# Currently Viewing: ${currentFolder.name}\n\n${localFolder}`;
}

/**
 * Find a folder by ID within a list of collaborative folders (recursive).
 * Used to find the current folder for local context.
 */
export function findFolderById(
	folders: NudgeFolder[],
	id: string
): NudgeFolder | null {
	for (const folder of folders) {
		if (folder.id === id) return folder;
		const found = findFolderById(folder.children, id);
		if (found) return found;
	}
	return null;
}

/**
 * Check if a folder ID belongs to the master folder tree.
 * Used as a safety check — never pass these IDs into context builders.
 */
export function isMasterFolderDescendant(
	masterFolder: NudgeFolder,
	folderId: string
): boolean {
	if (masterFolder.id === folderId) return true;
	return masterFolder.children.some((child) =>
		isMasterFolderDescendant(child, folderId)
	);
}
