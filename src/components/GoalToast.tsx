'use client';

import { useWritingStatsStore } from '@/lib/stores/writingStatsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import styles from './GoalToast.module.css';

export default function GoalToast() {
  const showCelebration = useWritingStatsStore((s) => s.showCelebration);
  const dismissCelebration = useWritingStatsStore((s) => s.dismissCelebration);
  const goal = useSettingsStore((s) => s.settings.wordCountGoal);

  if (!showCelebration || !goal) return null;

  const periodLabel =
    goal.period === 'session' ? 'session' : goal.period === 'week' ? 'weekly' : 'daily';

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <button
        className={styles.toastClose}
        onClick={dismissCelebration}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <div className={styles.toastContent}>
        <span className={styles.toastStar}>&#10038;</span>
        <div>
          <p className={styles.toastTitle}>Goal reached</p>
          <p className={styles.toastBody}>
            {goal.target.toLocaleString()} {periodLabel} words — well done.
          </p>
        </div>
      </div>
    </div>
  );
}
