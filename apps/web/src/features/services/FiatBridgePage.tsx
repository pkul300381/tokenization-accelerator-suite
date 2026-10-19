import { useMemo, useState } from 'react';
import { MetricCard } from '../../components/MetricCard';
import { formatMinorUnits, parseMinorUnits } from '../../lib/money';
import { ServiceLayout } from './ServiceLayout';

const fiatRates = { EUR: 921_200, GBP: 794_100, INR: 86_400_000, JPY: 151_200_000, SGD: 1_341_200, AUD: 1_523_000 } as const;
type FiatCode = keyof typeof fiatRates;

export function FiatBridgePage() {
  const [direction, setDirection] = useState<'to-coin' | 'to-fiat'>('to-coin');
  const [amount, setAmount] = useState('10000.00');
  const [currency, setCurrency] = useState<FiatCode>('EUR');
  const [coin, setCoin] = useState('USDC');
  const [quoteTime, setQuoteTime] = useState(() => Date.now());
  const amountCents = parseMinorUnits(amount);
  const rate = BigInt(fiatRates[currency]);
  const quote = useMemo(() => {
    const fiatCents = amountCents * rate / 1_000_000n;
    const spreadBps = coin === 'USDC' ? 4n : coin === 'PYUSD' ? 6n : coin === 'RLUSD' ? 7n : 8n;
    const feeCents = 150n;
    const outputCents = fiatCents * (10_000n - spreadBps) / 10_000n - feeCents;
    return { fiatCents, outputCents: outputCents > 0n ? outputCents : 0n, feeCents, spreadBps };
  }, [amountCents, coin, direction, rate]);

  return <ServiceLayout name="Fiat Conversion Bridge" eyebrow="Business service · Quote and conversion" description="Inspect a simulated fiat and stablecoin quote, with its expiry, spread and fee shown separately.">
    <div className="split"><section className="panel"><h2>Get a quote</h2><div className="toggle-row" role="group" aria-label="Conversion direction"><button aria-pressed={direction === 'to-coin'} className={direction === 'to-coin' ? 'is-active' : ''} onClick={() => { setDirection('to-coin'); setQuoteTime(Date.now()); }} type="button">Fiat to stablecoin</button><button aria-pressed={direction === 'to-fiat'} className={direction === 'to-fiat' ? 'is-active' : ''} onClick={() => { setDirection('to-fiat'); setQuoteTime(Date.now()); }} type="button">Stablecoin to fiat</button></div><label className="form-field">Amount ({direction === 'to-coin' ? 'USD' : coin})<input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setQuoteTime(Date.now()); }} aria-label="Amount in major currency units" /></label><div className="toolbar"><label className="form-field">Fiat currency<select value={currency} onChange={(event) => { setCurrency(event.target.value as FiatCode); setQuoteTime(Date.now()); }}>{Object.keys(fiatRates).map((code) => <option key={code}>{code}</option>)}</select></label><label className="form-field">Stablecoin<select value={coin} onChange={(event) => { setCoin(event.target.value); setQuoteTime(Date.now()); }}>{['USDC', 'PYUSD', 'RLUSD', 'USDP'].map((code) => <option key={code}>{code}</option>)}</select></label></div><button className="button button--outline" type="button" onClick={() => setQuoteTime(Date.now())}>Refresh quote</button></section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">Simulated quote</span><h2>Estimated conversion</h2></div><span className="badge badge--good">Valid for 30 seconds</span></div><MetricCard label="Estimated output" value={formatMinorUnits(quote.outputCents, direction === 'to-coin' ? coin : currency)} /><div className="table-wrap"><table><tbody><tr><th>Input amount</th><td className="number">{formatMinorUnits(amountCents, direction === 'to-coin' ? 'USD' : coin)}</td></tr><tr><th>Indicative rate</th><td className="number">1 USD = {(Number(fiatRates[currency]) / 1_000_000).toFixed(4)} {currency}</td></tr><tr><th>Spread</th><td className="number">{quote.spreadBps.toString()} bps</td></tr><tr><th>Service fee</th><td className="number">{formatMinorUnits(quote.feeCents)}</td></tr><tr><th>Quote refreshed</th><td className="number">{new Date(quoteTime).toLocaleTimeString()}</td></tr></tbody></table></div></section></div>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Reference rates</span><h2>Simulated FX market snapshot</h2></div><span className="badge">Demo values</span></div><div className="grid">{Object.entries(fiatRates).map(([code, rateValue]) => <MetricCard key={code} label={`USD / ${code}`} value={(Number(rateValue) / 1_000_000).toFixed(4)} note="Illustrative reference rate" />)}</div></section>
  </ServiceLayout>;
}
