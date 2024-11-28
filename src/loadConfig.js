import fs from 'fs';
import chalk from 'chalk';

async function loadConfig() {
    const configPath = './config.json';
    try {
        if (!fs.existsSync(configPath)) {
            throw new Error(`Config file not found at ${configPath}`);
        }

        const rawConfig = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(rawConfig);

        // Validate required fields
        const requiredFields = [
            'RPC_URL', 
            'WS_URL', 
            'BLOCK_ENGINE_URL', 
            'JITO_TIP_SECRET_KEY',
            'WALLET_BUYERS_FOLDER',
            'SECRET_KEY_PATH'
        ];

        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`Missing required config field: ${field}`);
            }
        }

        return config;
    } catch (error) {
        console.error(chalk.red(`Config Error: ${error.message}`));
        process.exit(1);
    }
}

export default loadConfig;