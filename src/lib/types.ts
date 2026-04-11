// ============================================================
// NUDGE — Core Type Definitions
// ============================================================

export interface NudgeFile {
	id: string;
	name: string;
	content: string;
	createdAt: number;
	updatedAt: number;
}

export interface NudgeFolder {
	id: string;
	name: string;
	isMaster: boolean;
	isExpanded: boolean;
	files: NudgeFile[];
	children: NudgeFolder[];
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
	isError?: boolean;
}

export interface Conversation {
	id: string;
	messages: Message[];
}

export interface ProjectCore {
	whatHappens: string;
	whatItsAbout: string;
	protagonist: string;
}

export interface Project {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	masterFolder: NudgeFolder;
	projectFiles: NudgeFile[];
	collaborativeFolders: NudgeFolder[];
	generalConversation: Conversation;
	localConversations: Record<string, Conversation>;
	projectCore?: ProjectCore;
	excludedFolderIds: string[];
}

export type SaveState = 'idle' | 'saving' | 'saved';

export interface Template {
	id: string;
	name: string;
	tagline: string;
	folders: TemplateFolderDef[];
}

export interface TemplateFolderDef {
	name: string;
	files?: TemplateFileDef[];
	children?: TemplateFolderDef[];
}

export interface TemplateFileDef {
	name: string;
	content: string;
}

export type TemplateDepth = 'blank' | 'guided' | 'full';

export interface WordCountGoal {
	target: number;
	period: 'session' | 'day' | 'week';
}

export interface DailyWritingRecord {
	date: string; // YYYY-MM-DD
	wordsWritten: number;
}

export interface WritingStats {
	dailyRecords: DailyWritingRecord[];
	sessionStartWordCount: number;
	sessionWordsWritten: number;
	lastActiveDate: string | null; // YYYY-MM-DD
	currentStreak: number;
	goalCelebratedThisPeriod: boolean;
}

export interface UserSettings {
	theme: 'warm' | 'slate' | 'dusk' | 'ink';
	fontFamily: 'lora' | 'georgia' | 'merriweather' | 'system' | 'atkinson';
	fontSize: 'sm' | 'md' | 'lg' | 'xl';
	lineHeight: 'compact' | 'comfortable' | 'spacious';
	letterSpacing: 'normal' | 'wide' | 'wider';
	templateDepth: TemplateDepth;
	wordCountGoal?: WordCountGoal;
}

export interface AIMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}
