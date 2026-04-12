'use client';

import type { NudgeFile } from '@/lib/types';
import NudgeEditor, { type EditorAccent } from './NudgeEditor';
import styles from './MasterEditor.module.css';

const MASTER_ACCENT: EditorAccent = {
  accentVar: '--master-gold',
  accentDimVar: '--master-gold-dim',
  placeholder: 'Begin writing\u2026',
  badgeLabel: 'The Draft',
  showCharCount: true,
};

interface MasterEditorProps {
  file: NudgeFile;
}

export default function MasterEditor({ file }: MasterEditorProps) {
  return <NudgeEditor file={file} accent={MASTER_ACCENT} styles={styles} />;
}
