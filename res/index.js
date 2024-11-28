"use strict";

// Add these at the top of the file
process.env.NODE_NO_WARNINGS = '1';
process.env.SUPPRESS_BIGINT_WARNING = '1';

// Import required modules
import { checkBalancesDetailed } from '../src/balances.js';
import chalk from 'chalk';
import fs from 'fs';
import { rl } from '../src/utils/readline.js';
import { createToken, setupTokenMetadata } from '../src/tokenManager.js';
import { automateVolume, setupAutomatedTrading } from '../src/volumeManager.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { loadDevWallet } from '../src/walletManager.js';
import { viewAllWallets, consolidateSOL, sellAllPositions, exportWalletInfo } from '../src/walletUtils.js';
import { bundlePFLaunch, pfLaunchDevOnly, bundleAndSnipe, copyInfoBundler } from '../src/bundler.js';
import { RPCManager } from '../src/utils/rpcManager.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import walletRoutes from './api/walletRoutes.js';

// Create Express app and Socket.io server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Enable CORS for all routes
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Parse JSON bodies
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Add routes
app.use('/api', walletRoutes);

// Start server if in GUI mode
if (process.argv.includes('--gui')) {
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
        console.log(chalk.green(`Server running on port ${PORT}`));
    }).on('error', (error) => {
        console.error(chalk.red('Server error:', error));
        if (error.code === 'EADDRINUSE') {
            console.log(chalk.yellow(`Port ${PORT} is already in use. Trying to close existing connection...`));
            require('child_process').exec(`npx kill-port ${PORT}`, (err) => {
                if (!err) {
                    console.log(chalk.green(`Port ${PORT} freed. Restarting server...`));
                    httpServer.listen(PORT);
                }
            });
        }
    });
}

