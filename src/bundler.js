import { PublicKey, Keypair, Connection, TransactionMessage, VersionedTransaction, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import { loadAllWallets } from './walletManager.js';
import { createBuyInstruction } from './pumpDecode.js';
import chalk from 'chalk';
import { createToken } from './tokenManager.js';
import { RPCManager } from './utils/rpcManager.js';

// Function 1: Bundle PF Launch - Launch with Dev wallet and 20 sub wallets
export async function bundlePFLaunch(config, tokenDetails, rl) {
    console.log(chalk.blue('Initiating Bundle PF Launch...'));
    
    const connection = new Connection(config.RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: config.WS_URL
    });

    try {
        // Get buy amounts first
        console.log(chalk.yellow('\n=== Buy Strategy Setup ==='));
        
        // Get dev wallet buy amount
        const devAmount = await new Promise((resolve) => {
            rl.question(chalk.yellow('\nEnter amount of SOL for dev wallet to buy with: '), (amount) => {
                resolve(parseFloat(amount));
            });
        });

        // Get sub wallet buy strategy
        const subWalletAmount = await new Promise((resolve) => {
            rl.question(chalk.yellow('\nEnter amount of SOL for each sub wallet to buy with: '), (amount) => {
                resolve(parseFloat(amount));
            });
        });

        // Get buying strategy
        const buyStrategy = await new Promise((resolve) => {
            console.log(chalk.yellow('\nChoose buying strategy for sub wallets:'));
            console.log(chalk.cyan('1.'), 'Buy all at once after dev wallet');
            console.log(chalk.cyan('2.'), 'Distribute buys over time');
            rl.question(chalk.yellow('Enter your choice (1-2): '), (choice) => {
                resolve(choice);
            });
        });

        let buyInterval = 0;
        let numberOfBuys = 1;
        let amountPerBuy = subWalletAmount;

        if (buyStrategy === '2') {
            // Get interval settings if distributing buys
            const interval = await new Promise((resolve) => {
                console.log(chalk.yellow('\nChoose buy interval:'));
                console.log(chalk.cyan('1.'), '30 seconds');
                console.log(chalk.cyan('2.'), '60 seconds');
                console.log(chalk.cyan('3.'), '120 seconds');
                console.log(chalk.cyan('4.'), 'Custom interval (in seconds)');
                rl.question(chalk.yellow('Enter your choice (1-4): '), (choice) => {
                    resolve(choice);
                });
            });

            switch (interval) {
                case '1': buyInterval = 30000; break;
                case '2': buyInterval = 60000; break;
                case '3': buyInterval = 120000; break;
                case '4':
                    buyInterval = await new Promise((resolve) => {
                        rl.question(chalk.yellow('Enter custom interval in seconds: '), (seconds) => {
                            resolve(parseInt(seconds) * 1000);
                        });
                    });
                    break;
            }

            numberOfBuys = await new Promise((resolve) => {
                rl.question(chalk.yellow('Enter number of buys to distribute: '), (num) => {
                    resolve(parseInt(num));
                });
            });

            amountPerBuy = subWalletAmount / numberOfBuys;
        }

        // Create the token with the provided details
        console.log(chalk.yellow('\nCreating token with provided details...'));
        const { mint, tokenWallet, pumpFunLink } = await createToken(
            connection,
            tokenDetails.decimals,
            rl,
            tokenDetails.name,
            tokenDetails.symbol,
            tokenDetails.imageUrl,
            tokenDetails.socials
        );

        // Create the token on pump.fun
        console.log(chalk.yellow('\nCreating token on pump.fun...'));
        await createPumpFunToken(connection, tokenDetails, tokenWallet);

        // Print token creation summary
        console.log(chalk.green('\n=== Token Creation Summary ==='));
        console.log(chalk.cyan('Token Name:'), tokenDetails.name);
        console.log(chalk.cyan('Token Symbol:'), tokenDetails.symbol);
        console.log(chalk.cyan('Decimals:'), tokenDetails.decimals);
        console.log(chalk.cyan('Mint Address:'), mint.toString());
        console.log(chalk.cyan('Pump.fun Link:'), `https://pump.fun/token/${mint.toString()}`);
        console.log(chalk.cyan('Listing Link:'), `https://pump.fun/list-token/${mint.toString()}`);

        // Print buy strategy summary
        console.log(chalk.green('\n=== Buy Strategy Summary ==='));
        console.log(chalk.cyan('Dev Wallet Buy Amount:'), `${devAmount} SOL`);
        console.log(chalk.cyan('Sub Wallet Strategy:'), buyStrategy === '1' ? 
            `Buy ${subWalletAmount} SOL each at once` : 
            `${numberOfBuys} buys of ${amountPerBuy} SOL each, every ${buyInterval/1000} seconds`);

        // Load wallets
        const wallets = await loadAllWallets(config);
        const subWallets = wallets.filter(w => w.type === 'sub');

        if (subWallets.length === 0) {
            throw new Error('No sub wallets found! Please create sub wallets first.');
        }

        console.log(chalk.cyan(`\nFound ${subWallets.length} sub wallets`));

        // Execute buy strategy
        console.log(chalk.yellow('\nExecuting buy strategy...'));

        // Execute dev wallet buy
        console.log(chalk.yellow('\nExecuting dev wallet buy...'));
        const devTx = await createBuyInstruction(connection, tokenWallet, mint.toString(), devAmount);
        await sendBundle(config, [devTx]);

        // Wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Execute sub wallet buys based on strategy
        if (buyStrategy === '1') {
            // All at once
            console.log(chalk.yellow('\nExecuting all sub wallet buys...'));
            const subTransactions = [];
            for (const wallet of subWallets) {
                const tx = await createBuyInstruction(connection, wallet.keypair, mint.toString(), subWalletAmount);
                subTransactions.push(tx);
            }
            await sendBundle(config, subTransactions);
        } else {
            // Distributed buys
            for (let i = 0; i < numberOfBuys; i++) {
                console.log(chalk.yellow(`\nExecuting buy round ${i + 1} of ${numberOfBuys}...`));
                const subTransactions = [];
                for (const wallet of subWallets) {
                    const tx = await createBuyInstruction(connection, wallet.keypair, mint.toString(), amountPerBuy);
                    subTransactions.push(tx);
                }
                await sendBundle(config, subTransactions);
                
                if (i < numberOfBuys - 1) {
                    console.log(chalk.yellow(`Waiting ${buyInterval/1000} seconds for next buy round...`));
                    await new Promise(resolve => setTimeout(resolve, buyInterval));
                }
            }
        }

        console.log(chalk.green('\nBundle PF Launch completed successfully!'));
        console.log(chalk.yellow('\nImportant Links:'));
        console.log(chalk.cyan('View Token:'), `https://pump.fun/token/${mint.toString()}`);
        console.log(chalk.cyan('List Token:'), `https://pump.fun/list-token/${mint.toString()}`);
        
        return mint.toString();

    } catch (error) {
        console.error(chalk.red('Failed to execute Bundle PF Launch:', error));
        throw error;
    }
}

