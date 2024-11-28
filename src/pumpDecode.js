import * as web3 from '@solana/web3.js';
import { BondingCurveLayout } from './PUMP_LAYOUT.js';
import fs from 'fs';
import { PublicKey, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PUMP_LAYOUT, INSTRUCTION_TYPES, ACCOUNT_INDEXES, PROGRAM_IDS, createInstructionData } from './PUMP_LAYOUT.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

async function GPA(bonding_curve) {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const rpcURL = config.RPC_URL;
    const wsURL = config.WS_URL;
    
    const conn = new web3.Connection(rpcURL, {
        commitment: 'confirmed',
        wsEndpoint: wsURL
    });

    try {
        const curve = new web3.PublicKey(bonding_curve);
        const data = await conn.getAccountInfo(curve, {
            commitment: 'confirmed'
        });
        if (data === null) {
            throw new Error("Error Parsing Data, Likely RPC Issue.");
        }

        const buffer = Buffer.from(data.data).slice(8);
        const decodedData = BondingCurveLayout.deserialize(buffer);
        const vTokenReserve = decodedData.virtualTokenReserves.toString();
        const vSolReserve = decodedData.virtualSolReserves.toString();
        const rTokenReserves = decodedData.realTokenReserves.toString();
        const rSolReserves = decodedData.realSolReserves.toString();
        const tokenTotalSupply = decodedData.tokenTotalSupply.toString();
        const adjustedVTokenReserve = vTokenReserve / 10 ** 6;
        const adjustedVSolReserve = vSolReserve / 10 ** 9;
        const virtualTokenPrice = adjustedVSolReserve / adjustedVTokenReserve;

        return {
            vTokenReserve,
            vSolReserve,
            rTokenReserves,
            rSolReserves,
            tokenTotalSupply,
            adjustedVTokenReserve,
            adjustedVSolReserve,
            virtualTokenPrice
        };
    } catch (error) {
        const logFilePath = "./logs.txt";
        const errorMessage = `Error occurred: ${error.message || error}\n`;
        fs.appendFileSync(logFilePath, errorMessage);
        console.log("An error occurred, check logs.txt for more information.");
        throw error;
    }
}

export async function createBuyInstruction(connection, wallet, tokenMint, amount) {
    try {
        const mintPubkey = new PublicKey(tokenMint);
        const owner = wallet.publicKey;

        // Get bonding curve PDA
        const [bondingCurve] = await PublicKey.findProgramAddressSync(
            [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
            new PublicKey(PROGRAM_IDS.PUMP_PROGRAM)
        );

        // Convert amount to lamports
        const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

        // Create instruction data using the PUMP_LAYOUT
        const instructionData = createInstructionData(
            INSTRUCTION_TYPES.BUY,
            BigInt(amountLamports),
            BigInt(0) // minOutput set to 0
        );

        // Create the instruction
        const ix = new TransactionInstruction({
            programId: new PublicKey(PROGRAM_IDS.PUMP_PROGRAM),
            keys: [
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: owner, isSigner: true, isWritable: true },
                { pubkey: mintPubkey, isSigner: false, isWritable: true },
                { pubkey: bondingCurve, isSigner: false, isWritable: true }
            ],
            data: instructionData
        });

        return ix;
    } catch (error) {
        console.error('Error creating buy instruction:', error);
        throw error;
    }
}

export async function createSellInstruction(connection, wallet, tokenMint, amount, minSolOutput) {
    // Similar to createBuyInstruction but for selling
    // Implement as needed
}

export default GPA;