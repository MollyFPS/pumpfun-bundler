import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import WalletManager from './pages/WalletManager';
import VolumeBot from './pages/VolumeBot';
import MicroTrader from './pages/MicroTrader';
import BundledBuy from './pages/BundledBuy';
import AutoBundler from './pages/AutoBundler';
import Settings from './pages/Settings';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/wallets" element={<WalletManager />} />
      <Route path="/volume" element={<VolumeBot />} />
      <Route path="/trader" element={<MicroTrader />} />
      <Route path="/bundled-buy" element={<BundledBuy />} />
      <Route path="/auto-bundler" element={<AutoBundler />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
} 