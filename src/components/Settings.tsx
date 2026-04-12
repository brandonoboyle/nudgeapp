'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useWritingStatsStore } from '@/lib/stores/writingStatsStore';
import { openCheckout } from '@/lib/services/paddleService';
import styles from './Settings.module.css';

const PRICE_ID = 'pri_01kmree62b6kf812baepj02j0v';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

const themeOptions = [
  { value: 'warm' as const, label: 'Warm', bg: '#faf8f5', accent: '#c4a060', textColor: '#3c3028' },
  { value: 'slate' as const, label: 'Slate', bg: '#f5f6f8', accent: '#5b8db8', textColor: '#1a2030' },
  { value: 'dusk' as const, label: 'Dusk', bg: '#1c1814', accent: '#c4a060', textColor: '#e8ddd0' },
  { value: 'ink' as const, label: 'Ink', bg: '#161618', accent: '#a0a0e8', textColor: '#e8e8ec' },
];

const fontFamilyOptions = [
  { value: 'lora' as const, label: 'Lora', style: "'Lora', Georgia, serif" },
  { value: 'georgia' as const, label: 'Georgia', style: "Georgia, 'Times New Roman', serif" },
  { value: 'merriweather' as const, label: 'Merriweather', style: "'Merriweather', Georgia, serif" },
  { value: 'atkinson' as const, label: 'Atkinson', style: "'Atkinson Hyperlegible', sans-serif" },
  { value: 'system' as const, label: 'System', style: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
];

export default function Settings({ open, onClose, userEmail = null }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'writing' | 'account'>('appearance');
  const panelRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Settings store
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);

  // Writing stats
  const stats = useWritingStatsStore((s) => s.stats);
  const resetCelebration = useWritingStatsStore((s) => s.resetCelebration);

  // Word count goal local state
  const [goalTarget, setGoalTarget] = useState(settings.wordCountGoal?.target?.toString() ?? '');
  const [goalPeriod, setGoalPeriod] = useState<'session' | 'day' | 'week'>(
    settings.wordCountGoal?.period ?? 'day'
  );

  // Sync local goal state if settings hydrate from server
  useEffect(() => {
    const goal = settings.wordCountGoal;
    if (goal) {
      setGoalTarget(goal.target.toString());
      setGoalPeriod(goal.period);
    }
  }, [settings.wordCountGoal]);

  const streak = stats.currentStreak;
  const todayRecord = useMemo(
    () => stats.dailyRecords.find((r) => r.date === new Date().toISOString().slice(0, 10)),
    [stats.dailyRecords]
  );
  const wordsToday = todayRecord?.wordsWritten ?? 0;

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  function resetPasswordForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('');
    setPasswordError(false);
  }

  function updateGoal() {
    const target = parseInt(goalTarget, 10);
    if (target > 0) {
      updateSettings({ wordCountGoal: { target, period: goalPeriod } });
      resetCelebration();
    } else {
      updateSettings({ wordCountGoal: undefined });
    }
  }

  async function handlePasswordChange() {
    setPasswordMessage('');
    setPasswordError(false);

    if (newPassword.length < 8) {
      setPasswordMessage('New password must be at least 8 characters.');
      setPasswordError(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      setPasswordError(true);
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage(data.error || 'Something went wrong.');
        setPasswordError(true);
      } else {
        setPasswordMessage('Password changed successfully.');
        setPasswordError(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMessage('Network error. Please try again.');
      setPasswordError(true);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSubscribe() {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      await openCheckout({ items: [{ priceId: PRICE_ID, quantity: 1 }] }, userEmail);
    } catch (e) {
      setCheckoutError('Could not open checkout. Please try again.');
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Focus management
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
      }, 0);
    } else {
      if (returnFocusRef.current) {
        returnFocusRef.current.focus();
        returnFocusRef.current = null;
      }
      resetPasswordForm();
    }
  }, [open]);

  function closeOnBackdrop(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains(styles.settingsBackdrop)) {
      onClose();
    }
  }

  function handleKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  if (!open) return null;

  return (
    <div className={styles.settingsBackdrop} onClick={closeOnBackdrop} role="presentation">
      <div
        className={styles.settingsPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        onKeyDown={handleKeydown}
      >
        {/* Header */}
        <div className={styles.settingsHeader}>
          <h2 className={styles.settingsTitle}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar} role="tablist">
          {(['appearance', 'writing', 'account'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.tabContent}>
          {/* Appearance */}
          {activeTab === 'appearance' && (
            <>
              {/* Theme swatches */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Theme</span>
                <div className={styles.themeSwatches}>
                  {themeOptions.map((t) => (
                    <button
                      key={t.value}
                      className={`${styles.themeSwatch} ${
                        settings.theme === t.value ? styles.activeSwatch : ''
                      }`}
                      style={{ background: t.bg, color: t.textColor }}
                      onClick={() => updateSettings({ theme: t.value })}
                      title={t.label}
                      aria-label={`Theme: ${t.label}`}
                      aria-pressed={settings.theme === t.value}
                    >
                      <span className={styles.swatchDot} style={{ background: t.accent }} />
                      <span className={styles.swatchName}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Font</span>
                <div className={styles.fontOptions}>
                  {fontFamilyOptions.map((f) => (
                    <button
                      key={f.value}
                      className={`${styles.fontBtn} ${
                        settings.fontFamily === f.value ? styles.activeFont : ''
                      }`}
                      style={{ fontFamily: f.style }}
                      onClick={() => updateSettings({ fontFamily: f.value })}
                      aria-pressed={settings.fontFamily === f.value}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Size</span>
                <div className={styles.pillGroup}>
                  {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                    <button
                      key={s}
                      className={`${styles.pillBtn} ${
                        settings.fontSize === s ? styles.activePill : ''
                      }`}
                      onClick={() => updateSettings({ fontSize: s })}
                      aria-pressed={settings.fontSize === s}
                    >
                      {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : s === 'lg' ? 'Large' : 'X-Large'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line height */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Spacing</span>
                <div className={styles.pillGroup}>
                  {(['compact', 'comfortable', 'spacious'] as const).map((lh) => (
                    <button
                      key={lh}
                      className={`${styles.pillBtn} ${
                        settings.lineHeight === lh ? styles.activePill : ''
                      }`}
                      onClick={() => updateSettings({ lineHeight: lh })}
                      aria-pressed={settings.lineHeight === lh}
                    >
                      {lh.charAt(0).toUpperCase() + lh.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter spacing */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Tracking</span>
                <div className={styles.pillGroup}>
                  {(['normal', 'wide', 'wider'] as const).map((ls) => (
                    <button
                      key={ls}
                      className={`${styles.pillBtn} ${
                        (settings.letterSpacing ?? 'normal') === ls ? styles.activePill : ''
                      }`}
                      onClick={() => updateSettings({ letterSpacing: ls })}
                      aria-pressed={(settings.letterSpacing ?? 'normal') === ls}
                    >
                      {ls.charAt(0).toUpperCase() + ls.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Writing */}
          {activeTab === 'writing' && (
            <>
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>New file structure</span>
                <div className={styles.pillGroup}>
                  {(['blank', 'guided', 'full'] as const).map((d) => (
                    <button
                      key={d}
                      className={`${styles.pillBtn} ${
                        settings.templateDepth === d ? styles.activePill : ''
                      }`}
                      onClick={() => updateSettings({ templateDepth: d })}
                      aria-pressed={settings.templateDepth === d}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <p className={styles.settingHint}>
                How much scaffolding new notes start with — blank, a few guiding questions, or a
                full template.
              </p>

              <div className={styles.settingDivider} />

              {/* Word count goal */}
              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Word goal</span>
                <div className={styles.goalControls}>
                  <input
                    type="number"
                    className={styles.goalInput}
                    placeholder="e.g. 500"
                    min={0}
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    onBlur={updateGoal}
                  />
                  <div className={styles.pillGroup}>
                    {(['session', 'day', 'week'] as const).map((p) => (
                      <button
                        key={p}
                        className={`${styles.pillBtn} ${
                          goalPeriod === p ? styles.activePill : ''
                        }`}
                        onClick={() => {
                          setGoalPeriod(p);
                          // Trigger update after state settles
                          setTimeout(() => {
                            const target = parseInt(goalTarget, 10);
                            if (target > 0) {
                              updateSettings({ wordCountGoal: { target, period: p } });
                              resetCelebration();
                            }
                          }, 0);
                        }}
                        aria-pressed={goalPeriod === p}
                      >
                        {p === 'session' ? 'Session' : p === 'day' ? 'Daily' : 'Weekly'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className={styles.settingHint}>
                Set a target and get a quiet nudge when you reach it. Leave blank to disable.
              </p>

              <div className={styles.settingDivider} />

              {/* Stats */}
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{streak}</span>
                  <span className={styles.statLabelText}>
                    {streak === 1 ? 'day' : 'days'} streak
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{wordsToday.toLocaleString()}</span>
                  <span className={styles.statLabelText}>words today</span>
                </div>
              </div>
            </>
          )}

          {/* Account */}
          {activeTab === 'account' && (
            <>
              <div className={styles.subscribeSection}>
                <div className={styles.subscribeInfo}>
                  <span className={styles.subscribeLabel}>Nudge Pro</span>
                  <span className={styles.subscribeDesc}>
                    Unlimited projects, priority AI, and everything to come.
                  </span>
                </div>
                <button
                  className={styles.subscribeBtn}
                  onClick={handleSubscribe}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Opening...' : 'Subscribe'}
                </button>
                {checkoutError && <p className={styles.checkoutError}>{checkoutError}</p>}
              </div>

              <div className={styles.settingDivider} />

              <form
                className={styles.passwordForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordChange();
                }}
              >
                <h3 className={styles.passwordHeading}>Change password</h3>
                <label className={styles.pwField}>
                  <span className={styles.pwLabel}>Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label className={styles.pwField}>
                  <span className={styles.pwLabel}>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label className={styles.pwField}>
                  <span className={styles.pwLabel}>Confirm new password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                {passwordMessage && (
                  <p
                    className={`${styles.pwMessage} ${
                      passwordError ? styles.pwError : styles.pwSuccess
                    }`}
                  >
                    {passwordMessage}
                  </p>
                )}
                <button type="submit" className={styles.pwSubmit} disabled={passwordLoading}>
                  {passwordLoading ? 'Changing...' : 'Change password'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.settingsFooter}>
          <button
            className={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
