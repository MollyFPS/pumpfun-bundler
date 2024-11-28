import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Wallet, TokenCreateParams } from '../types/api';

interface AppState {
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
  setWallets: (wallets: Wallet[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      wallets: [],
      isLoading: false,
      error: null,
      setWallets: (wallets) => set({ wallets }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'app-store',
    }
  )
); 