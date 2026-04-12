'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { NudgeFolder, NudgeFile, ProjectCore, TemplateDepth } from '@/lib/types';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  loadProjects,
  fetchProjectsFromServer,
  syncProjectToServer,
  fetchSettingsFromServer,
} from '@/lib/services/storageService';
import TemplateChooser from '@/components/TemplateChooser';
import FolderTree from '@/components/FolderTree';
import MasterEditor from '@/components/MasterEditor';
import CollabEditor from '@/components/CollabEditor';
import ChatPanel from '@/components/ChatPanel';
import Settings from '@/components/Settings';
import ExportModal from '@/components/ExportModal';
import GoalToast from '@/components/GoalToast';
import { Settings as SettingsIcon } from 'lucide-react';
import styles from './AppShell.module.css';

// -- Settings → CSS variable maps --

const fontFamilyMap: Record<string, string> = {
  lora: "'Lora', Georgia, serif",
  georgia: "Georgia, 'Times New Roman', serif",
  merriweather: "'Merriweather', Georgia, serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  atkinson: "'Atkinson Hyperlegible', sans-serif",
};

const letterSpacingMap: Record<string, string> = {
  normal: '0',
  wide: '0.03em',
  wider: '0.06em',
};

const fontSizeMap: Record<string, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

const lineHeightMap: Record<string, string> = {
  compact: '1.55',
  comfortable: '1.78',
  spacious: '2.1',
};

// -- Helper: recursive file/folder search --

function searchFilesInFolder(folder: NudgeFolder, fileId: string): NudgeFile | null {
  for (const file of folder.files) {
    if (file.id === fileId) return file;
  }
  for (const child of folder.children) {
    const found = searchFilesInFolder(child, fileId);
    if (found) return found;
  }
  return null;
}

function findFolderInTree(folders: NudgeFolder[], id: string): NudgeFolder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findFolderInTree(f.children, id);
    if (found) return found;
  }
  return null;
}

interface AppShellProps {
  userEmail: string | null;
}

