import { Link, useParams } from 'react-router-dom';
import { PageTitle } from '../../components/PageTitle';
import { accelerators } from '../catalogue/catalogue';

export function AcceleratorPage() {
  const { key } = useParams();
  const accelerator = accelerators.find((item) => item.id === key);
  if (!accelerator) return <section className="empty">Accelerator not found. <Link to="/">Return to the suite</Link></section>;
  return <div className="page"><p className="breadcrumbs"><Link to="/">Suite</Link> / {accelerator.name}</p><PageTitle eyebrow={accelerator.tag} title={accelerator.name} description={accelerator.description} /><div className="split"><section className="panel"><h2>Who it is for</h2><p>{accelerator.audience}</p></section><section className="panel"><h2>Related suite views</h2>{accelerator.services.length ? accelerator.services.map((service) => <Link key={service.route} to={service.route}>{service.label} →</Link>) : <p className="muted">This accelerator is an overview in the demo. Its dedicated workflow is not included yet.</p>}</section></div></div>;
}
