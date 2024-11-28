import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import chalk from 'chalk';
import fs from 'fs';

async function fetchTokens(walletAddress) {
    try {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const connection = new Connection(config.RPC_URL, {
            commitment: 'confirmed',
            wsEndpoint: config.WS_URL
        });

        const walletPublicKey = new PublicKey(walletAddress);
        
        // Fetch all token accounts owned by the wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            walletPublicKey,
            { programId: TOKEN_PROGRAM_ID }
        );

        // Format the token data
        const tokens = tokenAccounts.value.map(account => ({
            CA: account.account.data.parsed.info.mint,
            balance: account.account.data.parsed.info.tokenAmount.uiAmount
        }));

        return tokens;
    } catch (error) {
        console.error(chalk.red(`Error fetching tokens: ${error.message}`));
        return [];
    }
}

export default fetchTokens;
