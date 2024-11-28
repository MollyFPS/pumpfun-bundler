export interface Wallet {
  publicKey: string;
  balance: number;
  type: 'dev' | 'sub';
}

export interface TokenCreateParams {
  name: string;
  symbol: string;
  decimals: number;
  imageUrl: string;
  socials: {
    telegram?: string;
    twitter?: string;
    website?: string;
  };
}

export interface SocketEvents {
  'price-update': (data: string) => void;
} 