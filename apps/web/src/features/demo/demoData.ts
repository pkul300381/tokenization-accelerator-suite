export type DemoTransaction = { id: string; date: string; type: string; asset: string; chain: string; wallet: string; amount: number; status: 'Confirmed' | 'Pending' | 'Failed'; compliance: 'Pass' | 'Review' | 'Blocked'; hash: string };

// Local presentation fixtures only. Replace these with API responses when the API is available.
export const demoTransactions: DemoTransaction[] = [
  { id: 'TX-100240', date: '2026-10-16 12:03 UTC', type: 'Transfer', asset: 'USDC', chain: 'Base', wallet: 'Fireblocks Wallet', amount: 10000, status: 'Failed', compliance: 'Review', hash: '0x3fa9c2d1a24ef135e87b40' },
  { id: 'TX-100239', date: '2026-10-16 11:48 UTC', type: 'Treasury payout', asset: 'USDC', chain: 'Base', wallet: 'Bank-managed wallet', amount: 2500, status: 'Confirmed', compliance: 'Pass', hash: '0xa01e9b1242ba7108a8d012' },
  { id: 'TX-100238', date: '2026-10-16 11:30 UTC', type: 'Mint', asset: 'PYUSD', chain: 'Ethereum', wallet: 'Anchorage Custody', amount: 18000, status: 'Pending', compliance: 'Review', hash: '0x897bc3aa100a3212fe019a' },
  { id: 'TX-100237', date: '2026-10-15 17:10 UTC', type: 'Redeem', asset: 'RLUSD', chain: 'XRPL', wallet: 'BitGo Wallet', amount: 7200, status: 'Confirmed', compliance: 'Pass', hash: '0x0ed231acc0be111d91a005' },
  { id: 'TX-100236', date: '2026-10-15 16:02 UTC', type: 'Agent payment', asset: 'USDC', chain: 'Arbitrum', wallet: 'Fireblocks Wallet', amount: 45500, status: 'Confirmed', compliance: 'Pass', hash: '0x7b3920fac12d901d23a115' },
  { id: 'TX-100235', date: '2026-10-15 14:22 UTC', type: 'Transfer', asset: 'USDP', chain: 'Ethereum', wallet: 'BitGo Wallet', amount: 925, status: 'Failed', compliance: 'Blocked', hash: '0x1235bcf0a332ceaa901b11' },
  { id: 'TX-100234', date: '2026-10-14 09:18 UTC', type: 'Transfer', asset: 'USDC', chain: 'Canton', wallet: 'Bank-managed wallet', amount: 22000, status: 'Confirmed', compliance: 'Pass', hash: '0x223aa443ee312a004011' },
  { id: 'TX-100233', date: '2026-10-13 22:51 UTC', type: 'Treasury payout', asset: 'PYUSD', chain: 'Solana', wallet: 'Anchorage Custody', amount: 8400, status: 'Confirmed', compliance: 'Pass', hash: '0x08ff923d1180ab3395c011' },
];

export const demoNotifications = [
  { id: 'ntf_4411', severity: 'Critical', type: 'chain_tx.failed', title: 'Transaction failed on Base', body: 'USDC 10,000 · transaction 0x3fa9c2d1…e87b40 · insufficient gas', time: '2026-10-16 12:03 UTC' },
  { id: 'ntf_4408', severity: 'Info', type: 'chain_tx.confirmed', title: 'Transaction succeeded on Base', body: 'USDC 2,500 · transaction 0xa01e9b12…a8d012 · confirmed', time: '2026-10-16 11:48 UTC' },
  { id: 'ntf_4402', severity: 'High', type: 'compliance.decision_recorded', title: 'Compliance review required', body: 'Quote qte_9a1 · reason AMOUNT_ABOVE_TYPICAL', time: '2026-10-16 11:30 UTC' },
];
