import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ServiceLayout } from './ServiceLayout';
import styles from './Services.module.css';

const coins = ['USDC', 'PYUSD', 'RLUSD', 'USDP'];
const networks = ['Base', 'Ethereum', 'Arbitrum', 'Solana', 'Avalanche', 'Hyperledger Besu', 'Canton'];
const providers = ['Fireblocks', 'Circle Mint', 'Paxos Platform', 'BitGo'];
const wallets = ['Fireblocks Wallet', 'Anchorage Custody', 'BitGo Wallet', 'Bank-managed wallet'];
const steps = ['Stablecoin', 'Provider', 'Network', 'Wallets', 'Blueprint'];

export function StablecoinPage() {
  const [step, setStep] = useState(0);
  const [coin, setCoin] = useState('');
  const [provider, setProvider] = useState('');
  const [network, setNetwork] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [created, setCreated] = useState(false);
  const canContinue = [Boolean(coin), Boolean(provider), Boolean(network), selectedWallets.length > 0][step] ?? false;
  const toggleWallet = (wallet: string) => setSelectedWallets((current) => current.includes(wallet) ? current.filter((item) => item !== wallet) : [...current, wallet]);

  return <ServiceLayout name="Stablecoin Selector" eyebrow="Business service · Configuration wizard" description="Select an asset, infrastructure provider, network and wallets, then review a deployment blueprint.">
    <nav className={styles.stepNav} aria-label="Configuration steps">{steps.map((label, index) => <button key={label} type="button" className={`${styles.stepNavItem}${step === index ? ` ${styles.isCurrent}` : ''}${index < step ? ` ${styles.isDone}` : ''}`} onClick={() => index <= step && setStep(index)} disabled={index > step} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{label}</button>)}</nav>
    <section className="panel"><h2>{step === 4 ? 'Review configuration' : `Choose ${steps[step].toLowerCase()}`}</h2>
      {step === 0 && <div className={styles.optionGrid}>{coins.map((item) => <button type="button" key={item} aria-pressed={coin === item} className={`${styles.option}${coin === item ? ` ${styles.isSelected}` : ''}`} onClick={() => { setCoin(item); setProvider(''); setNetwork(''); setSelectedWallets([]); setCreated(false); }}><strong>{item}</strong><span>Eligible demo catalogue asset</span></button>)}</div>}
      {step === 1 && <div className={styles.optionGrid}>{providers.map((item) => <button type="button" key={item} aria-pressed={provider === item} className={`${styles.option}${provider === item ? ` ${styles.isSelected}` : ''}`} onClick={() => { setProvider(item); setNetwork(''); setSelectedWallets([]); }}><strong>{item}</strong><span>Mock provider adapter</span></button>)}</div>}
      {step === 2 && <div className={styles.optionGrid}>{networks.map((item) => <button type="button" key={item} aria-pressed={network === item} className={`${styles.option}${network === item ? ` ${styles.isSelected}` : ''}`} onClick={() => setNetwork(item)}><strong>{item}</strong><span>{item.includes('Hyperledger') || item === 'Canton' ? 'Permissioned' : 'Public'}</span></button>)}</div>}
      {step === 3 && <div className={styles.optionGrid}>{wallets.map((item) => <label key={item} className={`${styles.option} ${styles.optionCheck}${selectedWallets.includes(item) ? ` ${styles.isSelected}` : ''}`}><input type="checkbox" checked={selectedWallets.includes(item)} onChange={() => toggleWallet(item)} /><span><strong>{item}</strong><small>Signing remains with the custody provider</small></span></label>)}</div>}
      {step === 4 && <div className={styles.summaryGrid}><div><span>Stablecoin</span><strong>{coin}</strong></div><div><span>Provider</span><strong>{provider}</strong></div><div><span>Network</span><strong>{network}</strong></div><div><span>Wallets</span><strong>{selectedWallets.join(', ')}</strong></div><div className={`callout ${styles.summaryWide}`}>This is a preview only. Creating a blueprint does not provision infrastructure or connect to a real provider.</div>{created && <div className={`badge badge--good ${styles.summaryWide}`}>Demo blueprint prepared</div>}</div>}
      <div className={`toolbar ${styles.toolbarBetween}`}><button className="button button--outline" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>{step < 4 ? <button className="button" type="button" onClick={() => setStep((current) => Math.min(4, current + 1))} disabled={!canContinue}>Continue</button> : <button className="button" type="button" onClick={() => setCreated(true)} disabled={!coin || !provider || !network || selectedWallets.length === 0}>Prepare demo blueprint</button>}</div>
    </section>
    <p className="muted">Need to review the related policy? <Link to="/platform/compliance">Open Compliance &amp; Risk</Link></p>
  </ServiceLayout>;
}
