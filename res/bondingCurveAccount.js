import { struct, u64, bool } from '@coral-xyz/borsh';
11
export class BondingCurveAccount {
    constructor(discriminator, virtualTokenReserves, virtualSolReserves, realTokenReserves, realSolReserves, tokenTotalSupply, complete) {
        this.discriminator = discriminator;
        this.virtualTokenReserves = virtualTokenReserves;
        this.virtualSolReserves = virtualSolReserves;
        this.realTokenReserves = realTokenReserves;
        this.realSolReserves = realSolReserves;
        this.tokenTotalSupply = tokenTotalSupply;
        this.complete = complete;
    }

    getBuyPrice(amount) {
        if (this.complete) {
            throw new Error("Curve is complete");
        }
        if (amount <= 0n) {
            return 0n;
        }
        let n = this.virtualSolReserves * this.virtualTokenReserves;
        let i = this.virtualSolReserves + amount;
        let r = n / i + 1n;
        let s = this.virtualTokenReserves - r;
        return s < this.realTokenReserves ? s : this.realTokenReserves;
    }

    getSellPrice(amount, feeBasisPoints) {
        if (this.complete) {
            throw new Error("Curve is complete");
        }
        if (amount <= 0n) {
            return 0n;
        }
        let n = (amount * this.virtualSolReserves) / (this.virtualTokenReserves + amount);
        let a = (n * feeBasisPoints) / 10000n;
        return n - a;
    }

    getMarketCapSOL() {
        if (this.virtualTokenReserves === 0n) {
            return 0n;
        }
        return ((this.tokenTotalSupply * this.virtualSolReserves) /
            this.virtualTokenReserves);
    }

    getFinalMarketCapSOL(feeBasisPoints) {
        let totalSellValue = this.getBuyOutPrice(this.realTokenReserves, feeBasisPoints);
        let totalVirtualValue = this.virtualSolReserves + totalSellValue;
        let totalVirtualTokens = this.virtualTokenReserves - this.realTokenReserves;
        if (totalVirtualTokens === 0n) {
            return 0n;
        }
        return (this.tokenTotalSupply * totalVirtualValue) / totalVirtualTokens;
    }

    getBuyOutPrice(amount, feeBasisPoints) {
        let solTokens = amount < this.realSolReserves ? this.realSolReserves : amount;
        let totalSellValue = (solTokens * this.virtualSolReserves) /
            (this.virtualTokenReserves - solTokens) +
            1n;
        let fee = (totalSellValue * feeBasisPoints) / 10000n;
        return totalSellValue + fee;
    }

    static fromBuffer(buffer) {
        const structure = struct([
            u64("discriminator"),
            u64("virtualTokenReserves"),
            u64("virtualSolReserves"),
            u64("realTokenReserves"),
            u64("realSolReserves"),
            u64("tokenTotalSupply"),
            bool("complete"),
        ]);
        let value = structure.decode(buffer);
        return new BondingCurveAccount(
            BigInt(value.discriminator),
            BigInt(value.virtualTokenReserves),
            BigInt(value.virtualSolReserves),
            BigInt(value.realTokenReserves),
            BigInt(value.realSolReserves),
            BigInt(value.tokenTotalSupply),
            value.complete
        );
    }
}
