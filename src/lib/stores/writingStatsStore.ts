/**
 * writingStatsStore.ts — Tracks word count progress and streaks (Zustand)
 *
 * Each editor reports its initial word count on mount and current count on change.
 * The store accumulates net new words (only counting increases, not deletions).
 * Persists daily records to localStorage. Calculates consecutive-day streaks.
 */

import { create } from 'zustand';
import type { WritingStats, WordCountGoal } from '@/lib/types';

const STATS_KEY = 'nudge_writing_stats';

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function startOfWeek(): string {
	const d = new Date();
	d.setDate(d.getDate() - d.getDay());
	d.setHours(0, 0, 0, 0);
	return d.toISOString().slice(0, 10);
}

function defaultStats(): WritingStats {
	return {
		dailyRecords: [],
		sessionStartWordCount: 0,
		sessionWordsWritten: 0,
		lastActiveDate: null,
		currentStreak: 0,
		goalCelebratedThisPeriod: false,
	};
}

function loadStats(): WritingStats {
	if (typeof window === 'undefined') return defaultStats();
	try {
		const raw = localStorage.getItem(STATS_KEY);
		if (!raw) return defaultStats();
		return { ...defaultStats(), ...JSON.parse(raw) };
	} catch {
		return defaultStats();
	}
}

function persistStats(stats: WritingStats): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STATS_KEY, JSON.stringify(stats));
	} catch {
		// silent
	}
}

function countWords(text: string): number {
	const trimmed = text.trim();
	if (trimmed === '') return 0;
	return trimmed.split(/\s+/).length;
}

function refreshStreak(stats: WritingStats): WritingStats {
	const today = todayStr();

	const sorted = [...stats.dailyRecords]
		.filter((r) => r.wordsWritten > 0)
		.sort((a, b) => b.date.localeCompare(a.date));

	if (sorted.length === 0) {
		return { ...stats, currentStreak: 0 };
	}

	const todayDate = new Date(today + 'T00:00:00');
	const mostRecent = new Date(sorted[0].date + 'T00:00:00');
	const diffDays = Math.floor((todayDate.getTime() - mostRecent.getTime()) / 86400000);

	if (diffDays > 1) {
		return { ...stats, currentStreak: 0 };
	}

	let streak = 0;
	const checkDate = new Date(sorted[0].date + 'T00:00:00');

	for (const record of sorted) {
		const recordDate = new Date(record.date + 'T00:00:00');
		if (recordDate.getTime() === checkDate.getTime()) {
			streak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (recordDate.getTime() < checkDate.getTime()) {
			break;
		}
	}

	// Clean up old records (keep last 90 days)
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 90);
	const cutoffStr = cutoff.toISOString().slice(0, 10);
	const dailyRecords = stats.dailyRecords.filter((r) => r.date >= cutoffStr);

	// Reset celebration flag if new day
	const goalCelebratedThisPeriod =
		stats.lastActiveDate !== today ? false : stats.goalCelebratedThisPeriod;

	return { ...stats, currentStreak: streak, dailyRecords, goalCelebratedThisPeriod };
}

// ── Store ────────────────────────────────────────────────────────────────────

interface WritingStatsState {
	stats: WritingStats;
	showCelebration: boolean;

	editorOpened: (fileId: string, content: string) => void;
	editorChanged: (fileId: string, content: string) => void;
	editorClosed: (fileId: string) => void;
	getWordsForPeriod: (goal: WordCountGoal) => number;
	checkGoal: (goal: WordCountGoal | undefined) => void;
	resetCelebration: () => void;
	dismissCelebration: () => void;
}

// Per-editor tracking — outside Zustand state since these are transient
const editorBaselines = new Map<string, number>();
const editorHighWater = new Map<string, number>();
let celebrationTimer: ReturnType<typeof setTimeout> | null = null;

export const useWritingStatsStore = create<WritingStatsState>((set, get) => {
	const initialStats = refreshStreak(loadStats());
	persistStats(initialStats);

	return {
		stats: initialStats,
		showCelebration: false,

		editorOpened: (fileId, content) => {
			const wc = countWords(content);
			editorBaselines.set(fileId, wc);
			editorHighWater.set(fileId, wc);
		},

		editorChanged: (fileId, content) => {
			const wc = countWords(content);
			const baseline = editorBaselines.get(fileId) ?? wc;
			const prevHigh = editorHighWater.get(fileId) ?? baseline;

			if (wc > prevHigh) {
				const newWords = wc - prevHigh;
				editorHighWater.set(fileId, wc);

				set((state) => {
					const today = todayStr();
					const stats = { ...state.stats };

					stats.sessionWordsWritten += newWords;

					let record = stats.dailyRecords.find((r) => r.date === today);
					if (!record) {
						record = { date: today, wordsWritten: 0 };
						stats.dailyRecords = [...stats.dailyRecords, record];
					}
					record.wordsWritten += newWords;

					if (stats.lastActiveDate !== today) {
						stats.lastActiveDate = today;
						const refreshed = refreshStreak(stats);
						persistStats(refreshed);
						return { stats: refreshed };
					}

					persistStats(stats);
					return { stats };
				});
			}
		},

		editorClosed: (fileId) => {
			editorBaselines.delete(fileId);
			editorHighWater.delete(fileId);
		},

		getWordsForPeriod: (goal) => {
			const { stats } = get();
			const today = todayStr();

			if (goal.period === 'session') {
				return stats.sessionWordsWritten;
			}
			if (goal.period === 'day') {
				const record = stats.dailyRecords.find((r) => r.date === today);
				return record?.wordsWritten ?? 0;
			}
			if (goal.period === 'week') {
				const weekStartStr = startOfWeek();
				return stats.dailyRecords
					.filter((r) => r.date >= weekStartStr)
					.reduce((sum, r) => sum + r.wordsWritten, 0);
			}
			return 0;
		},

		checkGoal: (goal) => {
			if (!goal || goal.target <= 0) return;

			const current = get().getWordsForPeriod(goal);
			const { stats } = get();

			if (current >= goal.target && !stats.goalCelebratedThisPeriod) {
				const newStats = { ...stats, goalCelebratedThisPeriod: true };
				persistStats(newStats);
				set({ stats: newStats, showCelebration: true });

				if (celebrationTimer) clearTimeout(celebrationTimer);
				celebrationTimer = setTimeout(() => {
					set({ showCelebration: false });
				}, 5000);
			}
		},

		resetCelebration: () => {
			set((state) => {
				const newStats = { ...state.stats, goalCelebratedThisPeriod: false };
				persistStats(newStats);
				return { stats: newStats };
			});
		},

		dismissCelebration: () => {
			set({ showCelebration: false });
			if (celebrationTimer) clearTimeout(celebrationTimer);
		}
	};
});
