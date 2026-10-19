import { useState } from 'react';
import { ServiceLayout } from './ServiceLayout';

const networks = ['Ethereum', 'Base', 'Arbitrum', 'Solana', 'XRPL', 'Besu', 'Canton'];
const walletRows = [
  { name: 'Fireblocks Wallet', custody: 'Custodial · MPC', signing: 'MPC threshold', networks: ['Ethereum', 'Base', 'Arbitrum', 'Solana'] },
  { name: 'Anchorage Custody', custody: 'Qualified custodian', signing: 'HSM policy engine', networks: ['Ethereum', 'Base', 'Arbitrum'] },
  { name: 'BitGo Wallet', custody: 'Qualified custody', signing: 'Multi-signature', networks: ['Ethereum', 'Base', 'Solana', 'XRPL'] },
  { name: 'Bank-managed wallet', custody: 'Bank controlled', signing: 'Bank HSM', networks: ['Besu', 'Canton'] },
];

export function WalletPage() {
  const [walletType, setWalletType] = useState('Fireblocks Wallet');
  const [saved, setSaved] = useState(false);
  return <ServiceLayout name="Wallet Adapter" eyebrow="Business service · Wallet registry" description="Review wallet custody models, signing modes and network compatibility.">
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Compatibility matrix</span><h2>Wallets by network</h2></div><span className="badge">Illustrative support</span></div><div className="table-wrap"><table><thead><tr><th>Wallet</th><th>Custody model</th><th>Signing</th>{networks.map((network) => <th key={network}>{network}</th>)}</tr></thead><tbody>{walletRows.map((wallet) => <tr key={wallet.name}><th scope="row">{wallet.name}</th><td>{wallet.custody}</td><td>{wallet.signing}</td>{networks.map((network) => <td key={network} aria-label={`${network}: ${wallet.networks.includes(network) ? 'supported' : 'not supported'}`}>{wallet.networks.includes(network) ? '●' : '—'}</td>)}</tr>)}</tbody></table></div></section>
    <section className="panel"><h2>Register a wallet (demo)</h2><div className="toolbar"><label className="form-field">Wallet<select value={walletType} onChange={(event) => { setWalletType(event.target.value); setSaved(false); }}>{walletRows.map((wallet) => <option key={wallet.name}>{wallet.name}</option>)}</select></label><button className="button" type="button" onClick={() => setSaved(true)}>Register demo wallet</button></div>{saved && <p className="badge badge--good" role="status">{walletType} added to this local demo session. No connection was made.</p>}<p className="muted">Real registration requires server-side address validation and a signed ownership challenge.</p></section>
  </ServiceLayout>;
}
