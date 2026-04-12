'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { NudgeFolder, NudgeFile } from '@/lib/types';
import { useProjectStore } from '@/lib/stores/projectStore';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

function collectFiles(folder: NudgeFolder): NudgeFile[] {
  return [...folder.files, ...folder.children.flatMap(collectFiles)];
}

function folderToMarkdown(folder: NudgeFolder, depth: number): string {
  const hashes = '#'.repeat(depth);
  let md = `${hashes} ${folder.name}\n\n`;
  for (const file of folder.files) {
    md += `${'#'.repeat(depth + 1)} ${file.name.replace(/\.md$/, '')}\n\n`;
    if (file.content.trim()) {
      md += `${file.content.trim()}\n\n`;
    }
  }
  for (const child of folder.children) {
    md += folderToMarkdown(child, depth + 1);
  }
  return md;
}

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const [includeMaster, setIncludeMaster] = useState(true);
  const [includeBible, setIncludeBible] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const currentProject = useProjectStore((s) => s.getCurrentProject());

  const masterFileCount = useMemo(() => {
    if (!currentProject) return 0;
    return collectFiles(currentProject.masterFolder).length;
  }, [currentProject]);

  const bibleFileCount = useMemo(() => {
    if (!currentProject) return 0;
    return (
      (currentProject.projectFiles ?? []).length +
      currentProject.collaborativeFolders.reduce((n, f) => n + collectFiles(f).length, 0)
    );
  }, [currentProject]);

  const canExport = includeMaster || includeBible;

  // Focus management
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
      }, 0);
    } else if (returnFocusRef.current) {
      returnFocusRef.current.focus();
      returnFocusRef.current = null;
    }
  }, [open]);

  const closeOnBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains(styles.exportBackdrop)) {
        onClose();
      }
    },
    [onClose]
  );

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

  function downloadExport() {
    if (!currentProject) return;

    let content = `# ${currentProject.name}\n\n`;

    if (includeMaster) {
      content += `---\n\n## The Draft\n\n`;
      for (const file of collectFiles(currentProject.masterFolder)) {
        content += `### ${file.name.replace(/\.md$/, '')}\n\n`;
        if (file.content.trim()) {
          content += `${file.content.trim()}\n\n`;
        }
      }
    }

    if (includeBible) {
      content += `---\n\n## The Well\n\n`;
      for (const file of currentProject.projectFiles ?? []) {
        if (file.content.trim()) content += `${file.content.trim()}\n\n`;
      }
      for (const folder of currentProject.collaborativeFolders) {
        content += folderToMarkdown(folder, 3);
      }
    }

    const blob = new Blob([content.trim()], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }

  if (!open) return null;

  return (
    <div className={styles.exportBackdrop} onClick={closeOnBackdrop} role="presentation">
      <div
        className={styles.exportPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Export project"
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={handleKeydown}
      >
        <div className={styles.exportHeader}>
          <h2 className={styles.exportTitle}>Export</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.exportBody}>
          <p className={styles.exportDesc}>
            Choose what to include. Everything exports as a single markdown file.
          </p>

          <div className={styles.options}>
            <button
              className={`${styles.optionBtn} ${includeMaster ? styles.active : ''}`}
              onClick={() => setIncludeMaster(!includeMaster)}
              aria-pressed={includeMaster}
            >
              <div className={`${styles.optionCheck} ${includeMaster ? styles.checked : ''}`}>
                {includeMaster && '✓'}
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionName}>The Draft</span>
                <span className={styles.optionCount}>
                  {masterFileCount} {masterFileCount === 1 ? 'file' : 'files'}
                </span>
              </div>
            </button>

            <button
              className={`${styles.optionBtn} ${includeBible ? styles.active : ''}`}
              onClick={() => setIncludeBible(!includeBible)}
              aria-pressed={includeBible}
            >
              <div className={`${styles.optionCheck} ${includeBible ? styles.checked : ''}`}>
                {includeBible && '✓'}
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionName}>The Well</span>
                <span className={styles.optionCount}>
                  {bibleFileCount} {bibleFileCount === 1 ? 'file' : 'files'}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className={styles.exportFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.downloadBtn}
            onClick={downloadExport}
            disabled={!canExport}
          >
            Download .md
          </button>
        </div>
      </div>
    </div>
  );
}
