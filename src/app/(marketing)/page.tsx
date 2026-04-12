import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Feather,
  Eye,
  ScrollText,
  Dice6,
  Plus,
  BookOpen,
  PenLine,
  MessageCircle,
  FileText,
  Folder,
  ArrowRight,
  Quote,
} from 'lucide-react';
import { LandingAnimations } from './LandingAnimations';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'Nudge \u2014 A writing companion that asks questions, not answers',
  description:
    'Nudge reads your world \u2014 characters, lore, themes \u2014 then asks the questions that unlock your best work. Not a ghostwriter. A thinking partner.',
  openGraph: {
    type: 'website',
    url: 'https://writewithnudge.app/',
    title: 'Nudge \u2014 A writing companion that asks questions, not answers',
    description:
      'Nudge reads your world \u2014 characters, lore, themes \u2014 then asks the questions that unlock your best work. Not a ghostwriter. A thinking partner.',
    images: ['https://writewithnudge.app/web-app-manifest-512x512.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nudge \u2014 A writing companion that asks questions, not answers',
    description:
      'Nudge reads your world \u2014 characters, lore, themes \u2014 then asks the questions that unlock your best work. Not a ghostwriter. A thinking partner.',
    images: ['https://writewithnudge.app/web-app-manifest-512x512.png'],
  },
};

