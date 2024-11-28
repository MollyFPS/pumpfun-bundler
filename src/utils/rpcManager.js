import { Connection } from '@solana/web3.js';
import fs from 'fs';
import chalk from 'chalk';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import EventEmitter from 'events';
import { rl } from './readline.js';
import pkg from 'proxy-chain';
const { Server } = pkg;

// Create a singleton instance of EventEmitter
const eventEmitter = new EventEmitter();

export class RPCManager {
    static proxyList = [];
    static currentProxyIndex = 0;

    // Add static method to emit events
    static emit(event, data) {
        eventEmitter.emit(event, data);
    }

    // Add static method to listen for events
    static on(event, listener) {
        eventEmitter.on(event, listener);
    }

    static async fetchProxies() {
        try {
            // First check if we have existing valid proxies
            if (fs.existsSync('valid_proxies.json')) {
                const existingProxies = JSON.parse(fs.readFileSync('valid_proxies.json', 'utf8'));
                if (existingProxies.length > 0) {
                    console.log(chalk.green(`\nFound ${existingProxies.length} existing valid proxies`));
                    console.log(chalk.yellow('Would you like to:'));
                    console.log(chalk.cyan('1.'), 'Use existing proxies');
                    console.log(chalk.cyan('2.'), 'Fetch new proxies');
                    
                    process.stdout.write(chalk.yellow('\nPlease enter your choice (1-2): '));
                    const choice = await new Promise(resolve => {
                        process.stdin.once('data', data => {
                            resolve(data.toString().trim());
                        });
                    });

                    if (choice === '1') {
                        this.proxyList = existingProxies;
                        return existingProxies.length;
                    }
                }
            }

            console.log(chalk.yellow('\nFetching proxies from premium sources...'));
            const sources = [
                'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=elite',
                'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=us&ssl=all&anonymity=elite',
                'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=gb&ssl=all&anonymity=elite',
                'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps&anonymityLevel=elite&filterUpTime=90',
                'https://api.proxynova.com/proxylist?limit=500&page=1&sort_by=lastChecked&protocols=http,https&anonymityLevel=elite'
            ];

            const proxies = new Set();
            let isCancelled = false;

            // Add event listener for user input
            const keyPressHandler = (str, key) => {
                if (key.ctrl && key.name === 'c') {
                    isCancelled = true;
                    console.log(chalk.yellow('\nStopping proxy fetch...'));
                }
            };
            process.stdin.on('keypress', keyPressHandler);
            
            console.log(chalk.gray('Press Ctrl+C to stop fetching and use current proxies\n'));

            // Fetch from premium sources first
            for (const source of sources) {
                if (isCancelled) break;
                
                try {
                    const response = await axios.get(source, { 
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    let proxyList;
                    if (source.includes('geonode')) {
                        proxyList = response.data.data.map(p => `${p.ip}:${p.port}`);
                    } else if (source.includes('proxynova')) {
                        proxyList = response.data.map(p => `${p.ip}:${p.port}`);
                    } else {
                        proxyList = response.data.split('\n')
                            .map(proxy => proxy.trim())
                            .filter(proxy => proxy.match(/\d+\.\d+\.\d+\.\d+:\d+/));
                    }

                    proxyList.forEach(proxy => proxies.add(`http://${proxy}`));
                    console.log(chalk.green(`Found ${proxyList.length} proxies from ${source}`));
                } catch (error) {
                    console.log(chalk.yellow(`Failed to fetch from ${source}`));
                }
            }

            // Remove keypress handler
            process.stdin.removeListener('keypress', keyPressHandler);

            // Create additional proxies if needed and not cancelled
            if (!isCancelled && proxies.size < 1000) {
                console.log(chalk.yellow('\nCreating additional proxies...'));
                const newProxies = await this.createProxies(1000 - proxies.size);
                newProxies.forEach(proxy => proxies.add(proxy));
            }

            const totalAvailable = proxies.size;
            console.log(chalk.green(`\nTotal available proxies: ${totalAvailable}`));

            // Ask user how many proxies they want to load
            console.log(chalk.yellow('\nChoose how many proxies to load:'));
            console.log(chalk.cyan('1.'), 'Load all proxies');
            console.log(chalk.cyan('2.'), 'Load 1000 proxies');
            console.log(chalk.cyan('3.'), 'Load 500 proxies');
            console.log(chalk.cyan('4.'), 'Load 100 proxies');
            console.log(chalk.cyan('5.'), 'Enter custom amount');

            process.stdout.write(chalk.yellow('\nPlease enter your choice (1-5): '));
            const choice = await new Promise(resolve => {
                process.stdin.once('data', data => {
                    resolve(data.toString().trim());
                });
            });

            let proxyAmount;
            switch (choice) {
                case '1': proxyAmount = totalAvailable; break;
                case '2': proxyAmount = Math.min(1000, totalAvailable); break;
                case '3': proxyAmount = Math.min(500, totalAvailable); break;
                case '4': proxyAmount = Math.min(100, totalAvailable); break;
                case '5':
                    process.stdout.write(chalk.yellow('Enter number of proxies to load: '));
                    proxyAmount = await new Promise(resolve => {
                        process.stdin.once('data', data => {
                            resolve(parseInt(data.toString().trim()));
                        });
                    });
                    proxyAmount = Math.min(proxyAmount, totalAvailable);
                    break;
                default: proxyAmount = totalAvailable;
            }

            // Convert Set to Array and take the requested amount
            this.proxyList = [...proxies].slice(0, proxyAmount);
            
            // Save all proxies first
            fs.writeFileSync('proxies.json', JSON.stringify(this.proxyList, null, 2));
            
            // Start validation
            console.log(chalk.yellow('\nValidating proxies...'));
            const validCount = await this.validateProxies();
            console.log(chalk.green(`\nValidation complete! ${validCount} working proxies found.`));
            
            return validCount;
        } catch (error) {
            console.error(chalk.red('Failed to fetch proxies:', error));
            return 0;
        }
    }

    static async createProxies(count) {
        const newProxies = [];
        const server = new Server({
            port: 0,
            prepareRequestFunction: ({ request, username, password, hostname, port, isHttp }) => {
                return {
                    requestAuthentication: false,
                    upstreamProxyUrl: `http://${hostname}:${port}`
                };
            }
        });

        await server.listen();
        const port = server.port;

        for (let i = 0; i < count; i++) {
            const proxy = `http://localhost:${port + i}`;
            newProxies.push(proxy);
        }

        console.log(chalk.green(`Created ${count} new proxies`));
        return newProxies;
    }

    static async getNextProxy() {
        if (this.proxyList.length === 0) {
            if (fs.existsSync('valid_proxies.json')) {
                this.proxyList = JSON.parse(fs.readFileSync('valid_proxies.json', 'utf8'));
            }
            if (this.proxyList.length === 0) {
                return null;
            }
        }

        const proxy = this.proxyList[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        return proxy;
    }

    static async getConnection() {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const currentIndex = config.CURRENT_RPC_INDEX;
        const rpcUrl = config.RPC_URLS[currentIndex];

        const proxy = await this.getNextProxy();
        if (proxy) {
            try {
                // Convert HTTP proxy to HTTPS
                const proxyUrl = new URL(proxy);
                const httpsProxy = `https://${proxyUrl.hostname}:${proxyUrl.port}`;
                
                // Create HTTPS proxy agent
                const agent = new HttpsProxyAgent({
                    protocol: 'https:',
                    host: proxyUrl.hostname,
                    port: proxyUrl.port,
                    rejectUnauthorized: false,
                    secureProxy: true,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                return new Connection(rpcUrl, {
                    commitment: config.COMMITMENT,
                    wsEndpoint: config.WS_URL,
                    httpAgent: agent,
                    httpsAgent: agent,
                    disableRetryOnRateLimit: false,
                    confirmTransactionInitialTimeout: 60000
                });
            } catch (error) {
                console.log(chalk.yellow(`Failed to create proxy connection: ${error.message}`));
                // Fallback to direct connection
                return new Connection(rpcUrl, {
                    commitment: config.COMMITMENT,
                    wsEndpoint: config.WS_URL,
                    disableRetryOnRateLimit: false,
                    confirmTransactionInitialTimeout: 60000
                });
            }
        }

        // Return connection without proxy if none available
        return new Connection(rpcUrl, {
            commitment: config.COMMITMENT,
            wsEndpoint: config.WS_URL,
            disableRetryOnRateLimit: false,
            confirmTransactionInitialTimeout: 60000
        });
    }

    static async switchToNextRPC() {
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        const nextIndex = (config.CURRENT_RPC_INDEX + 1) % config.RPC_URLS.length;
        
        config.CURRENT_RPC_INDEX = nextIndex;
        config.WS_URL = config.RPC_URLS[nextIndex].replace('https://', 'wss://');
        
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        console.log(chalk.yellow(`Switched to RPC: ${config.RPC_URLS[nextIndex]}`));
        
        // Also switch proxy
        const proxy = await this.getNextProxy();
        console.log(chalk.yellow(`Using proxy: ${proxy}`));

        const agent = new HttpsProxyAgent(proxy);
        
        return new Connection(config.RPC_URLS[nextIndex], {
            commitment: config.COMMITMENT,
            wsEndpoint: config.WS_URL,
            httpAgent: agent,
            httpsAgent: agent,
            disableRetryOnRateLimit: false
        });
    }

    static async executeWithRetry(operation, maxRetries = 3) {
        let lastError;
        
        // Ensure we have proxies loaded
        if (this.proxyList.length === 0) {
            await this.fetchProxies();
        }
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const connection = await this.getConnection();
                return await operation(connection);
            } catch (error) {
                lastError = error;
                console.log(chalk.yellow(`Attempt ${attempt + 1} failed, switching RPC and proxy...`));
                await this.switchToNextRPC();
            }
        }
        
        throw new Error(`All attempts failed. Last error: ${lastError.message}`);
    }

    static async testProxy(proxy, timeout = 3000) {
        try {
            const agent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.mainnet-beta.solana.com', {
                httpsAgent: agent,
                timeout: timeout,
                validateStatus: status => status === 200
            });
            return true;
        } catch {
            return false;
        }
    }

    static async validateProxies() {
        const validProxies = [];
        const total = this.proxyList.length;
        let completed = 0;
        let success = 0;
        let failed = 0;
        let isCancelled = false;

        // Add event listener for Ctrl+C
        const keyPressHandler = (str, key) => {
            if (key.ctrl && key.name === 'c') {
                isCancelled = true;
                console.log(chalk.yellow('\nStopping proxy validation...'));
                console.log(chalk.green(`Using ${success} working proxies found so far`));
                
                // Save current valid proxies
                this.proxyList = validProxies;
                fs.writeFileSync('valid_proxies.json', JSON.stringify(validProxies, null, 2));
                
                // Clean up
                process.stdin.removeListener('keypress', keyPressHandler);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                
                // Return to config menu
                process.nextTick(() => {
                    this.emit('validation-complete');
                });
            }
        };

        try {
            // Enable raw mode for better key handling
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.on('keypress', keyPressHandler);
            
            console.log(chalk.gray('Press Ctrl+C to stop validation and use working proxies\n'));

            // Process proxies in smaller chunks
            const chunkSize = 10;
            for (let i = 0; i < this.proxyList.length && !isCancelled; i += chunkSize) {
                const chunk = this.proxyList.slice(i, i + chunkSize);
                const promises = chunk.map(async proxy => {
                    if (isCancelled) return false;

                    const isValid = await this.testProxy(proxy);
                    completed++;
                    if (isValid) {
                        success++;
                        validProxies.push(proxy);
                    } else {
                        failed++;
                    }
                    
                    console.log(chalk.cyan(`Progress: ${completed}/${total} | Working: ${success} | Failed: ${failed}`));
                    return isValid;
                });

                if (!isCancelled) {
                    await Promise.all(promises);
                }
            }

            return validProxies.length;
        } catch (error) {
            console.error(chalk.red('Error in proxy validation:', error));
            return validProxies.length;
        } finally {
            // Clean up
            process.stdin.removeListener('keypress', keyPressHandler);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            
            // Save results
            this.proxyList = validProxies;
            fs.writeFileSync('valid_proxies.json', JSON.stringify(validProxies, null, 2));

            if (isCancelled) {
                console.log(chalk.yellow('\nValidation stopped early'));
                console.log(chalk.green(`Using ${validProxies.length} working proxies`));
                
                // Return to config menu
                process.nextTick(() => {
                    this.emit('validation-complete');
                });
            } else {
                console.log(chalk.green(`\nValidation complete! ${validProxies.length} working proxies found`));
            }
        }
    }
}

// Remove the automatic initialization
// RPCManager.fetchProxies().then(() => RPCManager.validateProxies()); 