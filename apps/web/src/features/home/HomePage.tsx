import { Link } from 'react-router-dom';
import { PageTitle } from '../../components/PageTitle';
import { ServiceCard } from '../../components/ServiceCard';
import { accelerators, businessServices, platformServices } from '../catalogue/catalogue';

export function HomePage() {
  return <div className="page">
    <section className="hero"><PageTitle eyebrow="Opus Technologies · Tokenization and Agentic Commerce" title="Opus Tokenization Accelerator Suite" description="Accelerators for banks and financial institutions that want to build, launch and run tokenization infrastructure, from asset and deposit tokens to stablecoins and consortium blockchain." /><p className="hero__copy">Choose an accelerator, or open a service directly. All interactive data in this preview is simulated.</p></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Accelerator suite</span><h2>Choose an accelerator</h2></div></div><div className="grid">{accelerators.map((accelerator) => <article className="card" key={accelerator.id}><span className="eyebrow">{accelerator.tag}</span><h3>{accelerator.name}</h3><p className="muted">{accelerator.description}</p><span className="muted">For {accelerator.audience}</span><div className="card__footer"><Link className="button button--outline button--small" to={`/suite/${accelerator.id}`}>View accelerator</Link></div></article>)}</div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Business services</span><h2>Open a service</h2></div><p>Interactive demo views use simulated data.</p></div><div className="grid">{businessServices.map((service) => <ServiceCard key={service.id} service={service} />)}</div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Platform</span><h2>Shared platform services</h2></div></div><div className="grid">{platformServices.map((service) => <ServiceCard key={service.id} service={service} />)}</div></section>
  </div>;
}