export default function AppShell({ userEmail }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Responsive
  const [mobileActivePanel, setMobileActivePanel] = useState<'sidebar' | 'editor' | 'chat'>('editor');
  const [showSidebarOverlay, setShowSidebarOverlay] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Project switcher
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);

  // Project-level files
  const [projectFileMenu, setProjectFileMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmDeleteProjectFile, setConfirmDeleteProjectFile] = useState<string | null>(null);
  const [renamingProjectFileId, setRenamingProjectFileId] = useState<string | null>(null);
  const [renameProjectFileValue, setRenameProjectFileValue] = useState('');
  const projectFileRenameInputRef = useRef<HTMLInputElement>(null);

  // Store selectors
  const projects = useProjectStore((s) => s.projects);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const project = useProjectStore((s) => s.getCurrentProject());
  const init = useProjectStore((s) => s.init);
  const hydrateFromServer = useProjectStore((s) => s.hydrateFromServer);
  const createProject = useProjectStore((s) => s.createProject);
  const switchProject = useProjectStore((s) => s.switchProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const addFolder = useProjectStore((s) => s.addFolder);
  const renameFile = useProjectStore((s) => s.renameFile);
  const deleteFile = useProjectStore((s) => s.deleteFile);

  const currentFileId = useUIStore((s) => s.currentFileId);
  const currentFolderId = useUIStore((s) => s.currentFolderId);
  const isInMasterFolder = useUIStore((s) => s.isInMasterFolder);
  const showNewProjectOverlay = useUIStore((s) => s.showNewProjectOverlay);
  const setShowNewProjectOverlay = useUIStore((s) => s.setShowNewProjectOverlay);
  const selectFile = useUIStore((s) => s.selectFile);

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.update);
  const hydrateSettings = useSettingsStore((s) => s.hydrateFromServer);

  const hasProjects = projects.length > 0;

  // -- Bootstrap --
  useEffect(() => {
    init();

    (async () => {
      const serverProjects = await fetchProjectsFromServer();
      if (serverProjects !== null && serverProjects.length === 0) {
        const localProjects = loadProjects();
        if (localProjects.length > 0) {
          await Promise.all(localProjects.map((p) => syncProjectToServer(p)));
          console.log(`[Nudge] Migrated ${localProjects.length} projects to server`);
        }
      } else if (serverProjects !== null) {
        hydrateFromServer(serverProjects);
      }

      const serverSettings = await fetchSettingsFromServer();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        hydrateSettings(serverSettings);
      }
    })();

    // Media queries
    const mqMobile = window.matchMedia('(max-width: 599px)');
    setIsMobile(mqMobile.matches);
    const onMobile = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileActivePanel('editor');
    };
    mqMobile.addEventListener('change', onMobile);

    const mqTablet = window.matchMedia('(min-width: 600px) and (max-width: 1023px)');
    setIsTablet(mqTablet.matches);
    const onTablet = (e: MediaQueryListEvent) => {
      setIsTablet(e.matches);
      if (!e.matches) setShowSidebarOverlay(false);
    };
    mqTablet.addEventListener('change', onTablet);

    setMounted(true);

    return () => {
      mqMobile.removeEventListener('change', onMobile);
      mqTablet.removeEventListener('change', onTablet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Apply settings to DOM --
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--editor-font-size', fontSizeMap[settings.fontSize]);
    document.documentElement.style.setProperty('--editor-line-height', lineHeightMap[settings.lineHeight]);
    document.documentElement.style.setProperty('--font-serif', fontFamilyMap[settings.fontFamily]);
    document.documentElement.style.setProperty('--editor-letter-spacing', letterSpacingMap[settings.letterSpacing ?? 'normal']);
  }, [settings]);

  // -- Close menus on outside click --
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      setShowProjectMenu(false);
      setConfirmingDeleteProject(false);
      setProjectFileMenu(null);
      setConfirmDeleteProjectFile(null);
      if (isTablet && !(e.target as Element)?.closest?.('[data-sidebar]')) {
        setShowSidebarOverlay(false);
      }
    }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isTablet]);

  // -- Derived: current file --
  const currentFile = useMemo(() => {
    if (!project || !currentFileId) return null;
    // Search project-level files
    const pf = (project.projectFiles ?? []).find((f) => f.id === currentFileId);
    if (pf) return pf;
    // Search master folder
    let f = searchFilesInFolder(project.masterFolder, currentFileId);
    if (f) return f;
    // Search collaborative folders
    for (const folder of project.collaborativeFolders) {
      f = searchFilesInFolder(folder, currentFileId);
      if (f) return f;
    }
    return null;
  }, [project, currentFileId]);

  // -- Derived: current folder name --
  const currentFolderName = useMemo(() => {
    if (!project || !currentFolderId) return null;
    const f = findFolderInTree([project.masterFolder, ...project.collaborativeFolders], currentFolderId);
    return f?.name ?? null;
  }, [project, currentFolderId]);

  const editorPlaceholderText = useMemo(() => {
    if (!project) return '';
    if (!currentFileId) {
      return isInMasterFolder
        ? 'Select a file from The Draft to begin writing.'
        : 'Select a file to open it, or create a new one.';
    }
    return '';
  }, [project, currentFileId, isInMasterFolder]);

  // -- Handlers --

  const handleFileOpen = useCallback(() => {
    if (isMobile) setMobileActivePanel('editor');
    if (isTablet) setShowSidebarOverlay(false);
  }, [isMobile, isTablet]);

  function handleCreateProject(
    templateId: string,
    projectName: string,
    projectCore: ProjectCore | undefined,
    templateDepth: TemplateDepth
  ) {
    createProject(projectName, templateId, projectCore);
    updateSettings({ templateDepth });
    setShowNewProjectOverlay(false);
  }

  function handleSwitchProject(id: string) {
    switchProject(id);
    useUIStore.setState({ currentFileId: null, currentFolderId: null, isInMasterFolder: false });
    setShowProjectMenu(false);
    setConfirmingDeleteProject(false);
  }

  function handleDeleteProject() {
    if (!project) return;
    deleteProject(project.id);
    useUIStore.setState({ currentFileId: null, currentFolderId: null, isInMasterFolder: false });
    setShowProjectMenu(false);
    setConfirmingDeleteProject(false);
  }

  function startRenameProject(id: string, name: string) {
    setRenamingProjectId(id);
    setRenameValue(name);
    setShowProjectMenu(false);
  }

  function commitRenameProject() {
    if (renameValue.trim() && renamingProjectId) {
      renameProject(renamingProjectId, renameValue.trim());
    }
    setRenamingProjectId(null);
  }

  function addTopLevelFolder() {
    addFolder(null);
  }

  function openProjectFile(file: NudgeFile) {
    selectFile(file.id, 'project', false);
    if (isMobile) setMobileActivePanel('editor');
    if (isTablet) setShowSidebarOverlay(false);
  }

  function showProjFileMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    const menuW = 140;
    const menuH = 90;
    const x = Math.min(Math.max(8, e.clientX), window.innerWidth - menuW - 8);
    const y = Math.min(Math.max(8, e.clientY), window.innerHeight - menuH - 8);
    setProjectFileMenu({ id, x, y });
    setConfirmDeleteProjectFile(null);
  }

  function hideProjFileMenu() {
    setProjectFileMenu(null);
    setConfirmDeleteProjectFile(null);
  }

  function startRenameProjFile(file: NudgeFile) {
    setRenamingProjectFileId(file.id);
    setRenameProjectFileValue(file.name.replace(/\.md$/, ''));
    hideProjFileMenu();
    setTimeout(() => projectFileRenameInputRef.current?.select(), 30);
  }

  function commitRenameProjFile(id: string) {
    if (!renameProjectFileValue.trim()) {
      setRenamingProjectFileId(null);
      return;
    }
    const name = renameProjectFileValue.trim().endsWith('.md')
      ? renameProjectFileValue.trim()
      : renameProjectFileValue.trim() + '.md';
    renameFile(id, name);
    setRenamingProjectFileId(null);
  }

  function deleteProjFile(id: string) {
    deleteFile(id);
    if (currentFileId === id) useUIStore.setState({ currentFileId: null });
    hideProjFileMenu();
  }

  if (!mounted) return null;

  // -- Sidebar content (shared between mobile + desktop) --
  const sidebarContent = project ? (
    <>
      <div className={styles.sidebarContent}>
        <div className={styles.sidebarSection}>
          <FolderTree folder={project.masterFolder} onFileOpen={handleFileOpen} />
        </div>
        <div className={styles.sidebarDivider} />
        <div className={`${styles.sidebarSection} ${styles.collabSection}`}>
          {(project.projectFiles ?? []).map((file) => (
            <div
              key={file.id}
              className={`${styles.projFileRow} ${currentFileId === file.id ? styles.active : ''}`}
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <button className={styles.projFileBtn} onClick={() => openProjectFile(file)}>
                <span className={styles.projFileIcon}>&#9672;</span>
                {renamingProjectFileId === file.id ? (
                  <input
                    ref={projectFileRenameInputRef}
                    value={renameProjectFileValue}
                    onChange={(e) => setRenameProjectFileValue(e.target.value)}
                    className={styles.projRenameInput}
                    onBlur={() => commitRenameProjFile(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRenameProjFile(file.id);
                      if (e.key === 'Escape') setRenamingProjectFileId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.projFileLabel}>{file.name.replace(/\.md$/, '')}</span>
                )}
              </button>
              <button
                className={styles.projMenuBtn}
                onClick={(e) => showProjFileMenu(e, file.id)}
                aria-label="File options"
              >
                ···
              </button>

              {projectFileMenu?.id === file.id && (
                <div
                  className={styles.projCtxMenu}
                  style={{ top: projectFileMenu.y, left: projectFileMenu.x }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.key === 'Escape' && hideProjFileMenu()}
                  role="menu"
                  tabIndex={-1}
                >
                  {confirmDeleteProjectFile === file.id ? (
                    <div className={styles.projDeleteConfirm}>
                      <p className={styles.projConfirmText}>
                        Delete &ldquo;{file.name.replace(/\.md$/, '')}&rdquo;?
                      </p>
                      <div className={styles.projConfirmActions}>
                        <button
                          role="menuitem"
                          className={styles.projectMenuItem}
                          onClick={() => setConfirmDeleteProjectFile(null)}
                        >
                          Cancel
                        </button>
                        <button
                          role="menuitem"
                          className={`${styles.projectMenuItem} ${styles.danger}`}
                          onClick={() => deleteProjFile(file.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button role="menuitem" className={styles.projectMenuItem} onClick={() => startRenameProjFile(file)}>
                        Rename
                      </button>
                      <button
                        role="menuitem"
                        className={`${styles.projectMenuItem} ${styles.danger}`}
                        onClick={() => setConfirmDeleteProjectFile(file.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {project.collaborativeFolders.map((folder) => (
            <FolderTree key={folder.id} folder={folder} onFileOpen={handleFileOpen} />
          ))}
        </div>
      </div>
      <div className={styles.sidebarFooter}>
        <button className={styles.sidebarAction} onClick={addTopLevelFolder} title="New folder">
          + New folder
        </button>
        <button
          className={styles.settingsBtn}
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Open settings"
        >
          <SettingsIcon size={16} strokeWidth={2} />
        </button>
      </div>
    </>
  ) : null;

  // -- Editor content --
  const editorContent = currentFile ? (
    isInMasterFolder ? (
      <MasterEditor key={currentFile.id} file={currentFile} />
    ) : (
      <CollabEditor key={currentFile.id} file={currentFile} />
    )
  ) : (
    <div className={styles.editorEmpty}>
      <div className={styles.emptyInner}>
        <span className={styles.emptyIcon}>{isInMasterFolder ? '\u25c8' : '\u25c7'}</span>
        <p className={styles.emptyMsg}>{editorPlaceholderText}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Template Chooser (first launch or new project) */}
      {(!hasProjects || showNewProjectOverlay) && (
        <TemplateChooser onChoose={handleCreateProject} />
      )}

      {/* Main App */}
      {hasProjects && project && (
        <div className={styles.app} id="app">
          {/* App Header */}
          <header className={styles.appHeader}>
            <button
              className={styles.hamburgerBtn}
              onClick={(e) => {
                e.stopPropagation();
                setShowSidebarOverlay(!showSidebarOverlay);
              }}
              title="Toggle file tree"
              aria-label="Toggle file tree"
            >
              ☰
            </button>

            <div className={styles.logoMark}>
              <span className={styles.logoText}>Nudge</span>
            </div>

            <div className={styles.headerCenter}>
              {isInMasterFolder ? (
                <span className={`${styles.contextHint} ${styles.masterHint}`}>
                  &#9672; The Draft &mdash; your final writing
                </span>
              ) : currentFolderId && currentFolderName ? (
                <span className={`${styles.contextHint} ${styles.collabHint}`}>
                  &#9671; {currentFolderName}
                </span>
              ) : null}
            </div>

            {/* Project switcher */}
            <div className={styles.projectSwitcher}>
              {renamingProjectId === project.id ? (
                <input
                  className={styles.projectRenameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRenameProject}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRenameProject();
                    if (e.key === 'Escape') setRenamingProjectId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  className={styles.projectNameBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProjectMenu(!showProjectMenu);
                  }}
                >
                  {project.name}
                  <span className={styles.caret}>›</span>
                </button>
              )}

              {showProjectMenu && (
                <div
                  className={styles.projectMenu}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      if (confirmingDeleteProject) setConfirmingDeleteProject(false);
                      else setShowProjectMenu(false);
                    }
                  }}
                  role="menu"
                  tabIndex={-1}
                >
                  {confirmingDeleteProject ? (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.confirmText}>Delete &ldquo;{project.name}&rdquo;?</p>
                      <p className={styles.confirmHint}>All writing and conversations will be lost.</p>
                      <div className={styles.confirmActions}>
                        <button
                          className={styles.projectMenuItem}
                          role="menuitem"
                          onClick={() => setConfirmingDeleteProject(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className={`${styles.projectMenuItem} ${styles.danger}`}
                          role="menuitem"
                          onClick={handleDeleteProject}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          className={`${styles.projectMenuItem} ${p.id === project.id ? styles.current : ''}`}
                          role="menuitem"
                          onClick={() => handleSwitchProject(p.id)}
                        >
                          {p.name}
                          {p.id === project.id && <span className={styles.currentMarker}>✓</span>}
                        </button>
                      ))}
                      <div className={styles.menuDivider} />
                      <button
                        className={styles.projectMenuItem}
                        role="menuitem"
                        onClick={() => startRenameProject(project.id, project.name)}
                      >
                        Rename
                      </button>
                      <button
                        className={styles.projectMenuItem}
                        role="menuitem"
                        onClick={() => {
                          setShowExport(true);
                          setShowProjectMenu(false);
                        }}
                      >
                        Export&hellip;
                      </button>
                      <button
                        className={styles.projectMenuItem}
                        role="menuitem"
                        onClick={() => {
                          setShowNewProjectOverlay(true);
                          setShowProjectMenu(false);
                        }}
                      >
                        New project&hellip;
                      </button>
                      <div className={styles.menuDivider} />
                      <button
                        className={`${styles.projectMenuItem} ${styles.danger}`}
                        role="menuitem"
                        onClick={() => setConfirmingDeleteProject(true)}
                      >
                        Delete this project&hellip;
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </header>

          {isMobile ? (
            <>
              <div className={styles.mobileContent}>
                {mobileActivePanel === 'sidebar' && (
                  <aside className={styles.sidebar}>{sidebarContent}</aside>
                )}
                {mobileActivePanel === 'editor' && (
                  <main className={`${styles.editorPanel} ${isInMasterFolder ? styles.master : ''}`}>
                    {editorContent}
                  </main>
                )}
                {mobileActivePanel === 'chat' && (
                  <aside className={styles.chatColumn}>
                    <ChatPanel />
                  </aside>
                )}
              </div>

              <nav className={styles.mobileNav} aria-label="Panel navigation">
                <button
                  className={`${styles.navTab} ${mobileActivePanel === 'sidebar' ? styles.activeTab : ''}`}
                  onClick={() => setMobileActivePanel('sidebar')}
                  aria-label="Files"
                >
                  <span className={styles.navIcon}>≡</span>
                  <span className={styles.navLabel}>Files</span>
                </button>
                <button
                  className={`${styles.navTab} ${mobileActivePanel === 'editor' ? styles.activeTab : ''} ${
                    mobileActivePanel === 'editor' && isInMasterFolder ? styles.writeMaster : ''
                  }`}
                  onClick={() => setMobileActivePanel('editor')}
                  aria-label="Write"
                >
                  <span className={styles.navIcon}>{isInMasterFolder ? '\u25c8' : '\u25c7'}</span>
                  <span className={styles.navLabel}>Write</span>
                </button>
                <button
                  className={`${styles.navTab} ${mobileActivePanel === 'chat' ? styles.activeTab : ''}`}
                  onClick={() => setMobileActivePanel('chat')}
                  aria-label="Chat"
                >
                  <span className={styles.navIcon}>✦</span>
                  <span className={styles.navLabel}>Chat</span>
                </button>
              </nav>
            </>
          ) : (
            <div className={styles.panels}>
              <aside
                className={`${styles.sidebar} ${showSidebarOverlay ? styles.sidebarOpen : ''}`}
                data-sidebar
              >
                {sidebarContent}
              </aside>

              <main className={`${styles.editorPanel} ${isInMasterFolder ? styles.master : ''}`}>
                {editorContent}
              </main>

              <aside className={styles.chatColumn}>
                <ChatPanel />
              </aside>
            </div>
          )}
        </div>
      )}

      <Settings open={showSettings} onClose={() => setShowSettings(false)} userEmail={userEmail} />
      <ExportModal open={showExport} onClose={() => setShowExport(false)} />
      <GoalToast />
    </>
  );
}
