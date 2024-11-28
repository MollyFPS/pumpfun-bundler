import express from 'express';
import { generateWallets, loadAllWallets, saveWallet, removeWallet } from '../../src/walletManager.js';
import { consolidateSOL, sellAllPositions, exportWalletInfo } from '../../src/walletUtils.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createToken } from '../../src/tokenManager.js';
import fs from 'fs';
import { Connection } from '@solana/web3.js';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import ProxyChain from 'proxy-chain';

const router = express.Router();

// Get all wallets
router.get('/wallets', async (req, res) => {
    try {
        const wallets = await loadAllWallets();
        res.json(wallets.map(wallet => ({
            type: wallet.type.toUpperCase(),
            address: wallet.keypair.publicKey.toString(),
            privateKey: bs58.encode(wallet.keypair.secretKey),
            solBalance: wallet.solBalance || 0,
            tokenBalances: wallet.tokenBalances || []
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new wallet
router.post('/wallets/create', async (req, res) => {
    try {
        const { type = 'FUNDING' } = req.body;
        console.log(`Creating new ${type} wallet...`);
        
        // Generate new wallet
        const wallet = Keypair.generate();
        
        // Save wallet
        await saveWallet(wallet, type.toLowerCase());
        
        // Return wallet info
        const walletInfo = {
            success: true,
            data: {
                type: type.toUpperCase(),
                address: wallet.publicKey.toString(),
                privateKey: bs58.encode(wallet.secretKey),
                solBalance: 0,
                tokenBalances: []
            }
        };
        
        console.log('Wallet created successfully:', walletInfo.data.address);
        res.json(walletInfo);
    } catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to create wallet' 
        });
    }
});

// Import existing wallet
router.post('/wallets/import', async (req, res) => {
    try {
        const { privateKey, type = 'FUNDING' } = req.body;
        const secretKey = bs58.decode(privateKey);
        const wallet = Keypair.fromSecretKey(secretKey);
        await saveWallet(wallet, type.toLowerCase());
        res.json({
            type: type.toUpperCase(),
            address: wallet.publicKey.toString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove wallet
router.delete('/wallets/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log('Attempting to remove wallet:', address);
        
        // Load current wallets
        const wallets = await loadAllWallets();
        
        // Check if wallet exists
        const walletExists = wallets.some(w => w.keypair.publicKey.toString() === address);
        if (!walletExists) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Remove the wallet
        await removeWallet(address);
        
        res.json({ 
            success: true,
            message: 'Wallet removed successfully' 
        });
    } catch (error) {
        console.error('Error removing wallet:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to remove wallet' 
        });
    }
});

// Consolidate SOL
router.post('/wallets/consolidate', async (req, res) => {
    try {
        await consolidateSOL();
        res.json({ message: 'SOL consolidated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sell all positions
router.post('/wallets/sell-all', async (req, res) => {
    try {
        await sellAllPositions();
        res.json({ message: 'All positions sold successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export wallet info
router.get('/wallets/export', async (req, res) => {
    try {
        const exportData = await exportWalletInfo();
        res.json(exportData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add token creation endpoint
router.post('/token/create', async (req, res) => {
    try {
        const { name, symbol, decimals, imageUrl, socials } = req.body;
        
        // Load config and create connection
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const connection = new Connection(config.RPC_URL, {
            commitment: 'confirmed',
            wsEndpoint: config.WS_URL
        });

        const result = await createToken(
            connection,
            decimals,
            null, // We don't have readline in API context
            name,
            symbol,
            imageUrl,
            socials
        );

        res.json({
            success: true,
            data: {
                mint: result.mint.toString(),
                pumpFunLink: result.pumpFunLink
            }
        });
    } catch (error) {
        console.error('Token creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to create token'
        });
    }
});

// Add this route to handle wallet generation
router.post('/wallets/generate', async (req, res) => {
    try {
        const { count = 5, type = 'FUNDING' } = req.body;
        
        // Validate count
        if (count < 1 || count > 20) {
            return res.status(400).json({
                success: false,
                error: 'Number of wallets must be between 1 and 20'
            });
        }

        // Validate type
        const validTypes = ['DEV', 'FUNDING', 'MICRO_TRADE', 'VOLUME_BOT'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet type'
            });
        }

        // Generate wallets
        const wallets = await generateWallets(count, type);
        
        // Return success response
        res.json({
            success: true,
            message: `Generated ${count} ${type} wallets successfully`,
            data: wallets
        });
    } catch (error) {
        console.error('Error generating wallets:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate wallets'
        });
    }
});

// Update the token lookup route
router.get('/token/:address', async (req, res) => {
    try {
        let { address } = req.params;
        
        // Extract token address from URL if provided
        if (address.includes('pump.fun/coin/')) {
            address = address.split('pump.fun/coin/')[1].split(/[?#]/)[0];
        }

        // First try to get the token data from pump.fun's API
        const response = await axios({
            method: 'get',
            url: `https://pump.fun/api/v1/token/info/${address}`,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'Origin': 'https://pump.fun',
                'Referer': `https://pump.fun/coin/${address}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.data) {
            const tokenData = response.data;
            const result = {
                success: true,
                data: {
                    name: tokenData.name || 'Unknown Token',
                    symbol: tokenData.symbol || '???',
                    marketCap: tokenData.marketCap || tokenData.market_cap || 0,
                    volume24h: tokenData.volume24h || tokenData.volume_24h || 0,
                    price: tokenData.price || 0,
                    imageUrl: tokenData.image || `https://pump.fun/token-icons/${address}.png`
                }
            };

            // Save token info to storage
            const TOKEN_STORAGE_FILE = 'storage/tokens.json';
            if (!fs.existsSync('storage')) {
                fs.mkdirSync('storage', { recursive: true });
            }

            let tokens = {};
            if (fs.existsSync(TOKEN_STORAGE_FILE)) {
                tokens = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));
            }

            tokens[address] = {
                ...result.data,
                updatedAt: new Date().toISOString()
            };

            fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(tokens, null, 2));

            res.json(result);
            return;
        }

        throw new Error('Token data not found');
    } catch (error) {
        console.error('Token lookup error:', error);
        
        // Try alternative endpoint
        try {
            const altResponse = await axios({
                method: 'get',
                url: `https://pump.fun/api/token/${address}`,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://pump.fun',
                    'Referer': `https://pump.fun/coin/${address}`
                }
            });

            if (altResponse.data) {
                const result = {
                    success: true,
                    data: {
                        name: altResponse.data.name || 'Unknown Token',
                        symbol: altResponse.data.symbol || '???',
                        marketCap: altResponse.data.marketCap || 0,
                        volume24h: altResponse.data.volume24h || 0,
                        price: altResponse.data.price || 0,
                        imageUrl: altResponse.data.image || `https://pump.fun/token-icons/${address}.png`
                    }
                };

                res.json(result);
                return;
            }
        } catch (altError) {
            console.error('Alternative endpoint error:', altError);
        }
        
        res.status(404).json({
            success: false,
            error: 'Failed to find token on pump.fun'
        });
    }
});

export default router; 