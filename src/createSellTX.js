import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PROGRAM_IDS, INSTRUCTION_TYPES, createInstructionData } from './PUMP_LAYOUT.js';
import GPA from './pumpDecode.js';

export async function createSellTXWithTip(mint, wallet, amount) {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const connection = new Connection(config.RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: config.WS_URL
    });

    const mintPubkey = new PublicKey(mint);
    const owner = wallet.publicKey;

    // Get associated token account
    const associatedTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        owner
    );

    // Get bonding curve data
    const bondingCurve = await getBondingCurve(mintPubkey);
    const bondingCurveData = await GPA(bondingCurve.toString());

    // Calculate minimum SOL output based on virtual reserves
    const minSolOutput = calculateMinSolOutput(
        amount,
        bondingCurveData.virtualTokenReserves,
        bondingCurveData.virtualSolReserves
    );

    // Create the sell instruction
    const sellIx = new TransactionInstruction({
        programId: new PublicKey(PROGRAM_IDS.PUMP_PROGRAM),
        keys: [
            { pubkey: new PublicKey(PROGRAM_IDS.SYSTEM_PROGRAM), isSigner: false, isWritable: false },
            { pubkey: owner, isSigner: true, isWritable: true },
            { pubkey: mintPubkey, isSigner: false, isWritable: true },
            { pubkey: associatedTokenAccount, isSigner: false, isWritable: true },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            // Add other required accounts...
        ],
        data: createInstructionData(
            INSTRUCTION_TYPES.SELL,
            amount,
            minSolOutput
        )
    });

    // Create Jito tip transaction
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
        fromPubkey: owner,
        toPubkey: new PublicKey(randomTipAccount),
        lamports: jitoTipAmount
    });

    return [sellIx, tipIx];
}

async function getBondingCurve(mintPubkey) {
    const [bondingCurve] = await PublicKey.findProgramAddressSync(
        [
            Buffer.from('bonding-curve'),
            mintPubkey.toBuffer()
        ],
        new PublicKey(PROGRAM_IDS.PUMP_PROGRAM)
    );
    return bondingCurve;
}

function calculateMinSolOutput(amount, virtualTokenReserves, virtualSolReserves) {
    // Implement price impact calculation
    // This is a simplified version - you might want to add slippage tolerance
    const priceImpact = 0.95; // 5% slippage tolerance
    const expectedOutput = (amount * virtualSolReserves) / virtualTokenReserves;
    return Math.floor(expectedOutput * priceImpact);
}

export default {
    createSellTXWithTip
};
