import { useMemo, useState } from 'react';
import { formatUsdMicros } from '../../lib/money';
import { ServiceLayout } from './ServiceLayout';

const chains = [
  { name: 'Ethereum', kind: 'Public', baseMicros: 1_850_000 },
  { name: 'Base', kind: 'Public', baseMicros: 4_000 },
  { name: 'Arbitrum', kind: 'Public', baseMicros: 12_000 },
  { name: 'Solana', kind: 'Public', baseMicros: 2_500 },
  { name: 'Hyperledger Besu', kind: 'Permissioned', baseMicros: 400 },
  { name: 'Canton', kind: 'Permissioned', baseMicros: 1_000 },
];
const txTypes = { Transfer: 1, Mint: 3, Redeem: 2, 'Treasury payout': 2, 'Agent payment': 2 } as const;
type TxType = keyof typeof txTypes;

export function GasPage() {
  const [chainName, setChainName] = useState('Base');
  const [type, setType] = useState<TxType>('Transfer');
  const [volume, setVolume] = useState(20000);
  const [congestionTenths, setCongestionTenths] = useState(10);
  const [marginBps, setMarginBps] = useState(200);
  const [admin, setAdmin] = useState(false);
  const chain = chains.find((item) => item.name === chainName) ?? chains[0];
  const estimate = useMemo(() => {
    const congestion = chain.kind === 'Public' ? BigInt(congestionTenths) : 10n;
    const network = BigInt(chain.baseMicros) * BigInt(txTypes[type]) * congestion / 10n;
    const infra = network + 15_000n;
    const price = infra * (10_000n + BigInt(marginBps)) / 10_000n;
    return { network, infra, price, monthlyInfra: infra * BigInt(volume), monthlyMargin: (price - infra) * BigInt(volume) };
  }, [chain, congestionTenths, marginBps, type, volume]);

  return <ServiceLayout name="Gas Fee Calculator" eyebrow="Business service · Network cost estimator" description="Estimate simulated network costs and the infrastructure margin for common token operations.">
    <div className="split"><section className="panel"><h2>Estimate inputs</h2><label className="form-field">Network<select value={chainName} onChange={(event) => setChainName(event.target.value)}>{chains.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="form-field">Transaction type<select value={type} onChange={(event) => setType(event.target.value as TxType)}>{Object.keys(txTypes).map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field">Transactions per month <strong>{volume.toLocaleString()}</strong><input type="range" min="1000" max="200000" step="1000" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label><label className="form-field">Network congestion <strong>{(congestionTenths / 10).toFixed(1)}×</strong><input type="range" min="10" max="50" step="1" value={congestionTenths} onChange={(event) => setCongestionTenths(Number(event.target.value))} disabled={chain.kind === 'Permissioned'} /></label><label className="form-field">Administrator margin <strong>{(marginBps / 100).toFixed(1)}%</strong><input type="range" min="0" max="2000" step="50" value={marginBps} onChange={(event) => setMarginBps(Number(event.target.value))} /></label><div className="toggle-row" role="group" aria-label="Estimate view"><button type="button" aria-pressed={!admin} className={!admin ? 'is-active' : ''} onClick={() => setAdmin(false)}>End user</button><button type="button" aria-pressed={admin} className={admin ? 'is-active' : ''} onClick={() => setAdmin(true)}>Administrator</button></div><p className="muted">Congestion applies to public networks only. Permissioned networks use a fixed-cost estimate.</p></section>
      <section className="panel"><span className="eyebrow">{admin ? 'Administrator economics' : 'End-user estimate'}</span><h2>{admin ? 'Monthly economics' : 'Estimated cost per transaction'}</h2><div className="grid grid--metrics">{admin ? <><div className="metric"><span className="metric__label">Network fee</span><strong className="metric__value">{formatUsdMicros(estimate.network)}</strong></div><div className="metric"><span className="metric__label">Infrastructure cost</span><strong className="metric__value">{formatUsdMicros(estimate.infra)}</strong></div><div className="metric"><span className="metric__label">Monthly infrastructure cost</span><strong className="metric__value">{formatUsdMicros(estimate.monthlyInfra)}</strong></div><div className="metric"><span className="metric__label">Monthly margin</span><strong className="metric__value">{formatUsdMicros(estimate.monthlyMargin)}</strong></div></> : <><div className="metric"><span className="metric__label">Price per transaction</span><strong className="metric__value">{formatUsdMicros(estimate.price)}</strong></div><div className="metric"><span className="metric__label">Network</span><strong className="metric__value">{chain.name}</strong></div></>}</div><div className="callout">Estimate uses a demo cost schedule. It is not a live fee quote and should not be used to price a production transaction.</div></section></div>
  </ServiceLayout>;
}
