import readline from 'readline';

// Create a single shared readline interface
export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Handle cleanup on exit
process.on('exit', () => {
    rl.close();
}); 