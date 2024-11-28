import { PublicKey, Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';
import { loadAllWallets, saveWallet, removeWallet } from './walletManager.js';
import { createSellTXWithTip } from './createSellTX.js';
import sendBundle from './sendBundle.js';
import { getStatusLine } from './utils/priceTracker.js';
import { rl } from './utils/readline.js';

async function addNewWallet(type = 'sub') {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const wallet = Keypair.generate();
        await saveWallet(wallet, type);
        console.log(chalk.green('\nNew wallet created:'));
        console.log(chalk.cyan('Public Key:'), wallet.publicKey.toString());
        console.log(chalk.yellow('Private Key:'), bs58.encode(wallet.secretKey));
        return wallet;
    } catch (error) {
        console.error(chalk.red('Failed to create wallet:', error));
        throw error;
    }
}

async function importWallet(privateKey, type = 'sub') {
    try {
        const secretKey = bs58.decode(privateKey);
        const wallet = Keypair.fromSecretKey(secretKey);
        await saveWallet(wallet, type);
        console.log(chalk.green('\nWallet imported successfully:'));
        console.log(chalk.cyan('Public Key:'), wallet.publicKey.toString());
        return wallet;
    } catch (error) {
        console.error(chalk.red('Failed to import wallet:', error));
        throw error;
    }
}

