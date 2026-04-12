'use client';

import { useState, useRef, useEffect } from 'react';
import { TEMPLATES } from '@/lib/data/templates';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { Template, ProjectCore, TemplateDepth } from '@/lib/types';
import {
  Sparkles,
  Feather,
  Eye,
  ScrollText,
  Dice6,
  Plus,
  FolderOpen,
  File,
  HelpCircle,
  ClipboardList,
} from 'lucide-react';
import styles from './TemplateChooser.module.css';

const TEMPLATE_ICONS: Record<string, typeof Sparkles> = {
  fantasy: Sparkles,
  literary: Feather,
  mystery: Eye,
  essay: ScrollText,
  rpg: Dice6,
  blank: Plus,
};

interface TemplateChooserProps {
  onChoose: (
    templateId: string,
    projectName: string,
    projectCore: ProjectCore | undefined,
    templateDepth: TemplateDepth
  ) => void;
}

export default function TemplateChooser({ onChoose }: TemplateChooserProps) {
  const settingsTemplateDepth = useSettingsStore((s) => s.settings.templateDepth);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [projectName, setProjectName] = useState('');
  const [origin, setOrigin] = useState<'fresh' | 'existing'>('fresh');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    TEMPLATES[TEMPLATES.length - 1]
  );
  const [whatHappens, setWhatHappens] = useState('');
  const [whatItsAbout, setWhatItsAbout] = useState('');
  const [protagonist, setProtagonist] = useState('');
  const [templateDepth, setTemplateDepth] = useState<TemplateDepth>(
    settingsTemplateDepth ?? 'guided'
  );

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [step]);

  function handleSkip() {
    const name = projectName.trim() || 'Untitled Project';
    onChoose('blank', name, undefined, templateDepth);
  }

  function next() {
    if (step < 4) setStep((step + 1) as 1 | 2 | 3 | 4);
  }

  function back() {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4);
  }

  function handleBegin() {
    const name = projectName.trim() || 'Untitled Project';
    const core: ProjectCore = { whatHappens, whatItsAbout, protagonist };
    const hasCore = core.whatHappens.trim() || core.whatItsAbout.trim() || core.protagonist.trim();
    onChoose(selectedTemplate.id, name, hasCore ? core : undefined, templateDepth);
  }

  function handleKeydown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && step < 4) next();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.chooser}>
        {/* Header */}
        <header className={styles.chooserHeader}>
          <h1 className={styles.logo}>Nudge</h1>
          <p className={styles.tagline}>A thinking partner for your writing.</p>
        </header>

        {/* Progress dots */}
        <div className={styles.progressDots} aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`${styles.dot} ${step === s ? styles.activeDot : ''} ${
                step > s ? styles.done : ''
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name + origin */}
        {step === 1 && (
          <section className={styles.step}>
            <p className={styles.stepLabel}>What are you working on?</p>
            <input
              ref={nameInputRef}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeydown}
              type="text"
              placeholder="Untitled Project"
              autoComplete="off"
              className={styles.nameInput}
            />
            <p className={styles.stepSublabel}>Where are you starting from?</p>
            <div className={styles.originCards}>
              <button
                className={`${styles.originCard} ${origin === 'fresh' ? styles.selected : ''}`}
                onClick={() => setOrigin('fresh')}
              >
                <span className={styles.originIcon}>
                  <Sparkles size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.originLabel}>Starting fresh</span>
              </button>
              <button
                className={`${styles.originCard} ${origin === 'existing' ? styles.selected : ''}`}
                onClick={() => setOrigin('existing')}
              >
                <span className={styles.originIcon}>
                  <FolderOpen size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.originLabel}>I have an existing project</span>
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Genre picker */}
        {step === 2 && (
          <section className={styles.step}>
            <p className={styles.stepLabel}>Choose a starting shape</p>
            <div className={styles.templateGrid}>
              {TEMPLATES.map((template) => {
                const Icon = TEMPLATE_ICONS[template.id] ?? Plus;
                return (
                  <button
                    key={template.id}
                    className={`${styles.templateCard} ${
                      selectedTemplate.id === template.id ? styles.selected : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <span className={styles.templateEmoji}>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className={styles.templateName}>{template.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 3: Project Core */}
        {step === 3 && (
          <section className={styles.step}>
            <p className={styles.stepLabel}>
              {origin === 'existing'
                ? "Summarize your story's heart"
                : 'What is this story about?'}
            </p>
            <p className={styles.stepHint}>All fields are optional — fill in what you know.</p>
            <div className={styles.coreFields}>
              <label className={styles.coreLabel} htmlFor="what-happens">
                What happens?
              </label>
              <textarea
                id="what-happens"
                value={whatHappens}
                onChange={(e) => setWhatHappens(e.target.value)}
                placeholder="One sentence — the plot in a nutshell"
                rows={2}
                className={styles.coreTextarea}
              />

              <label className={styles.coreLabel} htmlFor="what-about">
                What is it really about?
              </label>
              <textarea
                id="what-about"
                value={whatItsAbout}
                onChange={(e) => setWhatItsAbout(e.target.value)}
                placeholder="The thematic or emotional core"
                rows={2}
                className={styles.coreTextarea}
              />

              <label className={styles.coreLabel} htmlFor="protagonist">
                Who is at the centre?
              </label>
              <textarea
                id="protagonist"
                value={protagonist}
                onChange={(e) => setProtagonist(e.target.value)}
                placeholder="Central character(s)"
                rows={2}
                className={styles.coreTextarea}
              />
            </div>
          </section>
        )}

        {/* Step 4: Structure depth */}
        {step === 4 && (
          <section className={styles.step}>
            <p className={styles.stepLabel}>
              When you create a new note, how should it start?
            </p>
            <div className={styles.depthCards}>
              <button
                className={`${styles.depthCard} ${
                  templateDepth === 'blank' ? styles.selected : ''
                }`}
                onClick={() => setTemplateDepth('blank')}
              >
                <span className={styles.depthIcon}>
                  <File size={16} strokeWidth={1.75} />
                </span>
                <span className={styles.depthName}>Blank slate</span>
                <span className={styles.depthDesc}>
                  An empty page — no structure imposed.
                </span>
              </button>
              <button
                className={`${styles.depthCard} ${
                  templateDepth === 'guided' ? styles.selected : ''
                }`}
                onClick={() => setTemplateDepth('guided')}
              >
                <span className={styles.depthIcon}>
                  <HelpCircle size={16} strokeWidth={1.75} />
                </span>
                <span className={styles.depthName}>A few guiding questions</span>
                <span className={styles.depthDesc}>Light prompts to get you thinking.</span>
              </button>
              <button
                className={`${styles.depthCard} ${
                  templateDepth === 'full' ? styles.selected : ''
                }`}
                onClick={() => setTemplateDepth('full')}
              >
                <span className={styles.depthIcon}>
                  <ClipboardList size={16} strokeWidth={1.75} />
                </span>
                <span className={styles.depthName}>Full character sheet</span>
                <span className={styles.depthDesc}>
                  Comprehensive fields for deep planning.
                </span>
              </button>
            </div>
            <p className={styles.depthNote}>You can change this any time in Settings.</p>
          </section>
        )}

        {/* Footer nav */}
        <footer className={styles.chooserFooter}>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip — just start writing
          </button>
          <div className={styles.navBtns}>
            {step > 1 && (
              <button className={styles.backBtn} onClick={back}>
                Back
              </button>
            )}
            {step < 4 ? (
              <button className={styles.nextBtn} onClick={next}>
                Next
              </button>
            ) : (
              <button className={styles.beginBtn} onClick={handleBegin}>
                Begin Writing
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
