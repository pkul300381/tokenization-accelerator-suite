import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageTitle } from '../../components/PageTitle';

export function ServiceLayout({ name, eyebrow, description, children }: { name: string; eyebrow: string; description: string; children: ReactNode }) {
  return <div className="page"><p className="breadcrumbs"><Link to="/">Suite</Link> / {name}</p><PageTitle eyebrow={eyebrow} title={name} description={description} /><div className="callout">Demo view · All values are simulated. No provider, wallet, blockchain network, or real funds are connected.</div>{children}</div>;
}
