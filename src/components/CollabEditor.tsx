'use client';

import { useEffect, useRef, useMemo } from 'react';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { classHighlighter } from '@lezer/highlight';
import type { NudgeFile } from '@/lib/types';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useWritingStatsStore } from '@/lib/stores/writingStatsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import styles from './CollabEditor.module.css';

interface CollabEditorProps {
  file: NudgeFile;
}

const collabTheme = EditorView.theme({
  '&': { height: '100%', background: 'transparent' },
  '.cm-scroller': {
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--editor-font-size)',
    lineHeight: 'var(--editor-line-height)',
    overflow: 'auto',
  },
  '.cm-content': {
    color: 'var(--text-primary)',
    caretColor: 'var(--collab-teal)',
    padding: '0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--collab-teal)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-activeLine': { background: 'transparent' },
  '.cm-activeLineGutter': { background: 'transparent' },
  '.cm-gutters': { display: 'none' },
  '.cm-lineNumbers': { display: 'none' },
  '.cm-selectionBackground': { background: 'var(--collab-teal-dim)' },
  '&.cm-focused .cm-selectionBackground': { background: 'var(--collab-teal-dim)' },
  '.cm-placeholder': { color: 'var(--text-muted)', fontStyle: 'italic' },
});

export default function CollabEditor({ file }: CollabEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(file.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateFileContent = useProjectStore((s) => s.updateFileContent);
  const setSaveState = useUIStore((s) => s.setSaveState);
  const saveState = useUIStore((s) => s.saveState);
  const editorOpened = useWritingStatsStore((s) => s.editorOpened);
  const editorChanged = useWritingStatsStore((s) => s.editorChanged);
  const editorClosed = useWritingStatsStore((s) => s.editorClosed);
  const checkGoal = useWritingStatsStore((s) => s.checkGoal);
  const wordCountGoal = useSettingsStore((s) => s.settings.wordCountGoal);

  const wordCount = useMemo(
    () => (contentRef.current.trim() === '' ? 0 : contentRef.current.trim().split(/\s+/).length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file.content]
  );

  const storeRefs = useRef({ updateFileContent, setSaveState, editorChanged, checkGoal, wordCountGoal });
  useEffect(() => {
    storeRefs.current = { updateFileContent, setSaveState, editorChanged, checkGoal, wordCountGoal };
  });

  function wrapSelection(marker: string) {
    const view = viewRef.current;
    if (!view) return;
    const { state } = view;
    const range = state.selection.main;
    const selected = state.doc.sliceString(range.from, range.to);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: marker + selected + marker },
      selection: { anchor: range.from + marker.length, head: range.to + marker.length },
    });
    view.focus();
  }

  function insertHeading(level: number) {
    const view = viewRef.current;
    if (!view) return;
    const { state } = view;
    const line = state.doc.lineAt(state.selection.main.from);
    const prefix = '#'.repeat(level) + ' ';
    const stripped = line.text.replace(/^#+\s*/, '');
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: prefix + stripped },
      selection: { anchor: line.from + prefix.length },
    });
    view.focus();
  }

  useEffect(() => {
    if (!editorRef.current) return;

    editorOpened(file.id, file.content);

    const view = new EditorView({
      state: EditorState.create({
        doc: file.content,
        extensions: [
          history(),
          keymap.of([
            {
              key: 'Mod-b',
              run: () => {
                wrapSelection('**');
                return true;
              },
            },
            {
              key: 'Mod-i',
              run: () => {
                wrapSelection('*');
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          markdown(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ spellcheck: 'true' }),
          collabTheme,
          syntaxHighlighting(classHighlighter),
          placeholder('Start thinking here\u2026'),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              contentRef.current = newContent;
              const refs = storeRefs.current;
              refs.setSaveState('saving');
              clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => {
                refs.updateFileContent(file.id, newContent);
                refs.setSaveState('saved');
              }, 800);
              refs.editorChanged(file.id, newContent);
              refs.checkGoal(refs.wordCountGoal);
            }
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      clearTimeout(saveTimerRef.current);
      if (contentRef.current !== file.content) {
        updateFileContent(file.id, contentRef.current);
      }
      editorClosed(file.id);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return (
    <div className={styles.collabEditor}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button className={styles.toolbarBtn} title="Heading 1" onClick={() => insertHeading(1)}>
            H1
          </button>
          <button className={styles.toolbarBtn} title="Heading 2" onClick={() => insertHeading(2)}>
            H2
          </button>
          <button className={styles.toolbarBtn} title="Heading 3" onClick={() => insertHeading(3)}>
            H3
          </button>
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <button
            className={`${styles.toolbarBtn} ${styles.boldBtn}`}
            title="Bold (⌘B)"
            onClick={() => wrapSelection('**')}
          >
            <b>B</b>
          </button>
          <button className={styles.toolbarBtn} title="Italic (⌘I)" onClick={() => wrapSelection('*')}>
            <i>I</i>
          </button>
        </div>
        <div className={styles.toolbarSpacer} />
        <span className={styles.collabBadge}>Thinking Space</span>
      </div>

      <div className={styles.writingSurface}>
        <div className={styles.editorMount} ref={editorRef} />
      </div>

      <div className={styles.editorFooter}>
        <span className={styles.fileName}>{file.name.replace(/\.md$/, '')}</span>
        <div className={styles.footerStats}>
          <span className={styles.stat}>
            {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
        <div className={styles.saveIndicator}>
          {saveState === 'saving' && <span className={styles.saving}>Saving&hellip;</span>}
          {saveState === 'saved' && <span className={styles.saved}>Saved</span>}
        </div>
      </div>
    </div>
  );
}
