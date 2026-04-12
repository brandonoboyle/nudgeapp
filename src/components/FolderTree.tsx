'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { NudgeFolder, NudgeFile } from '@/lib/types';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { getScaffoldContent } from '@/lib/data/scaffolds';
import { PenLine, Folder, FileText, Eye, EyeOff } from 'lucide-react';
import styles from './FolderTree.module.css';

interface FolderTreeProps {
  folder: NudgeFolder;
  depth?: number;
  onFileOpen?: () => void;
}

export default function FolderTree({ folder, depth = 0, onFileOpen }: FolderTreeProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuTarget, setMenuTarget] = useState<{
    id: string;
    type: 'folder' | 'file';
    x: number;
    y: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    type: 'folder' | 'file';
    name: string;
  } | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFileId = useUIStore((s) => s.currentFileId);
  const currentFolderId = useUIStore((s) => s.currentFolderId);
  const selectFile = useUIStore((s) => s.selectFile);
  const selectFolder = useUIStore((s) => s.selectFolder);
  const toggleFolderExpanded = useProjectStore((s) => s.toggleFolderExpanded);
  const updateFileContent = useProjectStore((s) => s.updateFileContent);
  const addFile = useProjectStore((s) => s.addFile);
  const addFolder = useProjectStore((s) => s.addFolder);
  const renameFile = useProjectStore((s) => s.renameFile);
  const renameFolder = useProjectStore((s) => s.renameFolder);
  const deleteFile = useProjectStore((s) => s.deleteFile);
  const deleteFolder = useProjectStore((s) => s.deleteFolder);
  const toggleFolderContext = useProjectStore((s) => s.toggleFolderContext);
  const excludedFolderIds = useProjectStore((s) => s.getCurrentProject()?.excludedFolderIds ?? []);
  const templateDepth = useSettingsStore((s) => s.settings.templateDepth);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      setMenuTarget(null);
      setConfirmDelete(null);
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-focus first menu item
  useEffect(() => {
    if (menuTarget && contextMenuRef.current) {
      contextMenuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [menuTarget]);

  function hideMenu(restoreFocus = false) {
    setMenuTarget(null);
    setConfirmDelete(null);
    if (restoreFocus) menuTriggerRef.current?.focus();
    menuTriggerRef.current = null;
  }

  function isActive(fileId: string) {
    return currentFileId === fileId;
  }

  function isFolderActive(folderId: string) {
    return currentFolderId === folderId && !currentFileId;
  }

  function isFolderExcluded(folderId: string) {
    return excludedFolderIds.includes(folderId);
  }

  function openFile(file: NudgeFile, parentFolder: NudgeFolder) {
    selectFile(file.id, parentFolder.id, parentFolder.isMaster);
    onFileOpen?.();
  }

  function clickFolder(f: NudgeFolder) {
    selectFolder(f.id, f.isMaster);
    toggleFolderExpanded(f.id);
  }

  function showMenu(e: React.MouseEvent, id: string, type: 'folder' | 'file') {
    e.stopPropagation();
    e.preventDefault();
    menuTriggerRef.current = e.currentTarget as HTMLElement;
    const menuW = 168;
    const menuH = type === 'folder' ? 260 : 108;
    const x = Math.min(Math.max(8, e.clientX), window.innerWidth - menuW - 8);
    const y = Math.min(Math.max(8, e.clientY), window.innerHeight - menuH - 8);
    setMenuTarget({ id, type, x, y });
  }

  function handleContextMenuKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      hideMenu(true);
      return;
    }
    const menu = e.currentTarget as HTMLElement;
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName.replace(/\.md$/, ''));
    hideMenu();
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  function commitRename(id: string, type: 'folder' | 'file') {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    if (type === 'folder') {
      renameFolder(id, renameValue.trim());
    } else {
      const name = renameValue.trim().endsWith('.md')
        ? renameValue.trim()
        : renameValue.trim() + '.md';
      renameFile(id, name);
    }
    setRenamingId(null);
  }

  function handleRenameKey(e: React.KeyboardEvent, id: string, type: 'folder' | 'file') {
    if (e.key === 'Enter') commitRename(id, type);
    if (e.key === 'Escape') setRenamingId(null);
  }

  function newFile(folderId: string) {
    const file = addFile(folderId);
    if (file) {
      const f = findFolderInProject(folderId);
      if (f && !f.isExpanded) toggleFolderExpanded(folderId);
      setTimeout(() => startRename(file.id, file.name), 50);
    }
    hideMenu();
  }

  function newTemplatedFile(folderId: string) {
    const file = addFile(folderId);
    if (file) {
      const f = findFolderInProject(folderId);
      if (f) {
        if (!f.isExpanded) toggleFolderExpanded(folderId);
        const depth = templateDepth === 'blank' ? 'guided' : templateDepth;
        const content = getScaffoldContent(f.name, depth);
        if (content) updateFileContent(file.id, content);
      }
      setTimeout(() => startRename(file.id, file.name), 50);
    }
    hideMenu();
  }

  function newSubfolder(parentId: string) {
    const f = addFolder(parentId);
    if (f) setTimeout(() => startRename(f.id, f.name), 50);
    hideMenu();
  }

  function triggerUpload(folderId: string) {
    setUploadTargetFolderId(folderId);
    hideMenu();
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadTargetFolderId) return;

    const target = findFolderInProject(uploadTargetFolderId);
    if (target && !target.isExpanded) toggleFolderExpanded(uploadTargetFolderId);

    let lastFile: NudgeFile | null = null;

    for (const rawFile of Array.from(files)) {
      const text = await rawFile.text();
      const baseName = rawFile.name.replace(/\.(txt|text)$/i, '');
      const mdName = baseName.endsWith('.md') ? baseName : baseName + '.md';
      const created = addFile(uploadTargetFolderId, mdName);
      if (created) {
        updateFileContent(created.id, text);
        lastFile = created;
      }
    }

    if (lastFile && uploadTargetFolderId) {
      selectFile(lastFile.id, uploadTargetFolderId, folder.isMaster);
      onFileOpen?.();
    }

    e.target.value = '';
    setUploadTargetFolderId(null);
  }

  function requestDelete(id: string, type: 'folder' | 'file', name: string) {
    setConfirmDelete({ id, type, name });
  }

  function deleteItem(id: string, type: 'folder' | 'file') {
    if (type === 'folder') {
      deleteFolder(id);
    } else {
      deleteFile(id);
    }
    hideMenu();
  }

  const findFolderInProject = useCallback(
    (id: string): NudgeFolder | null => {
      const project = useProjectStore.getState().getCurrentProject();
      if (!project) return null;
      return findFolderById([project.masterFolder, ...project.collaborativeFolders], id);
    },
    []
  );

  return (
    <>
      {/* Hidden file input for imports */}
      {depth === 0 && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.text,.md,.markdown"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      )}

      <div className={styles.folderItem} style={{ '--depth': depth } as React.CSSProperties}>
        {/* Folder row */}
        <div
          className={`${styles.row} ${styles.folderRow} ${folder.isMaster ? styles.master : ''} ${
            isFolderActive(folder.id) ? styles.active : ''
          }`}
          onClick={() => clickFolder(folder)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && clickFolder(folder)}
        >
          <span className={`${styles.chevron} ${folder.isExpanded ? styles.open : ''}`}>
            ›
          </span>
          {folder.isMaster ? (
            <span className={`${styles.folderIcon} ${styles.masterIcon}`}>
              <PenLine size={13} strokeWidth={1.75} />
            </span>
          ) : (
            <span className={styles.folderIcon}>
              <Folder size={13} strokeWidth={1.75} />
            </span>
          )}

          {renamingId === folder.id ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={styles.renameInput}
              onBlur={() => commitRename(folder.id, 'folder')}
              onKeyDown={(e) => handleRenameKey(e, folder.id, 'folder')}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={styles.rowLabel}>
              {folder.isMaster ? 'The Draft' : folder.name}
            </span>
          )}

          {!folder.isMaster && depth === 0 && (
            <button
              className={`${styles.contextToggle} ${
                isFolderExcluded(folder.id) ? styles.excluded : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderContext(folder.id);
              }}
              title={
                isFolderExcluded(folder.id)
                  ? 'Hidden from AI \u2014 click to include'
                  : 'Visible to AI \u2014 click to hide'
              }
              aria-label={
                isFolderExcluded(folder.id)
                  ? 'Include folder in AI context'
                  : 'Exclude folder from AI context'
              }
            >
              {isFolderExcluded(folder.id) ? (
                <EyeOff size={12} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Eye size={12} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          )}

          {!folder.isMaster && (
            <button
              className={styles.menuBtn}
              onClick={(e) => showMenu(e, folder.id, 'folder')}
              aria-label="Folder options"
            >
              ···
            </button>
          )}
        </div>

        {/* Folder context menu */}
        {menuTarget && menuTarget.id === folder.id && menuTarget.type === 'folder' && (
          <div
            className={styles.contextMenu}
            style={{ top: menuTarget.y, left: menuTarget.x }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleContextMenuKeydown}
            role="menu"
            tabIndex={-1}
            ref={contextMenuRef as React.RefObject<HTMLDivElement>}
          >
            {confirmDelete?.id === folder.id ? (
              <div className={styles.deleteConfirm}>
                <p className={styles.confirmText}>Delete &ldquo;{folder.name}&rdquo;?</p>
                <p className={styles.confirmHint}>All files inside will be lost.</p>
                <div className={styles.confirmActions}>
                  <button role="menuitem" onClick={() => setConfirmDelete(null)}>
                    Cancel
                  </button>
                  <button
                    role="menuitem"
                    className={styles.danger}
                    onClick={() => deleteItem(folder.id, 'folder')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button role="menuitem" onClick={() => newFile(folder.id)}>
                  New File
                </button>
                <button role="menuitem" onClick={() => newTemplatedFile(folder.id)}>
                  New Templated File
                </button>
                <button role="menuitem" onClick={() => newSubfolder(folder.id)}>
                  New Subfolder
                </button>
                <button role="menuitem" onClick={() => triggerUpload(folder.id)}>
                  Import text file&hellip;
                </button>
                <div className={styles.menuDivider} />
                <button role="menuitem" onClick={() => startRename(folder.id, folder.name)}>
                  Rename
                </button>
                <button
                  role="menuitem"
                  className={styles.danger}
                  onClick={() => requestDelete(folder.id, 'folder', folder.name)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* Children */}
        {folder.isExpanded && (
          <div className={styles.folderContents}>
            {/* Files */}
            {folder.files.map((file) => (
              <div
                key={file.id}
                className={`${styles.row} ${styles.fileRow} ${
                  isActive(file.id) ? styles.active : ''
                }`}
              >
                <button
                  className={styles.fileBtn}
                  onClick={() => openFile(file, folder)}
                  title={file.name}
                >
                  {renamingId === file.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className={styles.renameInput}
                      onBlur={() => commitRename(file.id, 'file')}
                      onKeyDown={(e) => handleRenameKey(e, file.id, 'file')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className={styles.fileIcon}>
                        <FileText size={12} strokeWidth={1.75} />
                      </span>
                      <span className={`${styles.rowLabel} ${styles.fileLabel}`}>
                        {file.name.replace(/\.md$/, '')}
                      </span>
                    </>
                  )}
                </button>
                <button
                  className={styles.menuBtn}
                  onClick={(e) => showMenu(e, file.id, 'file')}
                  aria-label="File options"
                >
                  ···
                </button>

                {/* File context menu */}
                {menuTarget && menuTarget.id === file.id && menuTarget.type === 'file' && (
                  <div
                    className={styles.contextMenu}
                    style={{ top: menuTarget.y, left: menuTarget.x }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleContextMenuKeydown}
                    role="menu"
                    tabIndex={-1}
                    ref={contextMenuRef as React.RefObject<HTMLDivElement>}
                  >
                    {confirmDelete?.id === file.id ? (
                      <div className={styles.deleteConfirm}>
                        <p className={styles.confirmText}>
                          Delete &ldquo;{file.name.replace(/\.md$/, '')}&rdquo;?
                        </p>
                        <div className={styles.confirmActions}>
                          <button role="menuitem" onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </button>
                          <button
                            role="menuitem"
                            className={styles.danger}
                            onClick={() => deleteItem(file.id, 'file')}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button role="menuitem" onClick={() => startRename(file.id, file.name)}>
                          Rename
                        </button>
                        <button
                          role="menuitem"
                          className={styles.danger}
                          onClick={() => requestDelete(file.id, 'file', file.name)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Nested folders (recursive) */}
            {folder.children.map((child) => (
              <FolderTree key={child.id} folder={child} depth={depth + 1} onFileOpen={onFileOpen} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function findFolderById(folders: NudgeFolder[], id: string): NudgeFolder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findFolderById(f.children, id);
    if (found) return found;
  }
  return null;
}