// Function 2: PF Launch with Dev only - Launch using only the Dev wallet
export async function pfLaunchDevOnly(config, tokenMint, amount) {
    console.log(chalk.blue('Initiating PF Launch with Dev wallet only...'));
    
    const connection = new Connection(config.RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: config.WS_URL
    });

    // Load dev wallet
    const wallets = await loadAllWallets(config);
    const devWallet = wallets.find(w => w.type === 'dev');
    if (!devWallet) {
        throw new Error('No dev wallet found! Please create a dev wallet first.');
    }

    // Create dev wallet transaction
    console.log(chalk.yellow('Creating dev wallet transaction...'));
    const devTx = await createBuyInstruction(connection, devWallet.keypair, tokenMint, amount);

    // Send bundle with single transaction
    return await sendBundle(config, [devTx]);
}

// Function 3: Bundle + Snipe - Launch with 1-second delay between Dev and sub wallets
export async function bundleAndSnipe(config, tokenMint, amount) {
    console.log(chalk.blue('Initiating Bundle + Snipe with 1-second delay...'));
    
    const connection = new Connection(config.RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: config.WS_URL
    });

    // Load all wallets
    const wallets = await loadAllWallets(config);
    const devWallet = wallets.find(w => w.type === 'dev');
    const subWallets = wallets.filter(w => w.type === 'sub');

    if (!devWallet) {
        throw new Error('No dev wallet found! Please create a dev wallet first.');
    }
    if (subWallets.length === 0) {
        throw new Error('No sub wallets found! Please create sub wallets first.');
    }

    // First bundle: Dev wallet only
    console.log(chalk.yellow('Sending dev wallet transaction...'));
    const devTx = await createBuyInstruction(connection, devWallet.keypair, tokenMint, amount);
    await sendBundle(config, [devTx]);

    // Wait for 1 second
    console.log(chalk.yellow('Waiting 1 second before sub wallet transactions...'));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second bundle: Sub wallets
    console.log(chalk.yellow('Sending sub wallet transactions...'));
    const subTransactions = [];
    for (const wallet of subWallets) {
        const tx = await createBuyInstruction(connection, wallet.keypair, tokenMint, amount);
        subTransactions.push(tx);
    }

    return await sendBundle(config, subTransactions);
}

// Function 4: Copy Info Bundler - Launch using copied INFO/METADATA
export async function copyInfoBundler(config, sourceTokenMint, amount) {
    console.log(chalk.blue('Initiating Copy Info Bundler...'));
    
    const connection = new Connection(config.RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: config.WS_URL
    });

    // Get source token metadata
    console.log(chalk.yellow('Fetching source token metadata...'));
    const metadata = await getTokenMetadata(connection, sourceTokenMint);

    // Create transactions with copied metadata
    const wallets = await loadAllWallets(config);
    const transactions = [];

    for (const wallet of wallets) {
        const tx = await createBuyInstructionWithMetadata(
            connection, 
            wallet.keypair, 
            sourceTokenMint, 
            amount,
            metadata
        );
        transactions.push(tx);
    }

    return await sendBundle(config, transactions);
}

