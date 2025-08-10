import axios from 'axios';

const priceCache: Record<string, bigint> = {};

/**
 * Fetch the price of a token in lovelace (ADA micro-units).
 * Only ADA prices are supported in this module.
 * @param unit Asset unit string (policy + hex name)
 */
export async function getTokenPriceInLovelace(unit: string): Promise<bigint> {
    // ADA itself
    if (unit === 'lovelace') return 1_000_000n;
    if (priceCache[unit] !== undefined) return priceCache[unit];
    const policy = unit.slice(0, 56);
    const nameHex = unit.slice(56);
    try {
        const url = `https://dapp.mayz.io/api/prices/get-priceADAx1e6?CS=${policy}&TN_Hex=${nameHex}&validityMS=100000`;
        const res = await axios.get(url);
        const priceStr = res.data?.priceADAx1e6;
        if (!priceStr) throw new Error('Missing priceADAx1e6 in response');
        const priceLovelace = BigInt(priceStr);
        priceCache[unit] = priceLovelace;
        return priceLovelace;
    } catch (e: any) {
        console.error(`[PRICES][ERROR] Failed to fetch price for ${unit}: ${e.message}`);
        throw e;
    }
}
