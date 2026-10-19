import { useEffect, useRef } from 'react';
import { PageTitle } from '../../components/PageTitle';
import { useTheme } from '../../app/theme/ThemeProvider';
import styles from './ArchitecturePage.module.css';

export function ArchitecturePage() {
  const { theme } = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const syncTheme = () => frame.current?.contentWindow?.postMessage({ type: 'opus-theme', theme }, '*');
  useEffect(syncTheme, [theme]);
  return <div className="page"><PageTitle eyebrow="Platform blueprint · L3 and L4" title="Tokenization Suite Architecture" description="Explore how the suite connects client experiences, the Token Gateway, business services, event processing, adapters, security and delivery infrastructure." /><div className="section-heading"><div><span className="badge badge--accent">Layered architecture</span> <span className="badge">Cloud-agnostic · open-source first</span></div><a className="button button--outline button--small" href="/architecture.html" target="_blank" rel="noopener">Open diagram in a new tab</a></div><div className={styles.frameWrap}><iframe ref={frame} onLoad={syncTheme} className={styles.frame} src="/architecture.html" title="Tokenization Suite layered architecture diagram" loading="lazy" /></div><p className="muted">The architecture view is maintained as a separate reference document and synchronized into the app at start/build time.</p></div>;
}