const templates = [
  { Icon: Sparkles, name: 'Fantasy Novel', tagline: 'Detailed worlds, deep magic, unforgettable characters.' },
  { Icon: Feather, name: 'Literary Fiction', tagline: 'Character-driven, idea-rich, deeply felt.' },
  { Icon: Eye, name: 'Mystery & Thriller', tagline: 'Tension, misdirection, and the satisfaction of revelation.' },
  { Icon: ScrollText, name: 'Essay & Nonfiction', tagline: 'Personal essays, video essays, memoir, and long-form nonfiction.' },
  { Icon: Dice6, name: 'Tabletop RPG', tagline: 'Follow your worlds, parties and campaigns.' },
  { Icon: Plus, name: 'Blank', tagline: 'Start from nothing. Build what you need.' },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingAnimations />

      {/* NAV */}
      <nav className={styles.nav} data-nav>
        <Link href="/" className={styles.logo}>
          <img src="/logo-no-bg.svg" alt="" className={styles.logoMark} aria-hidden="true" />
          Nudge
        </Link>
        <div className={styles.navRight}>
          <Link href="/login" className={styles.navLink}>Sign in</Link>
          <Link href="/signup" className={styles.navCta}>Start writing</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGradient} />
        <div className={styles.heroGrain} />
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>A writing companion</p>
            <h1>Your tools.<br />Your <em>work.</em></h1>
            <p className={styles.lede}>
              Nudge never writes for you. It reads your world &mdash; characters, lore,
              themes &mdash; then asks the questions that unlock your best work.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/signup" className={styles.btnPrimary}>
                Begin your story <ArrowRight size={16} strokeWidth={2} />
              </Link>
              <Link href="/login" className={styles.btnGhost}>Sign in</Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.mockup}>
              <div className={styles.mockupBar}>
                <div className={styles.traffic}><span /><span /><span /></div>
                <span className={styles.mockupName}>The Last Cartographer</span>
              </div>
              <div className={styles.mockupPanels}>
                <aside className={styles.mpTree}>
                  <div className={styles.mpSectionLabel}>The Draft</div>
                  <div className={`${styles.mpItem} ${styles.mpActive}`}>
                    <span className={`${styles.mpIc} ${styles.cGold}`}><FileText size={9} strokeWidth={2} /></span>
                    Chapter 1
                  </div>
                  <div className={styles.mpItem}>
                    <span className={`${styles.mpIc} ${styles.cGold} ${styles.mpDim}`}><FileText size={9} strokeWidth={2} /></span>
                    Chapter 2
                  </div>
                  <div className={styles.mpRule} />
                  <div className={styles.mpSectionLabel}>The Well</div>
                  <div className={styles.mpItem}>
                    <span className={`${styles.mpIc} ${styles.cTeal}`}><Folder size={9} strokeWidth={2} /></span>
                    Characters
                  </div>
                  <div className={styles.mpItem}>
                    <span className={`${styles.mpIc} ${styles.cTeal}`}><Folder size={9} strokeWidth={2} /></span>
                    World
                  </div>
                  <div className={styles.mpItem}>
                    <span className={`${styles.mpIc} ${styles.cTeal}`}><Folder size={9} strokeWidth={2} /></span>
                    Themes
                  </div>
                </aside>
                <div className={styles.mpEditor}>
                  <div className={styles.mpElabel}>Chapter 1 &mdash; Arrival</div>
                  <div className={styles.mpEbody}>
                    <p>
                      The map arrived at dawn, wrapped in oilskin and sealed with wax she did not
                      recognise. Elara turned it over in her hands before she let herself look at
                      what it showed.
                    </p>
                    <span className={styles.mpCursor} />
                  </div>
                </div>
                <div className={styles.mpChat}>
                  <div className={styles.mpClabel}>
                    <span className={styles.mpCdot} />Nudge
                  </div>
                  <div className={styles.mpCbody}>
                    <div className={styles.mpBubble}>
                      Elara distrusts maps &mdash; what does that fear cost her in this opening moment?
                    </div>
                  </div>
                  <div className={styles.mpCinput}>Reply to Nudge...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDITORIAL DIVIDER */}
      <div className={styles.divider}>
        <span className={styles.dividerRule} />
        <span className={styles.dividerOrnament}>&sect;</span>
        <span className={styles.dividerRule} />
      </div>

      {/* PHILOSOPHY */}
      <section className={styles.philosophy}>
        <div className={`${styles.philosophyInner} appear`}>
          <div className={styles.philosophyQuote}>
            <Quote size={28} strokeWidth={1.5} className={styles.quoteIcon} />
            <blockquote>
              Most AI writes for you.<br />
              <em>Nudge asks the questions<br />you haven&rsquo;t thought to ask.</em>
            </blockquote>
          </div>
          <div className={styles.philosophyBody}>
            <p>Writing tools that generate text do the thinking for you and steal your voice in the process.</p>
            <p>Nudge reads your shared notes, characters, world, themes and uses that knowledge to ask questions that lead to breakthroughs. Your companion never touches your draft.</p>
            <p className={styles.philosophyKicker}>The words are always yours.</p>
          </div>
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className={styles.pillars}>
        <div className={`${styles.pillarsIntro} appear`}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2>Work without friction.</h2>
        </div>
        <div className={styles.pillarsGrid}>
          <div className={`${styles.pillar} appear`} style={{ '--d': '0s' } as React.CSSProperties}>
            <span className={`${styles.pillarSym} ${styles.cTeal}`}><BookOpen size={24} strokeWidth={1.5} /></span>
            <h3>The Well</h3>
            <p>Organize your world across folders &mdash; characters, lore, setting, themes. Every note becomes context your AI companion draws from.</p>
          </div>
          <div className={`${styles.pillar} appear`} style={{ '--d': '0.12s' } as React.CSSProperties}>
            <span className={`${styles.pillarSym} ${styles.cGold}`}><PenLine size={24} strokeWidth={1.5} /></span>
            <h3>The Draft</h3>
            <p>A private sanctuary for your prose. Clean, distraction-free, and completely invisible to the AI. Your writing stays sacred.</p>
          </div>
          <div className={`${styles.pillar} appear`} style={{ '--d': '0.24s' } as React.CSSProperties}>
            <span className={`${styles.pillarSym} ${styles.cTeal}`}><MessageCircle size={24} strokeWidth={1.5} /></span>
            <h3>The Conversation</h3>
            <p>Ask questions. Work through scenes. Get asked back. Your companion has read your entire Well and brings it to every exchange.</p>
          </div>
        </div>
      </section>

      {/* EDITORIAL DIVIDER */}
      <div className={styles.divider}>
        <span className={styles.dividerRule} />
        <span className={styles.dividerOrnament}>&#8258;</span>
        <span className={styles.dividerRule} />
      </div>

      {/* TEMPLATES */}
      <section className={styles.templates}>
        <div className={`${styles.templatesIntro} appear`}>
          <p className={styles.sectionLabel}>Start here</p>
          <h2>Built for every kind of story.</h2>
          <p className={styles.templatesSub}>Begin with a structured template or build from scratch.</p>
        </div>
        <div className={styles.templatesGrid}>
          {templates.map((t, i) => (
            <div key={t.name} className={`${styles.tpl} appear`} style={{ '--d': `${i * 0.06}s` } as React.CSSProperties}>
              <span className={styles.tplIcon}><t.Icon size={18} strokeWidth={1.5} /></span>
              <div>
                <h4>{t.name}</h4>
                <p>{t.tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINALE */}
      <section className={styles.finale}>
        <div className={styles.finaleGlow} />
        <div className={`${styles.finaleInner} appear`}>
          <img src="/logo-no-bg.svg" alt="" className={styles.finaleLogoMark} aria-hidden="true" />
          <h2 className={styles.finaleHead}>Your story is waiting.</h2>
          <p className={styles.finaleSub}>Start with a template. Build your world. Finish your story.</p>
          <Link href="/signup" className={`${styles.btnPrimary} ${styles.finaleBtn}`}>
            Start writing free <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <span className={styles.footerLogo}>
          <img src="/logo-no-bg.svg" alt="" className={styles.footerLogoMark} aria-hidden="true" />
          Nudge
        </span>
        <div className={styles.footerLinks}>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </div>
        <p className={styles.footerCopy}>A writing companion that thinks alongside you.</p>
      </footer>
    </div>
  );
}
