import * as BufferLayout from '@solana/buffer-layout';
import * as BufferLayoutUtils from '@solana/buffer-layout-utils';

// Create layout functions
const u64 = (property) => {
    return BufferLayout.blob(8, property);
};

const bool = (property) => {
    return BufferLayout.u8(property);
};

// Define the layout for pump.fun transactions
export const PUMP_LAYOUT = BufferLayout.struct([
    u64('instruction'),
    u64('amount'),
    u64('minSolOutput')
]);

// Define instruction types
export const INSTRUCTION_TYPES = {
    BUY: BigInt("12502976635542562355"),
    SELL: BigInt("12502976635542562356")
};

// Define account indexes
export const ACCOUNT_INDEXES = {
    GLOBAL: 0,
    FEE_RECIPIENT: 1,
    MINT: 2,
    BONDING_CURVE: 3,
    ASSOCIATED_BONDING_CURVE: 4,
    TOKEN_ACCOUNT: 5,
    OWNER: 6,
    SYSTEM_PROGRAM: 7,
    ASSOCIATED_TOKEN_PROGRAM: 8,
    TOKEN_PROGRAM: 9,
    EVENT_AUTHORITY: 10,
    PROGRAM: 11
};

// Define program IDs
export const PROGRAM_IDS = {
    SYSTEM_PROGRAM: "11111111111111111111111111111111",
    TOKEN_PROGRAM: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ASSOCIATED_TOKEN_PROGRAM: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    EVENT_AUTHORITY: "Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1",
    PUMP_PROGRAM: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
};

// Define seeds for PDAs
export const PDA_SEEDS = {
    GLOBAL: Buffer.from("global"),
    MINT_AUTHORITY: Buffer.from("mint-authority"),
    BONDING_CURVE: Buffer.from("bonding-curve")
};

// Export utility functions
export function createInstructionData(instruction, amount, minOutput) {
    const buffer = Buffer.alloc(PUMP_LAYOUT.span);
    PUMP_LAYOUT.encode(
        {
            instruction: instruction,
            amount: amount,
            minSolOutput: minOutput
        },
        buffer
    );
    return buffer;
}

export function decodeInstructionData(buffer) {
    return PUMP_LAYOUT.decode(buffer);
}

// Export the BondingCurveLayout for use in pumpDecode.js
export const BondingCurveLayout = BufferLayout.struct([
    u64('virtualTokenReserves'),
    u64('virtualSolReserves'),
    u64('realTokenReserves'),
    u64('realSolReserves'),
    u64('tokenTotalSupply'),
    bool('complete')
]); 