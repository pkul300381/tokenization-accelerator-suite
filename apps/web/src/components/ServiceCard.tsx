import { Link } from 'react-router-dom';
import type { Service } from '../features/catalogue/catalogue';

export function ServiceCard({ service }: { service: Service }) {
  const content = <><span className={`badge ${service.status === 'Planned' ? '' : 'badge--good'}`}>{service.status}</span><h3>{service.name}</h3><p className="muted">{service.description}</p></>;
  return service.status === 'Planned'
    ? <article className="card" aria-label={`${service.name}, planned`}>{content}<span className="card__footer muted">Planned extension</span></article>
    : <Link className="card" to={service.route}>{content}<span className="card__footer"><span className="button button--outline button--small">Open service</span></span></Link>;
}