export async function viewAllWallets() {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const connection = new Connection(config.RPC_URL);
        const wallets = await loadAllWallets(config);

        // Show status line
        console.log(getStatusLine());
        console.log(chalk.gray('─'.repeat(100)));

        // Show dev wallets
        console.log(chalk.blue('\nDev Wallets:'));
        console.log(chalk.gray('─'.repeat(100)));
        
        const devWallets = wallets.filter(w => w.type === 'dev');
        if (devWallets.length === 0) {
            console.log(chalk.yellow('No dev wallets found'));
        }

        for (const wallet of devWallets) {
            const balance = await connection.getBalance(wallet.keypair.publicKey);
            console.log(chalk.green(`Address: ${wallet.keypair.publicKey.toString()}`));
            console.log(chalk.yellow(`Private Key: ${bs58.encode(wallet.keypair.secretKey)}`));
            console.log(chalk.cyan(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`));
            
            // Get token balances
            const tokens = await getTokenBalances(connection, wallet.keypair.publicKey);
            if (tokens.length > 0) {
                console.log(chalk.yellow('Token Holdings:'));
                tokens.forEach(token => {
                    console.log(chalk.cyan(`- ${token.mint}: ${token.amount}`));
                });
            }
            console.log(chalk.gray('─'.repeat(50)));
        }

        // Show funding wallets
        console.log(chalk.blue('\nFunding Wallets:'));
        console.log(chalk.gray('─'.repeat(100)));
        
        const fundingWallets = wallets.filter(w => w.type === 'sub');
        if (fundingWallets.length === 0) {
            console.log(chalk.yellow('No funding wallets found'));
        }

        for (const wallet of fundingWallets) {
            const balance = await connection.getBalance(wallet.keypair.publicKey);
            console.log(chalk.green(`Address: ${wallet.keypair.publicKey.toString()}`));
            console.log(chalk.yellow(`Private Key: ${bs58.encode(wallet.keypair.secretKey)}`));
            console.log(chalk.cyan(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`));
            
            // Get token balances
            const tokens = await getTokenBalances(connection, wallet.keypair.publicKey);
            if (tokens.length > 0) {
                console.log(chalk.yellow('Token Holdings:'));
                tokens.forEach(token => {
                    console.log(chalk.cyan(`- ${token.mint}: ${token.amount}`));
                });
            }
            console.log(chalk.gray('─'.repeat(50)));
        }

        // Show wallet management options
        console.log(chalk.blue('\nWallet Management Options:'));
        console.log(chalk.cyan('1.'), 'Add New Wallet');
        console.log(chalk.cyan('2.'), 'Import Existing Wallet');
        console.log(chalk.cyan('3.'), 'Remove Wallet');
        console.log(chalk.cyan('4.'), 'Back');

        return new Promise((resolve) => {
            rl.question(chalk.yellow('\nChoose an option (1-4): '), async (choice) => {
                try {
                    switch (choice) {
                        case '1':
                            rl.question(chalk.yellow('Enter wallet type (dev/sub): '), async (type) => {
                                await addNewWallet(type.toLowerCase() === 'dev' ? 'dev' : 'sub');
                                await viewAllWallets();
                                resolve();
                            });
                            break;

                        case '2':
                            rl.question(chalk.yellow('Enter private key: '), async (privateKey) => {
                                rl.question(chalk.yellow('Enter wallet type (dev/sub): '), async (type) => {
                                    await importWallet(privateKey, type.toLowerCase() === 'dev' ? 'dev' : 'sub');
                                    await viewAllWallets();
                                    resolve();
                                });
                            });
                            break;

                        case '3':
                            if (wallets.length === 0) {
                                console.log(chalk.red('No wallets to remove'));
                                await viewAllWallets();
                                resolve();
                                return;
                            }

                            console.log(chalk.yellow('\nSelect wallet to remove:'));
                            wallets.forEach((wallet, index) => {
                                console.log(chalk.cyan(`${index + 1}.`), 
                                    `${wallet.type.toUpperCase()} Wallet:`, 
                                    wallet.keypair.publicKey.toString());
                            });
                            
                            rl.question(chalk.yellow('Enter wallet number to remove: '), async (index) => {
                                const walletToRemove = wallets[parseInt(index) - 1];
                                if (walletToRemove) {
                                    await removeWallet(walletToRemove.keypair.publicKey.toString());
                                    console.log(chalk.green('Wallet removed successfully'));
                                }
                                await viewAllWallets();
                                resolve();
                            });
                            break;

                        case '4':
                            resolve();
                            break;

                        default:
                            console.log(chalk.red('Invalid choice'));
                            await viewAllWallets();
                            resolve();
                            break;
                    }
                } catch (error) {
                    console.error(chalk.red('Error:', error));
                    await viewAllWallets();
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error(chalk.red('Error in viewAllWallets:', error));
        throw error;
    }
}

export async function consolidateSOL() {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const connection = new Connection(config.RPC_URL);
    const wallets = await loadAllWallets(config);
    
    const devWallet = wallets.find(w => w.type === 'dev');
    if (!devWallet) {
        console.error(chalk.red('No dev wallet found!'));
        return;
    }

    console.log(chalk.yellow(`Consolidating SOL to dev wallet: ${devWallet.keypair.publicKey.toString()}`));
    
    // Send SOL from all funding wallets to dev wallet
    const fundingWallets = wallets.filter(w => w.type === 'sub');
    for (const wallet of fundingWallets) {
        try {
            const balance = await connection.getBalance(wallet.keypair.publicKey);
            if (balance > 0.01 * LAMPORTS_PER_SOL) { // Leave 0.01 SOL for fees
                await sendSOLToDevWallet(connection, wallet.keypair, devWallet.keypair.publicKey, balance - 0.01 * LAMPORTS_PER_SOL);
                console.log(chalk.green(`Sent ${(balance - 0.01 * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL} SOL from ${wallet.keypair.publicKey.toString()}`));
            }
        } catch (error) {
            console.error(chalk.red(`Failed to send SOL from ${wallet.keypair.publicKey.toString()}: ${error.message}`));
        }
    }
}

export async function sellAllPositions() {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const connection = new Connection(config.RPC_URL);
    const wallets = await loadAllWallets(config);
    
    for (const wallet of wallets) {
        const tokens = await getTokenBalances(connection, wallet.keypair.publicKey);
        for (const token of tokens) {
            try {
                console.log(chalk.yellow(`Selling ${token.amount} of ${token.mint} from ${wallet.keypair.publicKey.toString()}`));
                const tx = await createSellTXWithTip(
                    new PublicKey(token.mint),
                    wallet.keypair,
                    token.amount
                );
                await sendBundle(tx);
                console.log(chalk.green('Sell transaction sent successfully'));
            } catch (error) {
                console.error(chalk.red(`Failed to sell ${token.mint}: ${error.message}`));
            }
        }
    }
}

export async function exportWalletInfo() {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const connection = new Connection(config.RPC_URL);
    const wallets = await loadAllWallets(config);
    
    const walletInfo = {
        devWallets: [],
        fundingWallets: [],
        exportedAt: new Date().toISOString()
    };

    // Collect dev wallet info
    for (const wallet of wallets.filter(w => w.type === 'dev')) {
        const balance = await connection.getBalance(wallet.keypair.publicKey);
        const tokens = await getTokenBalances(connection, wallet.keypair.publicKey);
        walletInfo.devWallets.push({
            address: wallet.keypair.publicKey.toString(),
            balance: balance / LAMPORTS_PER_SOL,
            tokens
        });
    }

    // Collect funding wallet info
    for (const wallet of wallets.filter(w => w.type === 'sub')) {
        const balance = await connection.getBalance(wallet.keypair.publicKey);
        const tokens = await getTokenBalances(connection, wallet.keypair.publicKey);
        walletInfo.fundingWallets.push({
            address: wallet.keypair.publicKey.toString(),
            balance: balance / LAMPORTS_PER_SOL,
            tokens
        });
    }

    // Save to file
    const filename = `wallet_export_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(walletInfo, null, 2));
    console.log(chalk.green(`Wallet information exported to ${filename}`));
}

async function getTokenBalances(connection, publicKey) {
    const tokens = [];
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    for (const account of tokenAccounts.value) {
        tokens.push({
            mint: account.account.data.parsed.info.mint,
            amount: account.account.data.parsed.info.tokenAmount.uiAmount
        });
    }

    return tokens;
}

export async function transferSOL(connection, fromWallet, toWallet, amount) {
    try {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.keypair.publicKey,
                toPubkey: toWallet.keypair.publicKey,
                lamports: amount * LAMPORTS_PER_SOL
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [fromWallet.keypair]
        );

        console.log(chalk.green(`Transfer successful! Signature: ${signature}`));
        return signature;
    } catch (error) {
        console.error(chalk.red('Transfer failed:', error));
        throw error;
    }
}

export async function handleWalletTransfer() {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const connection = new Connection(config.RPC_URL);
    const wallets = await loadAllWallets(config);

    console.log(chalk.yellow('\nAvailable Wallets:'));
    wallets.forEach((wallet, index) => {
        console.log(chalk.cyan(`${index + 1}. ${wallet.type.toUpperCase()} Wallet: ${wallet.keypair.publicKey.toString()}`));
    });

    return new Promise((resolve) => {
        rl.question(chalk.yellow('\nSelect source wallet (number): '), (fromIndex) => {
            rl.question(chalk.yellow('Select destination wallet (number): '), (toIndex) => {
                rl.question(chalk.yellow('Enter amount of SOL to transfer: '), async (amount) => {
                    try {
                        const fromWallet = wallets[parseInt(fromIndex) - 1];
                        const toWallet = wallets[parseInt(toIndex) - 1];
                        
                        await transferSOL(connection, fromWallet, toWallet, parseFloat(amount));
                        console.log(chalk.green('Transfer completed successfully!'));
                    } catch (error) {
                        console.error(chalk.red('Transfer failed:', error));
                    }
                    resolve();
                });
            });
        });
    });
} 