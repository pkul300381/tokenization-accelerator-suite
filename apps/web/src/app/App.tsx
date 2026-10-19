import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { ThemeProvider } from './theme/ThemeProvider';
import { HomePage } from '../features/home/HomePage';
import { AcceleratorPage } from '../features/home/AcceleratorPage';
import { StablecoinPage } from '../features/services/StablecoinPage';
import { WalletPage } from '../features/services/WalletPage';
import { FiatBridgePage } from '../features/services/FiatBridgePage';
import { GasPage } from '../features/services/GasPage';
import { AuditPage } from '../features/services/AuditPage';
import { CompliancePage } from '../features/platform/CompliancePage';
import { NotificationsPage } from '../features/platform/NotificationsPage';
import { GatewayPage } from '../features/platform/GatewayPage';
import { ArchitecturePage } from '../features/architecture/ArchitecturePage';

export function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="suite/:key" element={<AcceleratorPage />} />
            <Route path="services/stablecoin" element={<StablecoinPage />} />
            <Route path="services/wallet" element={<WalletPage />} />
            <Route path="services/fx" element={<FiatBridgePage />} />
            <Route path="services/gas" element={<GasPage />} />
            <Route path="services/audit" element={<AuditPage />} />
            <Route path="platform/compliance" element={<CompliancePage />} />
            <Route path="platform/notifications" element={<NotificationsPage />} />
            <Route path="platform/gateway" element={<GatewayPage />} />
            <Route path="architecture" element={<ArchitecturePage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
