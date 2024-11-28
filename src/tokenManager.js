import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import chalk from 'chalk';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

// Update the token save location
const TOKEN_STORAGE_FILE = 'storage/tokens.json';

async function saveDevWallet(wallet, purpose = 'token_creation') {
    const devWalletsFile = 'dev_wallets.json';
    let devWallets = [];
    
    if (fs.existsSync(devWalletsFile)) {
        devWallets = JSON.parse(fs.readFileSync(devWalletsFile, 'utf8'));
    }

    devWallets.push({
        publicKey: wallet.publicKey.toString(),
        privateKey: bs58.encode(wallet.secretKey),
        purpose: purpose,
        createdAt: new Date().toISOString()
    });

    fs.writeFileSync(devWalletsFile, JSON.stringify(devWallets, null, 2));
}

export async function createToken(connection, decimals = 9, rl = null, name, symbol, imageUrl, socials) {
    try {
        // Create token info directory if it doesn't exist
        await mkdir(TOKEN_INFO_DIR, { recursive: true });

        // Create a new wallet for the token
        const tokenWallet = Keypair.generate();
        
        // Save as dev wallet
        await saveDevWallet(tokenWallet, 'token_creation');

        // Generate pump.fun link
        const pumpFunLink = `https://pump.fun/token/${tokenWallet.publicKey.toString()}`;
        
        // Save information to a file
        const tokenInfo = {
            mint: tokenWallet.publicKey.toString(),
            pumpFunLink,
            walletPublicKey: tokenWallet.publicKey.toString(),
            walletPrivateKey: bs58.encode(tokenWallet.secretKey),
            walletType: 'dev',
            purpose: 'token_creation',
            name,
            symbol,
            decimals,
            imageUrl,
            socials,
            createdAt: new Date().toISOString()
        };

        // Create sanitized filename from token name
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filename = path.join(TOKEN_INFO_DIR, `token_info_${sanitizedName}.json`);
        
        fs.writeFileSync(filename, JSON.stringify(tokenInfo, null, 2));
        
        // If we have readline (CLI mode), log to console
        if (rl) {
            console.log(chalk.green('\nToken information has been saved to:'), filename);
            console.log(chalk.yellow('\nNOTE: Visit pump.fun and use the mint address to list your token'));
        }
        
        return {
            mint: tokenWallet.publicKey,
            tokenWallet,
            pumpFunLink
        };
    } catch (error) {
        console.error(chalk.red('Failed to create token:', error));
        throw error;
    }
}

export async function setupTokenMetadata(connection, token, metadata) {
    try {
        const { name, symbol, imageUrl, socials } = metadata;
        
        console.log(chalk.yellow('\nSetting up token metadata...'));
        console.log(chalk.cyan('Name:'), name);
        console.log(chalk.cyan('Symbol:'), symbol);
        console.log(chalk.cyan('Image URL:'), imageUrl);
        console.log(chalk.cyan('Telegram:'), socials.telegram || 'Not provided');
        console.log(chalk.cyan('Twitter:'), socials.twitter || 'Not provided');
        console.log(chalk.cyan('Website:'), socials.website || 'Not provided');
        
        return true;
    } catch (error) {
        console.error(chalk.red('Failed to setup token metadata:', error));
        throw error;
    }
}

export async function getTokenBalance(connection, tokenAccount) {
    try {
        const balance = await connection.getTokenAccountBalance(tokenAccount);
        return balance.value.uiAmount;
    } catch (error) {
        console.error(chalk.red('Failed to get token balance:', error));
        throw error;
    }
}

// Update the save function to use a single file
async function saveTokenInfo(tokenInfo) {
    // Create storage directory if it doesn't exist
    if (!fs.existsSync('storage')) {
        fs.mkdirSync('storage', { recursive: true });
    }

    // Load existing tokens
    let tokens = {};
    if (fs.existsSync(TOKEN_STORAGE_FILE)) {
        tokens = JSON.parse(fs.readFileSync(TOKEN_STORAGE_FILE, 'utf8'));
    }

    // Add or update token info
    tokens[tokenInfo.mint] = {
        ...tokenInfo,
        updatedAt: new Date().toISOString()
    };

    // Save to single file
    fs.writeFileSync(TOKEN_STORAGE_FILE, JSON.stringify(tokens, null, 2));
} 