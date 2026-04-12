'use client';

import type { NudgeFile } from '@/lib/types';
import NudgeEditor, { type EditorAccent } from './NudgeEditor';
import styles from './CollabEditor.module.css';

const COLLAB_ACCENT: EditorAccent = {
  accentVar: '--collab-teal',
  accentDimVar: '--collab-teal-dim',
  placeholder: 'Start thinking here\u2026',
  badgeLabel: 'Thinking Space',
  showCharCount: false,
};

interface CollabEditorProps {
  file: NudgeFile;
}

export default function CollabEditor({ file }: CollabEditorProps) {
  return <NudgeEditor file={file} accent={COLLAB_ACCENT} styles={styles} />;
}
