/**
 * scaffolds.ts — New file starter content
 *
 * When a user creates a new file in a collab folder, the content is scaffolded
 * based on the templateDepth setting and the folder's detected category.
 * Master folder files are always blank — this is enforced in FolderTree.
 */

import type { TemplateDepth } from '@/lib/types';

type FolderCategory =
	| 'character'
	| 'world'
	| 'plot'
	| 'theme'
	| 'research'
	| 'npc'
	| 'faction'
	| 'quest'
	| 'generic';

function categorize(folderName: string): FolderCategory {
	const lower = folderName.toLowerCase();
	if (/character|people|person|cast|key people|party/.test(lower)) return 'character';
	if (/world|setting|place|location|geography|atmosphere|environment|dungeon|region|realm|plane/.test(lower)) return 'world';
	if (/plot|outline|structure|scene|chapter|case|arc|timeline/.test(lower)) return 'plot';
	if (/theme|idea|voice|tone|style|meaning/.test(lower)) return 'theme';
	if (/research|lore|history|context|clue|evidence|memory|memories|material|notes/.test(lower)) return 'research';
	if (/npc|villain|antagonist|foe|enemy|enemies|ally|allies|monster/.test(lower)) return 'npc';
	if (/faction|organization|guild|house|cult|order|clan|kingdom|empire|power/.test(lower)) return 'faction';
	if (/quest|campaign|adventure|hook|session|mission|encounter/.test(lower)) return 'quest';
	return 'generic';
}

const SCAFFOLDS: Record<FolderCategory, Record<'guided' | 'full', string>> = {
	character: {
		guided: `**Who they are:**

**What they want:**

**What they're hiding:**
`,
		full: `## At a glance
**Role in the story:**
**Age:**
**First impression:**

## Inner life
**What they want (surface):**
**What they really want:**
**What they're afraid of:**
**What they're hiding:**
**Their central contradiction:**

## Background
**Where they come from:**
**The moment that shaped them:**

## Relationships
**Connection to the protagonist:**
**Who they love, fear, or owe:**

## Voice
**How they speak:**
**A mannerism or tell:**

## Arc
**Where they start:**
**What changes them:**
**Where they end:**
`
	},

	world: {
		guided: `**What it looks and feels like:**

**Why it matters to the story:**

**History or context:**
`,
		full: `## First impression
**What a newcomer sees, hears, smells:**

## The physical world
**Geography and layout:**
**Key locations within it:**

## People and culture
**Who lives here:**
**What they value:**
**How power works:**

## History
**How it came to be:**
**What happened here that still echoes:**

## Story function
**Why this place matters:**
**How it shapes the people in it:**
`
	},

	plot: {
		guided: `**What happens:**

**What changes by the end:**

**Why this moment matters:**
`,
		full: `## Setup
**Setting:**
**Characters present:**
**What each character wants:**

## What happens

## Under the surface
**What the real conflict is:**
**What isn't said:**

## Change
**What's different by the end:**
**What the reader now understands:**

## Notes
**To foreshadow:**
**To callback:**
`
	},

	theme: {
		guided: `**What this is really about:**

**How it shows up in the story:**

**The question it's asking:**
`,
		full: `## The core
**What this theme is:**
**The question it asks (not necessarily answers):**

## How it manifests
**In the plot:**
**In the characters:**
**In the setting:**

## Tensions
**What complicates this theme:**
**Where characters are in conflict with it:**

## The emotional truth underneath:
`
	},

	research: {
		guided: `**Key information:**

**How it connects to the story:**

**Questions still open:**
`,
		full: `## Overview

## Key details

## Connections to the story

## Sources

## Open questions
`
	},

	npc: {
		guided: `**Who they are and what they want:**

**What they're hiding:**

**How they treat the party:**
`,
		full: `## At a glance
**Role:**
**Affiliation:**
**First impression:**

## Motivations
**What they want:**
**What they fear:**
**What they're willing to do:**

## Secrets
**What they're hiding:**
**Who else knows:**

## Relationship to the party
**Initial disposition:**
**What could shift it:**

## Voice
**How they speak:**
**A mannerism or tell:**
`
	},

	faction: {
		guided: `**What they are and what they want:**

**How they treat outsiders:**

**Their relationship to the party:**
`,
		full: `## What they are
**Purpose and ideology:**
**Leadership:**
**Reach and resources:**

## Goals
**What they want:**
**What they're willing to do to get it:**

## Secrets
**What they're hiding:**
**Their vulnerabilities:**

## Relationship to the party
**Initial stance:**
**What could make them an ally:**
**What could make them an enemy:**

## Key members
`
	},

	quest: {
		guided: `**The hook:**

**What's actually at stake:**

**How it connects to the larger campaign:**
`,
		full: `## The hook
**What draws the party in:**
**Who issues it (if anyone):**

## The truth
**What's really going on:**
**What the party may not know yet:**

## Stakes
**What happens if they succeed:**
**What happens if they fail:**

## Key locations

## Key NPCs

## Complications
**Twists and revelations:**

## Connections
**How this ties to the main campaign:**
**What threads it opens:**
`
	},

	generic: {
		guided: `**The main idea:**

**Why it matters:**

**Questions to explore:**
`,
		full: `## Overview

## Key points

## Connections to the story

## Open threads
`
	}
};

/**
 * Returns starter content for a new file based on the parent folder's name
 * and the user's templateDepth setting. Returns '' for 'blank' depth.
 */
export function getScaffoldContent(folderName: string, depth: TemplateDepth): string {
	if (depth === 'blank') return '';
	const category = categorize(folderName);
	return SCAFFOLDS[category][depth];
}
