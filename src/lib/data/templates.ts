import type { Template } from '@/lib/types';

export const TEMPLATES: Template[] = [
	{
		id: 'fantasy',
		name: 'Fantasy Novel',
		tagline: 'Epic worlds, deep magic, unforgettable characters.',
		folders: [
			{ name: 'Characters', files: [] },
			{ name: 'World & Setting', files: [] },
			{ name: 'Magic & Systems', files: [] },
			{ name: 'Lore & History', files: [] },
			{ name: 'Plot & Outline', files: [] },
			{ name: 'Themes & Tone', files: [] },
			{ name: 'Research & Notes', files: [] },
			{ name: 'Scratchpad', files: [] }
		]
	},
	{
		id: 'literary',
		name: 'Literary Fiction',
		tagline: 'Character-driven, idea-rich, deeply felt.',
		folders: [
			{ name: 'Characters', files: [] },
			{ name: 'Setting & Place', files: [] },
			{ name: 'Themes & Ideas', files: [] },
			{ name: 'Voice & Style', files: [] },
			{ name: 'Plot & Structure', files: [] },
			{ name: 'Research & Notes', files: [] },
			{ name: 'Scratchpad', files: [] }
		]
	},
	{
		id: 'mystery',
		name: 'Mystery & Thriller',
		tagline: 'Tension, misdirection, and the satisfaction of revelation.',
		folders: [
			{ name: 'Characters', files: [] },
			{ name: 'Setting & Atmosphere', files: [] },
			{ name: 'The Case & Plot', files: [] },
			{ name: 'Timeline', files: [] },
			{ name: 'Clues & Evidence', files: [] },
			{ name: 'Themes & Tone', files: [] },
			{ name: 'Scratchpad', files: [] }
		]
	},
	{
		id: 'essay',
		name: 'Essay & Nonfiction',
		tagline: 'Personal essays, video essays, memoir, and long-form nonfiction.',
		folders: [
			{ name: 'Subject & Argument', files: [] },
			{ name: 'Material & Research', files: [] },
			{ name: 'Voice & Perspective', files: [] },
			{ name: 'Structure & Arc', files: [] },
			{ name: 'Themes & Ideas', files: [] },
			{ name: 'Scratchpad', files: [] }
		]
	},
	{
		id: 'ttrpg',
		name: 'Tabletop RPG',
		tagline: 'Build worlds, forge parties, run campaigns.',
		folders: [
			{ name: 'Party & Characters', files: [] },
			{ name: 'NPCs & Villains', files: [] },
			{ name: 'World & Locations', files: [] },
			{ name: 'Factions & Powers', files: [] },
			{ name: 'Campaign & Quests', files: [] },
			{ name: 'Lore & History', files: [] },
			{ name: 'Sessions', files: [] },
			{ name: 'Scratchpad', files: [] }
		]
	},
	{
		id: 'blank',
		name: 'Blank',
		tagline: 'Start from nothing. Build what you need.',
		folders: [
			{ name: 'Scratchpad', files: [] }
		]
	}
];
