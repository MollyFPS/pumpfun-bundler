import pkg from '@solana/web3.js';
const { Commitment, Connection, Finality, Keypair, PublicKey, Transaction } = pkg;

import anchorPkg from "@coral-xyz/anchor";
const { Program, Provider } = anchorPkg;

import { GlobalAccount } from "./globalAccount.js";
import { BondingCurveAccount } from "./bondingCurveAccount.js";
import { IDL } from "./IDL/index.js";

export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";
export const DEFAULT_DECIMALS = 6;

export class PumpFunSDK {
    program;
    connection;

    constructor(provider) {
        this.connection = provider ? provider.connection : null;
        // Additional initialization if needed
    }

    // Add your SDK methods here
}