// Helper function to send bundles
async function sendBundle(config, transactions) {
    try {
        return await RPCManager.executeWithRetry(async (connection) => {
            // Create and send bundle
            const search = searcherClient(config.BLOCK_ENGINE_URL);
            const bundle = new Bundle([]);
            
            // Add all transactions to bundle
            for (const tx of transactions) {
                const messageV0 = new TransactionMessage({
                    payerKey: tx.keys[1].pubkey, // owner is always second key
                    instructions: [tx],
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash
                }).compileToV0Message();

                const versionedTx = new VersionedTransaction(messageV0);
                bundle.addTransactions(versionedTx);
            }

            // Add Jito tip
            const tipTx = await createJitoTipTransaction(config, connection);
            if (tipTx) {
                bundle.addTransactions(tipTx);
            }
            
            console.log(chalk.yellow(`Sending bundle with ${transactions.length} transactions...`));
            const sentBundle = await search.sendBundle(bundle);
            
            console.log(chalk.green('Bundle sent successfully!'));
            console.log(chalk.cyan(`Bundle ID: ${sentBundle}`));
            console.log(chalk.cyan(`Jito Explorer: https://explorer.jito.wtf/bundle/${sentBundle}`));
            
            return sentBundle;
        });
    } catch (error) {
        console.error(chalk.red('Failed to send bundle:', error));
        throw error;
    }
}

// Helper function to create Jito tip transaction
async function createJitoTipTransaction(config, connection) {
    try {
        const jitoTipAmount = config.JITO_TIP_AMOUNT * 1e9; // Convert to lamports
        const jitoTipAccounts = [
            '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
            'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
            'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
            'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
            'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
            'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
            'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
            '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
        ];

        const randomTipAccount = jitoTipAccounts[Math.floor(Math.random() * jitoTipAccounts.length)];
        const tipIx = SystemProgram.transfer({
            fromPubkey: new PublicKey(config.JITO_TIP_SECRET_KEY),
            toPubkey: new PublicKey(randomTipAccount),
            lamports: jitoTipAmount
        });

        const messageV0 = new TransactionMessage({
            payerKey: new PublicKey(config.JITO_TIP_SECRET_KEY),
            instructions: [tipIx],
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash
        }).compileToV0Message();

        const versionedTx = new VersionedTransaction(messageV0);
        return versionedTx;
    } catch (error) {
        console.error(chalk.red('Failed to create Jito tip transaction:', error));
        return null;
    }
}

// Helper functions for metadata copying
async function getTokenMetadata(connection, mintAddress) {
    // Implementation for fetching token metadata...
}

async function createBuyInstructionWithMetadata(connection, wallet, tokenMint, amount, metadata) {
    // Implementation for creating buy instruction with metadata...
}

// Update the createPumpFunToken function
async function createPumpFunToken(connection, tokenDetails, wallet) {
    try {
        return await RPCManager.executeWithRetry(async (connection) => {
            // Request airdrop for testing
            console.log(chalk.yellow('\nRequesting airdrop for token creation...'));
            const airdropSignature = await connection.requestAirdrop(
                wallet.publicKey,
                0.1 * LAMPORTS_PER_SOL
            );
            await connection.confirmTransaction(airdropSignature);
            console.log(chalk.green('Airdrop received successfully'));

            // Create instruction data for token creation
            const data = Buffer.alloc(9); // 8 bytes for instruction + 1 byte for decimals
            
            // Write instruction discriminator for token creation (0x01 for create token)
            data.writeUInt8(0x01, 0);
            
            // Write decimals
            data.writeUInt8(tokenDetails.decimals, 8);

            // Create the transaction
            const ix = new TransactionInstruction({
                programId: new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"),
                keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false }
                ],
                data: data
            });

            const messageV0 = new TransactionMessage({
                payerKey: wallet.publicKey,
                instructions: [ix],
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash
            }).compileToV0Message();

            const tx = new VersionedTransaction(messageV0);
            tx.sign([wallet]);

            // Send the transaction with additional options
            const signature = await connection.sendTransaction(tx, {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: 'confirmed',
                // Don't use proxy for this specific request
                disableProxy: true
            });

            // Wait for confirmation with longer timeout
            await connection.confirmTransaction(signature, {
                commitment: 'confirmed',
                maxRetries: 5,
                skipPreflight: true
            });

            console.log(chalk.green('\nToken created on pump.fun successfully!'));
            console.log(chalk.cyan('Transaction signature:'), signature);

            // Return the token mint address
            return wallet.publicKey;
        });
    } catch (error) {
        console.error(chalk.red('Failed to create token on pump.fun:', error));
        throw error;
    }
}