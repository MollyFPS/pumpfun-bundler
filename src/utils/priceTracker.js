import axios from 'axios';
import chalk from 'chalk';

let solanaPrice = 0;
let lastUpdate = new Date();

async function updateSolanaPrice() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        solanaPrice = response.data.solana.usd;
        lastUpdate = new Date();
    } catch (error) {
        console.error('Failed to fetch Solana price');
    }
}

// Update price every minute
setInterval(updateSolanaPrice, 60000);

export function getStatusLine() {
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();
    return chalk.gray(`[${date} ${time}] `) + chalk.yellow(`SOL: $${solanaPrice.toFixed(2)}`);
}

// Initial price fetch
updateSolanaPrice(); 