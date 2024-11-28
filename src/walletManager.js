import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import bs58 from 'bs58';

const WALLET_STORAGE_FILE = 'stored_wallets.json';

function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function ensureFileExists(filePath, defaultContent = '[]') {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, defaultContent);
    }
}

export async function generateWallets(count, type = 'FUNDING') {
    try {
        // Ensure the storage file exists
        ensureFileExists(WALLET_STORAGE_FILE);

        // Load config
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const walletDir = config.WALLET_BUYERS_FOLDER;

        // Create necessary directories
        ensureDirectoryExists(walletDir);
        ensureDirectoryExists(path.dirname(config.SECRET_KEY_PATH));

        const generatedWallets = [];
        let storedWallets = [];

        // Load existing wallets if any
        try {
            storedWallets = JSON.parse(fs.readFileSync(WALLET_STORAGE_FILE, 'utf8'));
        } catch (error) {
            console.error(chalk.yellow('No existing wallets found or error reading file'));
            storedWallets = [];
        }

        // Generate new wallets
        for (let i = 1; i <= count; i++) {
            const wallet = Keypair.generate();
            const walletData = {
                publicKey: wallet.publicKey.toString(),
                privateKey: bs58.encode(wallet.secretKey),
                type: type.toLowerCase(),
                createdAt: new Date().toISOString()
            };

            // Save individual wallet file with type in filename
            const walletPath = path.join(walletDir, `${type.toLowerCase()}_wallet${i}.json`);
            fs.writeFileSync(
                walletPath,
                JSON.stringify(Array.from(wallet.secretKey), null, 2)
            );

            // Add to stored wallets array
            storedWallets.push(walletData);
            generatedWallets.push(walletData);

            console.log(chalk.green(`Generated ${type} wallet ${i}/${count}`));
        }

        // Save updated stored wallets
        fs.writeFileSync(WALLET_STORAGE_FILE, JSON.stringify(storedWallets, null, 2));

        return generatedWallets;
    } catch (error) {
        console.error(chalk.red('Error generating wallets:', error));
        throw new Error(`Failed to generate wallets: ${error.message}`);
    }
}

export async function saveWallet(wallet, type = 'FUNDING', purpose = '') {
    try {
        ensureFileExists(WALLET_STORAGE_FILE);
        let storedWallets = [];
        
        try {
            storedWallets = JSON.parse(fs.readFileSync(WALLET_STORAGE_FILE, 'utf8'));
        } catch (error) {
            console.error(chalk.red('Error reading wallet storage, creating new file'));
            storedWallets = [];
        }

        storedWallets.push({
            publicKey: wallet.publicKey.toString(),
            privateKey: bs58.encode(wallet.secretKey),
            type,
            purpose,
            createdAt: new Date().toISOString()
        });

        fs.writeFileSync(WALLET_STORAGE_FILE, JSON.stringify(storedWallets, null, 2));
        console.log(chalk.green(`Wallet saved successfully as ${type} wallet`));
    } catch (error) {
        console.error(chalk.red('Error saving wallet:', error));
        throw error;
    }
}

export async function loadAllWallets() {
    const wallets = [];
    ensureFileExists(WALLET_STORAGE_FILE);

    try {
        const storedWallets = JSON.parse(fs.readFileSync(WALLET_STORAGE_FILE, 'utf8'));
        
        for (const wallet of storedWallets) {
            try {
                const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
                wallets.push({
                    keypair,
                    type: wallet.type || 'sub',
                    purpose: wallet.purpose,
                    createdAt: wallet.createdAt || new Date().toISOString()
                });
            } catch (error) {
                console.error(chalk.red(`Failed to load wallet ${wallet.publicKey}:`, error));
            }
        }

        console.log(chalk.gray(`Loaded ${wallets.length} wallets`));
    } catch (error) {
        console.error(chalk.red('Error loading wallets:', error));
    }

    return wallets;
}

export async function removeWallet(publicKey) {
    try {
        ensureFileExists(WALLET_STORAGE_FILE);
        let storedWallets = JSON.parse(fs.readFileSync(WALLET_STORAGE_FILE, 'utf8'));
        const initialLength = storedWallets.length;
        
        storedWallets = storedWallets.filter(w => w.publicKey !== publicKey);
        
        if (storedWallets.length === initialLength) {
            throw new Error('Wallet not found');
        }
        
        fs.writeFileSync(WALLET_STORAGE_FILE, JSON.stringify(storedWallets, null, 2));
        console.log(chalk.green(`Wallet ${publicKey} removed successfully`));
        return true;
    } catch (error) {
        console.error(chalk.red('Error removing wallet:', error));
        throw error;
    }
}

export async function loadDevWallet(config) {
    const devWalletPath = config.SECRET_KEY_PATH;
    if (fs.existsSync(devWalletPath)) {
        const devWalletKey = Uint8Array.from(JSON.parse(fs.readFileSync(devWalletPath, 'utf8')));
        return Keypair.fromSecretKey(devWalletKey);
    } else {
        throw new Error(`Dev wallet file not found at ${devWalletPath}`);
    }
}

async function loadDevWallets() {
    const devWalletsFile = 'dev_wallets.json';
    if (fs.existsSync(devWalletsFile)) {
        const devWallets = JSON.parse(fs.readFileSync(devWalletsFile, 'utf8'));
        return devWallets.map(wallet => ({
            keypair: Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet.privateKey))),
            type: 'dev',
            purpose: wallet.purpose,
            createdAt: wallet.createdAt
        }));
    }
    return [];
} 