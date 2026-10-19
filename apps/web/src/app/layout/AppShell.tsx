import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';
import styles from './AppShell.module.css';

const businessNav = [
  ['stablecoin', 'SC', 'Stablecoin Selector'],
  ['wallet', 'WA', 'Wallet Adapter'],
  ['fx', 'FX', 'Fiat Conversion Bridge'],
  ['gas', 'GF', 'Gas Fee Calculator'],
  ['audit', 'AR', 'Audit & Reporting'],
] as const;
const platformNav = [
  ['compliance', 'CR', 'Compliance & Risk'],
  ['notifications', 'NS', 'Notifications'],
  ['gateway', 'TG', 'Token Gateway'],
] as const;

export function AppShell() {
  const { theme, cycleTheme } = useTheme();
  return (
    <>
      <header className={styles.header}>
        <NavLink to="/" className={styles.brand} aria-label="Opus Tokenization Accelerator Suite home">
          <img src="/Opus-logo.webp" alt="Opus" />
          <span>Tokenization Accelerator Suite</span>
        </NavLink>
        <nav className={styles.topNav} aria-label="Primary navigation">
          <NavLink to="/">Suite</NavLink>
          <NavLink to="/architecture">Architecture</NavLink>
        </nav>
        <button className="button button--quiet" onClick={cycleTheme} type="button" aria-label="Change colour theme">
          Theme: {theme[0].toUpperCase() + theme.slice(1)}
        </button>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Suite navigation">
          <div className={styles.sidebarHead}><span className="eyebrow">Opus suite</span><h2>Business Services</h2></div>
          <nav aria-label="Business services">
            <NavLink to="/" end className={styles.sideLink}><span className={styles.icon}>OP</span>Suite home</NavLink>
            {businessNav.map(([path, icon, label]) => <NavLink key={path} to={`/services/${path}`} className={styles.sideLink}><span className={styles.icon}>{icon}</span>{label}</NavLink>)}
          </nav>
          <div className={styles.sidebarGroup}><span className="eyebrow">Platform</span>
            <nav aria-label="Platform services">
              {platformNav.map(([path, icon, label]) => <NavLink key={path} to={`/platform/${path}`} className={styles.sideLink}><span className={styles.icon}>{icon}</span>{label}</NavLink>)}
              <NavLink to="/architecture" className={styles.sideLink}><span className={styles.icon}>SA</span>Suite Architecture</NavLink>
            </nav>
          </div>
        </aside>
        <main id="main-content" className={styles.main} tabIndex={-1}><Outlet /></main>
      </div>
      <footer className={styles.footer}><span className="badge badge--accent">Simulated data</span><span>Interactive prototype · Demo environment · No real funds move</span></footer>
    </>
  );
}
