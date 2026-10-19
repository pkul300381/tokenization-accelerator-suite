export type Service = { id: string; name: string; description: string; route: string; status: 'Beta · demo' | 'Planned' };
export type Accelerator = { id: string; name: string; tag: string; description: string; audience: string; services: { label: string; route: string }[] };

export const businessServices: Service[] = [
  { id: 'stablecoin', name: 'Stablecoin Selector', description: 'Choose an asset, provider, network, and wallets for a tokenization configuration.', route: '/services/stablecoin', status: 'Beta · demo' },
  { id: 'wallet', name: 'Wallet Adapter', description: 'Review registered wallets, supported networks, and signing configuration.', route: '/services/wallet', status: 'Beta · demo' },
  { id: 'fx', name: 'Fiat Conversion Bridge', description: 'Explore simulated fiat and stablecoin quotes with a transparent fee breakdown.', route: '/services/fx', status: 'Beta · demo' },
  { id: 'gas', name: 'Gas Fee Calculator', description: 'Estimate transaction network costs for end users and administrators.', route: '/services/gas', status: 'Beta · demo' },
  { id: 'audit', name: 'Audit & Reporting', description: 'Filter an illustrative transaction ledger and export a CSV report.', route: '/services/audit', status: 'Beta · demo' },
  { id: 'chainsync', name: 'ChainSync Integration Layer', description: 'Connect off-chain corporate-action workflows to on-chain settlement.', route: '/suite/chainsync', status: 'Planned' },
];

export const platformServices: Service[] = [
  { id: 'compliance', name: 'Compliance & Risk Engine', description: 'Review illustrative allow, review, or block decisions and their reason codes.', route: '/platform/compliance', status: 'Beta · demo' },
  { id: 'notifications', name: 'Notification Service', description: 'Review simulated transaction and compliance alerts.', route: '/platform/notifications', status: 'Beta · demo' },
  { id: 'gateway', name: 'Token Gateway', description: 'Explore the suite’s public API route and scope contract.', route: '/platform/gateway', status: 'Beta · demo' },
];

export const accelerators: Accelerator[] = [
  { id: 'asset', name: 'Asset Tokenization Services', tag: 'Digital asset tokenization', description: 'Services designed to integrate with core L2 infrastructure to build and maintain tokenization of real-world assets.', audience: 'Banks and real estate developers', services: [] },
  { id: 'deposit', name: 'Deposit Token Services', tag: 'Deposit tokens', description: 'Core integration services that turn bank-supported financial instruments into deposit tokens.', audience: 'Banks and financial institutions', services: [{ label: 'Fiat Conversion Bridge', route: '/services/fx' }] },
  { id: 'chainsync', name: 'ChainSync Integration Layer', tag: 'Off-chain · on-chain integration', description: 'An integration accelerator connecting traditional financial messaging and reference data to coordinated off-chain processing and on-chain settlement.', audience: 'Banks, transfer agents, paying agents, custodians and financial institutions', services: [{ label: 'Audit & Reporting', route: '/services/audit' }, { label: 'Architecture', route: '/architecture' }] },
  { id: 'stable', name: 'Stablecoin Enabler Services', tag: 'Stablecoins', description: 'A customisable framework for banks and financial institutions to build stablecoin services.', audience: 'Financial institutions dealing with stablecoins', services: [{ label: 'Stablecoin Selector', route: '/services/stablecoin' }, { label: 'Wallet Adapter', route: '/services/wallet' }, { label: 'Fiat Conversion Bridge', route: '/services/fx' }, { label: 'Gas Fee Calculator', route: '/services/gas' }] },
  { id: 'chain', name: 'Opus Blockchain Setup', tag: 'Consortium blockchain', description: 'A consortium or permissioned blockchain that maintains a shared ledger across its members.', audience: 'Financial institutions, banks and agentic commerce', services: [{ label: 'Stablecoin Selector', route: '/services/stablecoin' }, { label: 'Audit & Reporting', route: '/services/audit' }] },
];

export const gatewayRoutes = [
  ['/v1/catalogue', 'Catalogue API', 'catalogue.read', 'Yes'],
  ['/v1/selector', 'Selector API', 'selector.read, selector.write', 'No'],
  ['/v1/wallets', 'Wallet Adapter', 'wallets.read, wallets.write', 'Yes'],
  ['/v1/fx', 'Conversion API', 'fx.read, fx.execute', 'Yes'],
  ['/v1/audit', 'Audit API', 'audit.read', 'No'],
  ['/v1/compliance', 'Compliance API', 'compliance.read, compliance.decide', 'No'],
  ['/v1/notifications', 'Notification API', 'notifications.read, notifications.ack', 'Yes'],
  ['/v1/deployments', 'Deployment API', 'deploy.start, deploy.read', 'No'],
];
