import { useMemo, useState } from 'react';
import { MetricCard } from '../../components/MetricCard';
import { demoTransactions } from '../demo/demoData';
import { ServiceLayout } from './ServiceLayout';

export function AuditPage() {
  const [status, setStatus] = useState('All');
  const [chain, setChain] = useState('All');
  const rows = useMemo(() => demoTransactions.filter((row) => (status === 'All' || row.status === status) && (chain === 'All' || row.chain === chain)), [chain, status]);
  const total = rows.reduce((sum, row) => sum + BigInt(row.amount) * 100n, 0n);
  const totalThousands = `$${total / 100_000n}.${(total % 100_000n) / 10_000n}K`;
  const confirmed = rows.filter((row) => row.status === 'Confirmed').length;
  const flagged = rows.filter((row) => row.compliance !== 'Pass').length;
  const exportCsv = () => {
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const content = [['Transaction', 'Time', 'Type', 'Asset', 'Chain', 'Wallet', 'Amount USD', 'Status', 'Compliance', 'Hash'], ...rows.map((row) => [row.id, row.date, row.type, row.asset, row.chain, row.wallet, row.amount, row.status, row.compliance, row.hash])].map((line) => line.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'opus-audit-demo.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <ServiceLayout name="Audit & Reporting" eyebrow="Business service · Transaction record" description="Filter a small illustrative transaction ledger, review aggregate activity, and export the current view.">
    <div className="grid grid--metrics"><MetricCard label="Transaction volume" value={totalThousands} /><MetricCard label="Transactions" value={String(rows.length)} /><MetricCard label="Confirmed" value={`${rows.length ? Math.round(confirmed / rows.length * 100) : 0}%`} /><MetricCard label="Review or blocked" value={String(flagged)} /></div>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Audit ledger</span><h2>Transactions</h2></div><div className="toolbar"><label className="form-field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{['All', 'Confirmed', 'Pending', 'Failed'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field">Network<select value={chain} onChange={(event) => setChain(event.target.value)}>{['All', ...new Set(demoTransactions.map((row) => row.chain))].map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button--outline" type="button" onClick={exportCsv}>Export CSV</button></div></div>
      <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Time</th><th>Type</th><th>Asset</th><th>Network</th><th>Wallet</th><th className="number">Amount</th><th>Status</th><th>Compliance</th><th>Hash</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="mono">{row.id}</td><td>{row.date}</td><td>{row.type}</td><td>{row.asset}</td><td>{row.chain}</td><td>{row.wallet}</td><td className="number">${row.amount.toLocaleString()}</td><td><span className={`badge ${row.status === 'Confirmed' ? 'badge--good' : row.status === 'Pending' ? 'badge--warn' : 'badge--bad'}`}>{row.status}</span></td><td>{row.compliance}</td><td className="mono">{row.hash.slice(0, 12)}…</td></tr>)}</tbody></table>{rows.length === 0 && <p className="empty">No transactions match these filters.</p>}</div>
      <p className="muted">Demo records only. Production audit data must be retrieved from the API and remain append-only.</p></section>
  </ServiceLayout>;
}
