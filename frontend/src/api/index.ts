import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

export interface Wallet {
  publicKey: string;
  balance: number;
  type: 'dev' | 'sub';
}

export async function getWallets(): Promise<Wallet[]> {
  const response = await axios.get(`${API_URL}/wallets`);
  return response.data;
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

export async function createToken(params: TokenCreateParams) {
  const response = await axios.post(`${API_URL}/token/create`, params);
  return response.data;
}

export async function importWallet(privateKey: string, type: 'dev' | 'sub') {
  const response = await axios.post(`${API_URL}/wallet/import`, { privateKey, type });
  return response.data;
}

export async function createWallet(type: 'dev' | 'sub') {
  const response = await axios.post(`${API_URL}/wallet/create`, { type });
  return response.data;
} 