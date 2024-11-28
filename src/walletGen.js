import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';
import chalk from 'chalk';

async function backupWallets(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return; // Nothing to backup if directory doesn't exist
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join('backups', `wallets_${timestamp}`);
    
    if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups', { recursive: true });
    }
    
    fs.mkdirSync(backupDir, { recursive: true });

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const srcPath = path.join(dirPath, file);
        const destPath = path.join(backupDir, file);
        fs.copyFileSync(srcPath, destPath);
    }
}

export async function generateWallets(count = 5) {
    try {
        // Load config
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const walletDir = config.WALLET_BUYERS_FOLDER;

        // Validate count
        if (count < 1 || count > 20) {
            throw new Error('Number of wallets must be between 1 and 20');
        }

        // Create all necessary directories
        const baseDir = path.dirname(walletDir);
        const devWalletDir = path.dirname(config.SECRET_KEY_PATH);

        fs.mkdirSync(baseDir, { recursive: true });
        fs.mkdirSync(walletDir, { recursive: true });
        fs.mkdirSync(devWalletDir, { recursive: true });

        // Backup existing wallets
        await backupWallets(walletDir);

        const generatedWallets = [];

        // Generate new wallets
        for (let i = 1; i <= count; i++) {
            const wallet = Keypair.generate();
            const walletData = {
                publicKey: wallet.publicKey.toString(),
                privateKey: bs58.encode(wallet.secretKey)
            };

            // Save wallet to file
            const walletPath = path.join(walletDir, `wallet${i}.json`);
            fs.writeFileSync(
                walletPath,
                JSON.stringify(Array.from(wallet.secretKey), null, 2)
            );

            // Also save to stored_wallets.json
            const storedWalletsPath = 'stored_wallets.json';
            let storedWallets = [];
            
            if (fs.existsSync(storedWalletsPath)) {
                storedWallets = JSON.parse(fs.readFileSync(storedWalletsPath, 'utf8'));
            }

            storedWallets.push({
                publicKey: wallet.publicKey.toString(),
                privateKey: bs58.encode(wallet.secretKey),
                type: 'sub',
                createdAt: new Date().toISOString()
            });

            fs.writeFileSync(storedWalletsPath, JSON.stringify(storedWallets, null, 2));

            generatedWallets.push(walletData);
            console.log(chalk.green(`Generated wallet ${i}/${count}`));
        }

        console.log(chalk.green(`Successfully generated ${count} wallets`));
        return generatedWallets;
    } catch (error) {
        console.error(chalk.red('Error generating wallets:', error));
        throw error;
    }
}

export default generateWallets;