// API Routes
app.get('/api/wallets', async (req, res) => {
    try {
        const wallets = await viewAllWallets();
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/token/create', async (req, res) => {
    try {
        const { name, symbol, decimals, imageUrl, socials } = req.body;
        const result = await createToken(connection, decimals, null, name, symbol, imageUrl, socials);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Add WebSocket error handling
io.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

io.on('error', (error) => {
    console.error('Socket error:', error);
});

// Update the connection handler
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Main Menu options
const mainMenuOptions = {
    '1': 'Bundler Menu',
    '2': 'Wallet Menu',
    '3': 'Token Management',
    '4': 'LUT Management (IMPORTANT)',
    '5': 'Exit 🔥'
};

// Bundler Menu options
const bundlerMenuOptions = {
    '1': { 
        name: 'Bundle PF Launch',
        description: 'Launch a pump using the Dev wallet and 20 sub wallets (21 wallets buyers)'
    },
    '2': {
        name: 'PF Launch with Dev only',
        description: 'Launch a pump using only the Dev wallet'
    },
    '3': {
        name: 'Bundle + Snipe',
        description: 'Launch a pump with the Dev wallet and sub wallets, with a 1-second delay between the Dev and sub wallets (21 wallets buyers)'
    },
    '4': {
        name: 'Copy Info Bundler',
        description: 'Launch a pump using a copy of someone else\'s INFO/METADATA (21 wallets buyers)'
    },
    'b': {
        name: 'Back to Main Menu',
        description: 'Return to the main menu'
    }
};

// Add Token Management Menu options
const tokenMenuOptions = {
    '1': {
        name: 'Create Token',
        description: 'Create a new token with custom parameters'
    },
    '2': {
        name: 'Manage Volume',
        description: 'Setup automated volume management for a token'
    },
    '3': {
        name: 'Token Info',
        description: 'View and modify token metadata'
    },
    '4': {
        name: 'Raydium Migration',
        description: 'Migrate token to Raydium'
    },
    'b': {
        name: 'Back to Main Menu',
        description: 'Return to the main menu'
    }
};

// Add after other menu options
const walletMenuOptions = {
    '1': {
        name: 'View All Wallets',
        description: 'Show all dev and funding wallets with balances'
    },
    '2': {
        name: 'Consolidate SOL',
        description: 'Send all SOL from funding wallets to dev wallet'
    },
    '3': {
        name: 'Sell All Positions',
        description: 'Sell all tokens from all wallets (dev & funders)'
    },
    '4': {
        name: 'Export Wallet Info',
        description: 'Export all wallet information to a file'
    },
    'b': {
        name: 'Back to Main Menu',
        description: 'Return to the main menu'
    }
};

function displayMainMenu() {
    try {
        console.clear();
        // Display ASCII art if it exists
        if (fs.existsSync('./src/ascii.txt')) {
            const ascii = fs.readFileSync('./src/ascii.txt', 'utf8');
            console.log(chalk.magenta(ascii));
        }
        
        console.log(chalk.yellow('Disclaimer: Use this tool responsibly and comply with all relevant regulations.\n'));
        console.log(chalk.blue('Main Menu'));
        console.log(chalk.gray('─'.repeat(50)));
        
        // Display menu in table format
        console.log(chalk.red('Option\t| Action'));
        console.log(chalk.gray('─'.repeat(50)));
        Object.entries(mainMenuOptions).forEach(([key, value]) => {
            console.log(chalk.green(`${key}\t| ${value}`));
        });
        console.log(chalk.gray('─'.repeat(50)));
    } catch (error) {
        console.error('Error displaying menu:', error);
    }
}

function displayBundlerMenu() {
    try {
        console.clear();
        console.log(chalk.blue('\nBundler Menu'));
        console.log(chalk.gray('─'.repeat(100)));
        console.log(chalk.red('Option\t| Action\t\t\t| Description'));
        console.log(chalk.gray('─'.repeat(100)));
        
        Object.entries(bundlerMenuOptions).forEach(([key, value]) => {
            console.log(chalk.green(`${key}\t| ${value.name.padEnd(20)}\t| ${value.description}`));
        });
        console.log(chalk.gray('─'.repeat(100)));
    } catch (error) {
        console.error('Error displaying bundler menu:', error);
    }
}

function displayTokenMenu() {
    try {
        console.clear();
        console.log(chalk.blue('\nToken Management Menu'));
        console.log(chalk.gray('─'.repeat(100)));
        console.log(chalk.red('Option\t| Action\t\t\t| Description'));
        console.log(chalk.gray('─'.repeat(100)));
        
        Object.entries(tokenMenuOptions).forEach(([key, value]) => {
            console.log(chalk.green(`${key}\t| ${value.name.padEnd(20)}\t| ${value.description}`));
        });
        console.log(chalk.gray('─'.repeat(100)));
    } catch (error) {
        console.error('Error displaying token menu:', error);
    }
}

function displayWalletMenu() {
    try {
        console.clear();
        console.log(chalk.blue('\nWallet Management Menu'));
        console.log(chalk.gray('─'.repeat(100)));
        console.log(chalk.red('Option\t| Action\t\t\t| Description'));
        console.log(chalk.gray('─'.repeat(100)));
        
        Object.entries(walletMenuOptions).forEach(([key, value]) => {
            console.log(chalk.green(`${key}\t| ${value.name.padEnd(20)}\t| ${value.description}`));
        });
        console.log(chalk.gray('─'.repeat(100)));
    } catch (error) {
        console.error('Error displaying wallet menu:', error);
    }
}

function handleBundlerMenu() {
    displayBundlerMenu();
    rl.question(chalk.yellow('\nChoose an option: '), async (choice) => {
        try {
            const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
            
            switch (choice) {
                case '1':
                    console.log(chalk.green('\nInitiating Bundle PF Launch...'));
                    try {
                        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                        
                        // First, get token details
                        const tokenDetails = await new Promise((resolve) => {
                            console.log(chalk.yellow('\n=== Token Creation Phase ==='));
                            console.log(chalk.cyan('\nDecimals explanation:'));
                            console.log(chalk.white('- Decimals determine the smallest unit of your token'));
                            console.log(chalk.white('- Common decimal values:'));
                            console.log(chalk.white('  2 decimals: Like USD ($1.23)'));
                            console.log(chalk.white('  6 decimals: Like USDC ($1.234567)'));
                            console.log(chalk.white('  9 decimals: Like SOL (1.123456789)'));
                            console.log(chalk.white('- Most tokens use 9 decimals'));
                            console.log(chalk.gray('─'.repeat(50)));

                            rl.question(chalk.yellow('Enter token name: '), (name) => {
                                console.log(chalk.cyan('Token Name:', name));
                                
                                rl.question(chalk.yellow('Enter token symbol: '), (symbol) => {
                                    console.log(chalk.cyan('Token Symbol:', symbol));
                                    
                                    rl.question(chalk.yellow('Enter decimals (2, 6, or 9) [default: 9]: '), (decimals) => {
                                        let decimalValue = 9; // default value
                                        if (decimals) {
                                            decimalValue = parseInt(decimals);
                                            if (![2, 6, 9].includes(decimalValue)) {
                                                console.log(chalk.yellow('Invalid decimal value, using default (9)'));
                                                decimalValue = 9;
                                            }
                                        }
                                        console.log(chalk.cyan('Decimals:', decimalValue));

                                        // Get image URL
                                        console.log(chalk.yellow('\nToken Image:'));
                                        console.log(chalk.white('- Required for pump.fun listing'));
                                        console.log(chalk.white('- Should be a direct image URL (ends with .jpg, .png, etc.)'));
                                        console.log(chalk.white('- Square image recommended (e.g., 500x500)'));
                                        
                                        rl.question(chalk.yellow('Enter token image URL: '), (imageUrl) => {
                                            console.log(chalk.cyan('Image URL:', imageUrl));

                                            // Get social media links
                                            console.log(chalk.yellow('\nSocial Media Links (optional):'));
                                            rl.question(chalk.yellow('Enter Telegram link (or press Enter to skip): '), (telegram) => {
                                                console.log(chalk.cyan('Telegram:', telegram || 'Not provided'));
                                                
                                                rl.question(chalk.yellow('Enter Twitter/X link (or press Enter to skip): '), (twitter) => {
                                                    console.log(chalk.cyan('Twitter/X:', twitter || 'Not provided'));
                                                    
                                                    rl.question(chalk.yellow('Enter Website URL (or press Enter to skip): '), (website) => {
                                                        console.log(chalk.cyan('Website:', website || 'Not provided'));
                                                        
                                                        resolve({
                                                            name,
                                                            symbol,
                                                            decimals: decimalValue,
                                                            imageUrl,
                                                            socials: {
                                                                telegram: telegram || '',
                                                                twitter: twitter || '',
                                                                website: website || ''
                                                            }
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });

                        // Create token and get buy amounts
                        await bundlePFLaunch(config, tokenDetails, rl);
                        console.log(chalk.green('Bundle PF Launch completed!'));
                    } catch (error) {
                        console.error(chalk.red('Failed to execute Bundle PF Launch:', error));
                    }
                    console.log('\nPress Enter to continue...');
                    rl.question('', () => handleBundlerMenu());
                    break;

                case '2':
                    console.log(chalk.green('\nInitiating PF Launch with Dev only...'));
                    console.log(chalk.yellow('\nNote: You can find the token mint address on pump.fun in the token URL'));
                    console.log(chalk.yellow('Example: https://pump.fun/token/ABC123... - ABC123... is the mint address'));
                    rl.question(chalk.yellow('\nEnter token mint address from pump.fun: '), async (tokenMint) => {
                        rl.question(chalk.yellow('Enter amount of SOL to spend: '), async (amount) => {
                            try {
                                await pfLaunchDevOnly(config, tokenMint, parseFloat(amount));
                                console.log(chalk.green('Dev-only launch completed!'));
                            } catch (error) {
                                console.error(chalk.red('Failed to execute Dev-only launch:', error));
                            }
                            console.log('\nPress Enter to continue...');
                            rl.question('', () => handleBundlerMenu());
                        });
                    });
                    break;

                case '3':
                    console.log(chalk.green('\nInitiating Bundle + Snipe...'));
                    console.log(chalk.yellow('\nNote: You can find the token mint address on pump.fun in the token URL'));
                    console.log(chalk.yellow('Example: https://pump.fun/token/ABC123... - ABC123... is the mint address'));
                    rl.question(chalk.yellow('\nEnter token mint address from pump.fun: '), async (tokenMint) => {
                        rl.question(chalk.yellow('Enter amount of SOL to spend per wallet: '), async (amount) => {
                            try {
                                await bundleAndSnipe(config, tokenMint, parseFloat(amount));
                                console.log(chalk.green('Bundle + Snipe completed!'));
                            } catch (error) {
                                console.error(chalk.red('Failed to execute Bundle + Snipe:', error));
                            }
                            console.log('\nPress Enter to continue...');
                            rl.question('', () => handleBundlerMenu());
                        });
                    });
                    break;

                case '4':
                    console.log(chalk.green('\nInitiating Copy Info Bundler...'));
                    console.log(chalk.yellow('\nNote: You can find the token mint address on pump.fun in the token URL'));
                    console.log(chalk.yellow('Example: https://pump.fun/token/ABC123... - ABC123... is the mint address'));
                    rl.question(chalk.yellow('\nEnter source token mint address from pump.fun: '), async (sourceTokenMint) => {
                        rl.question(chalk.yellow('Enter amount of SOL to spend per wallet: '), async (amount) => {
                            try {
                                await copyInfoBundler(config, sourceTokenMint, parseFloat(amount));
                                console.log(chalk.green('Copy Info Bundler completed!'));
                            } catch (error) {
                                console.error(chalk.red('Failed to execute Copy Info Bundler:', error));
                            }
                            console.log('\nPress Enter to continue...');
                            rl.question('', () => handleBundlerMenu());
                        });
                    });
                    break;

                case 'b':
                case 'B':
                    handleMainMenu();
                    return;

                default:
                    console.log(chalk.red('\nInvalid choice. Please try again.'));
                    console.log('\nPress Enter to continue...');
                    rl.question('', () => handleBundlerMenu());
                    break;
            }
        } catch (error) {
            console.error(chalk.red('Error in bundler menu:', error));
            console.log('\nPress Enter to continue...');
            rl.question('', () => handleBundlerMenu());
        }
    });
}

async function handleTokenMenu() {
    displayTokenMenu();
    rl.question(chalk.yellow('\nChoose an option: '), async (choice) => {
        try {
            switch (choice) {
                case '1':
                    console.log(chalk.green('\nInitiating Token Creation...'));
                    // Use Promise to handle nested questions and maintain state
                    const getTokenDetails = () => new Promise((resolve) => {
                        process.stdout.write('\x1Bc'); // Clear console while keeping history
                        console.log(chalk.green('\nToken Creation Setup'));
                        console.log(chalk.gray('─'.repeat(50)));
                        
                        const askName = () => {
                            rl.question(chalk.yellow('Enter token name: '), (name) => {
                                if (!name) {
                                    console.log(chalk.red('Token name cannot be empty!'));
                                    return askName();
                                }
                                console.log(chalk.cyan('Token Name:', name));
                                
                                const askSymbol = () => {
                                    rl.question(chalk.yellow('Enter token symbol: '), (symbol) => {
                                        if (!symbol) {
                                            console.log(chalk.red('Token symbol cannot be empty!'));
                                            return askSymbol();
                                        }
                                        console.log(chalk.cyan('Token Symbol:', symbol));
                                        
                                        const askDecimals = () => {
                                            rl.question(chalk.yellow('Enter decimals (default 9): '), async (decimals) => {
                                                const decimalValue = decimals || '9';
                                                console.log(chalk.cyan('Decimals:', decimalValue));
                                                console.log(chalk.gray('─'.repeat(50)));
                                                
                                                try {
                                                    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                                                    const connection = new Connection(config.RPC_URL);
                                                    
                                                    console.log(chalk.yellow('\nCreating token with new wallet...'));
                                                    const { mint, tokenWallet, associatedTokenAccount, pumpFunLink } = await createToken(
                                                        connection,
                                                        parseInt(decimalValue),
                                                        rl
                                                    );

                                                    const metadata = {
                                                        name,
                                                        symbol,
                                                        uri: ''
                                                    };

                                                    await setupTokenMetadata(connection, mint, metadata);
                                                    
                                                    console.log(chalk.green('\nPress Enter to return to menu...'));
                                                    rl.question('', () => {
                                                        resolve();
                                                        handleTokenMenu();
                                                    });
                                                } catch (error) {
                                                    console.error(chalk.red('Failed to create token:', error));
                                                    console.log(chalk.yellow('\nPress Enter to try again...'));
                                                    rl.question('', () => {
                                                        resolve();
                                                        handleTokenMenu();
                                                    });
                                                }
                                            });
                                        };
                                        askDecimals();
                                    });
                                };
                                askSymbol();
                            });
                        };
                        askName();
                    });

                    await getTokenDetails();
                    break;

                case '2':
                    console.log(chalk.green('\nSetting up Volume Management...'));
                    rl.question('Enter token mint address: ', async (mintAddress) => {
                        try {
                            const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
                            await setupAutomatedTrading(config, new PublicKey(mintAddress));
                            console.log(chalk.green('Volume automation setup complete!'));
                        } catch (error) {
                            console.error(chalk.red('Failed to setup volume management:', error));
                        }
                        handleTokenMenu();
                    });
                    break;

                case '3':
                    console.log(chalk.green('\nFetching Token Info...'));
                    rl.question('Enter token mint address: ', async (mintAddress) => {
                        try {
                            // Implement token info display
                            console.log(chalk.yellow('Token info feature coming soon...'));
                        } catch (error) {
                            console.error(chalk.red('Failed to fetch token info:', error));
                        }
                        handleTokenMenu();
                    });
                    break;

                case '4':
                    console.log(chalk.green('\nPreparing Raydium Migration...'));
                    rl.question('Enter token mint address: ', async (mintAddress) => {
                        try {
                            // Implement Raydium migration
                            console.log(chalk.yellow('Raydium migration feature coming soon...'));
                        } catch (error) {
                            console.error(chalk.red('Failed to initiate migration:', error));
                        }
                        handleTokenMenu();
                    });
                    break;

                case 'b':
                case 'B':
                    handleMainMenu();
                    return;

                default:
                    console.log(chalk.red('\nInvalid choice. Please try again.'));
                    handleTokenMenu();
                    break;
            }
        } catch (error) {
            console.error(chalk.red('Error in token menu:', error));
            handleTokenMenu();
        }
    });
}

async function handleWalletMenu() {
    displayWalletMenu();
    rl.question(chalk.yellow('\nChoose an option: '), async (choice) => {
        try {
            switch (choice) {
                case '1':
                    console.log(chalk.green('\nFetching wallet information...'));
                    await viewAllWallets();
                    break;

                case '2':
                    console.log(chalk.green('\nInitiating SOL consolidation...'));
                    await consolidateSOL();
                    break;

                case '3':
                    console.log(chalk.green('\nInitiating mass sell of all positions...'));
                    await sellAllPositions();
                    break;

                case '4':
                    console.log(chalk.green('\nExporting wallet information...'));
                    await exportWalletInfo();
                    break;

                case 'b':
                case 'B':
                    handleMainMenu();
                    return;

                default:
                    console.log(chalk.red('\nInvalid choice. Please try again.'));
                    break;
            }

            console.log('\nPress Enter to continue...');
            rl.question('', () => {
                handleWalletMenu();
            });
        } catch (error) {
            console.error(chalk.red('Error in wallet menu:', error));
            console.log('\nPress Enter to continue...');
            rl.question('', () => {
                handleWalletMenu();
            });
        }
    });
}

function handleMainMenu() {
    displayMainMenu();
    rl.question(chalk.yellow('\nChoose an option: '), async (choice) => {
        switch (choice) {
            case '1':
                handleBundlerMenu();
                break;
            case '2':
                handleWalletMenu();
                break;
            case '3':
                handleTokenMenu();
                break;
            case '4':
                console.log(chalk.yellow('\nLUT Management - Not implemented yet'));
                break;
            case '5':
                console.log(chalk.green('\nExiting program... 🔥'));
                rl.close();
                process.exit(0);
                return;
            default:
                console.log(chalk.red('\nInvalid choice. Please try again.'));
        }
        
        if (choice !== '1') { // Don't show "Press Enter" for Bundler Menu
            console.log('\nPress Enter to continue...');
            rl.question('', () => {
                handleMainMenu();
            });
        }
    });
}

// Add these functions at the top of res/index.js after the imports

const defaultRPCOptions = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
];

const defaultBlockEngineOptions = [
    'https://ny.mainnet.block-engine.jito.wtf',
    'https://amsterdam.mainnet.block-engine.jito.wtf',
    'https://frankfurt.mainnet.block-engine.jito.wtf',
    'https://tokyo.mainnet.block-engine.jito.wtf'
];

async function getProxyCount() {
    try {
        if (fs.existsSync('valid_proxies.json')) {
            const validProxies = JSON.parse(fs.readFileSync('valid_proxies.json', 'utf8'));
            return validProxies.length;
        }
    } catch (error) {
        console.log(chalk.red('Error loading proxies:', error));
    }
    return 0;
}

async function updateProxyDisplay() {
    const proxyCount = await getProxyCount();
    process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
    if (fs.existsSync('./src/ascii.txt')) {
        const ascii = fs.readFileSync('./src/ascii.txt', 'utf8');
        console.log(chalk.magenta(ascii));
    }
    console.log(chalk.yellow('Configuration Setup\n'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.blue('Proxy Status:'));
    console.log(chalk.cyan('Working Proxies:'), chalk.green(`${proxyCount} loaded`));
    console.log(chalk.gray('─'.repeat(50)));
}

async function displayConfigMenu() {
    await updateProxyDisplay();

    let config = {};
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        config = {
            RPC_URL: defaultRPCOptions[0],
            WS_URL: defaultRPCOptions[0].replace('https://', 'wss://'),
            BLOCK_ENGINE_URL: defaultBlockEngineOptions[0],
            JITO_TIP_SECRET_KEY: '',
            WALLET_BUYERS_FOLDER: './wallets',
            SECRET_KEY_PATH: './dev_wallet.json',
            JITO_TIP_AMOUNT: 0.00001
        };
    }

    console.log(chalk.blue('Current Configuration:'));
    console.log(chalk.cyan('1.'), 'RPC URL:', chalk.green(config.RPC_URL));
    console.log(chalk.cyan('2.'), 'WebSocket URL:', chalk.green(config.WS_URL));
    console.log(chalk.cyan('3.'), 'Block Engine URL:', chalk.green(config.BLOCK_ENGINE_URL));
    console.log(chalk.cyan('4.'), 'Jito Tip Secret Key:', chalk.green(config.JITO_TIP_SECRET_KEY ? '***[SET]***' : '[NOT SET]'));
    console.log(chalk.cyan('5.'), 'Wallet Buyers Folder:', chalk.green(config.WALLET_BUYERS_FOLDER));
    console.log(chalk.cyan('6.'), 'Secret Key Path:', chalk.green(config.SECRET_KEY_PATH));
    console.log(chalk.cyan('7.'), 'Jito Tip Amount:', chalk.green(config.JITO_TIP_AMOUNT));
    console.log(chalk.cyan('8.'), 'Proxy Management');
    console.log(chalk.cyan('9.'), 'Save and Continue to Main Menu');
    console.log(chalk.gray('─'.repeat(50)));

    return new Promise((resolve) => {
        rl.question(chalk.yellow('\nChoose an option (1-9): '), async (choice) => {
            switch (choice) {
                case '1':
                    console.log(chalk.yellow('\nAvailable RPC URLs:'));
                    defaultRPCOptions.forEach((url, i) => {
                        console.log(chalk.cyan(`${i + 1}.`), url);
                    });
                    console.log(chalk.cyan(`${defaultRPCOptions.length + 1}.`), 'Enter custom URL');
                    
                    rl.question(chalk.yellow('\nChoose RPC URL (number): '), async (rpcChoice) => {
                        if (parseInt(rpcChoice) <= defaultRPCOptions.length) {
                            config.RPC_URL = defaultRPCOptions[parseInt(rpcChoice) - 1];
                            config.WS_URL = config.RPC_URL.replace('https://', 'wss://');
                        } else {
                            rl.question(chalk.yellow('Enter custom RPC URL: '), (customUrl) => {
                                config.RPC_URL = customUrl;
                                config.WS_URL = customUrl.replace('https://', 'wss://');
                            });
                        }
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '3':
                    console.log(chalk.yellow('\nAvailable Block Engine URLs:'));
                    defaultBlockEngineOptions.forEach((url, i) => {
                        console.log(chalk.cyan(`${i + 1}.`), url);
                    });
                    
                    rl.question(chalk.yellow('\nChoose Block Engine URL (number): '), (beChoice) => {
                        config.BLOCK_ENGINE_URL = defaultBlockEngineOptions[parseInt(beChoice) - 1];
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '4':
                    rl.question(chalk.yellow('Enter Jito Tip Secret Key: '), (key) => {
                        config.JITO_TIP_SECRET_KEY = key;
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '5':
                    rl.question(chalk.yellow('Enter Wallet Buyers Folder path: '), (path) => {
                        config.WALLET_BUYERS_FOLDER = path;
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '6':
                    rl.question(chalk.yellow('Enter Secret Key Path: '), (path) => {
                        config.SECRET_KEY_PATH = path;
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '7':
                    rl.question(chalk.yellow('Enter Jito Tip Amount (in SOL): '), (amount) => {
                        config.JITO_TIP_AMOUNT = parseFloat(amount);
                        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                        displayConfigMenu().then(resolve);
                    });
                    break;

                case '8':
                    console.log(chalk.yellow('\nProxy Management:'));
                    console.log(chalk.cyan('1.'), 'Fetch new proxies');
                    console.log(chalk.cyan('2.'), 'Validate existing proxies');
                    console.log(chalk.cyan('3.'), 'View proxy list');
                    console.log(chalk.cyan('4.'), 'Back to config menu');
                    
                    rl.question(chalk.yellow('\nChoose proxy option (1-4): '), async (proxyChoice) => {
                        try {
                            switch (proxyChoice) {
                                case '1':
                                    console.log(chalk.yellow('\nFetching new proxies...'));
                                    await RPCManager.fetchProxies();
                                    await updateProxyDisplay();
                                    break;
                                case '2':
                                    console.log(chalk.yellow('\nValidating existing proxies...'));
                                    await RPCManager.validateProxies();
                                    await updateProxyDisplay();
                                    break;
                                case '3':
                                    if (fs.existsSync('valid_proxies.json')) {
                                        const validProxies = JSON.parse(fs.readFileSync('valid_proxies.json', 'utf8'));
                                        console.log(chalk.yellow('\nWorking Proxies:'));
                                        validProxies.forEach((proxy, index) => {
                                            console.log(chalk.cyan(`${index + 1}.`), proxy);
                                        });
                                    } else {
                                        console.log(chalk.red('No valid proxies found. Try fetching new ones.'));
                                    }
                                    break;
                            }
                        } catch (error) {
                            console.error(chalk.red('Error managing proxies:', error));
                        }
                        console.log(chalk.yellow('\nPress Enter to continue...'));
                        rl.question('', () => {
                            displayConfigMenu().then(resolve);
                        });
                    });
                    break;

                case '9':
                    console.log(chalk.green('\nConfiguration saved! Proceeding to main menu...'));
                    resolve();
                    break;

                default:
                    console.log(chalk.red('\nInvalid choice. Please try again.'));
                    displayConfigMenu().then(resolve);
                    break;
            }
        });
    });
}

// Add these functions near the top with other imports
function showLoadingBar(current, total, label = '') {
    const width = 40;
    const progress = Math.floor((current / total) * width);
    const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
    const percentage = Math.floor((current / total) * 100);
    process.stdout.write(`\r${label} [${bar}] ${percentage}% (${current}/${total})`);
}

function showLoadingAnimation() {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    return setInterval(() => {
        process.stdout.write('\r' + chalk.cyan(`Loading Rocket AIO ${frames[i]} `) + ' '.repeat(50));
        i = (i + 1) % frames.length;
    }, 80);
}

// Update the main function
async function main() {
    try {
        // Clear screen and show ASCII art
        console.clear();
        if (fs.existsSync('./src/ascii.txt')) {
            const ascii = fs.readFileSync('./src/ascii.txt', 'utf8');
            console.log(chalk.magenta(ascii));
        }
        
        // Initialize proxies first
        console.log(chalk.yellow('\nInitializing Rocket AIO...'));
        console.log(chalk.gray('─'.repeat(50)));

        try {
            // Fetch and validate proxies without loading animation
            await RPCManager.fetchProxies();
        } catch (error) {
            console.error(chalk.red('Error loading proxies:', error));
        }
        
        // Show config menu with updated proxy count
        await displayConfigMenu();
        
        // Then proceed with the rest of the initialization
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        
        if (!fs.existsSync(config.WALLET_BUYERS_FOLDER)) {
            console.log(chalk.yellow(`Creating wallet directory: ${config.WALLET_BUYERS_FOLDER}`));
            fs.mkdirSync(config.WALLET_BUYERS_FOLDER, { recursive: true });
        }

        handleMainMenu();
    } catch (error) {
        console.error(chalk.red('Error in main:', error));
        process.exit(1);
    }
}

// Start the program
main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});
