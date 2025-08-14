import axios from 'axios';
import { DAPP_API_TOKEN } from './constants.js';

const priceCache: Record<string, bigint> = {};

// 30-day historic price cache per token/unit
interface HistoricPrice {
    date: string; // ISO date
    price: bigint;
}
const historicPriceCache: Record<string, HistoricPrice[]> = {};

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

/**
 * Fetch or use cached 30-day historic prices for a token in lovelace (ADA micro-units).
 * @param unit Asset unit string (policy + hex name)
 * @returns Array of { date: string, price: bigint } for the last 30 days (most recent last)
 */
export async function getTokenHistoricPricesInLovelace(unit: string): Promise<HistoricPrice[]> {
    // ADA itself (flat price)
    if (unit === 'lovelace') {
        // Return 30 days of 1 ADA
        const today = new Date();
        return Array.from({ length: 30 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (29 - i));
            return { date: d.toISOString().slice(0, 10), price: 1_000_000n };
        });
    }
    // Check cache
    const cached = historicPriceCache[unit];
    if (cached && cached.length === 30) {
        // Check if the last date is today (cache valid)
        const todayStr = new Date().toISOString().slice(0, 10);
        if (cached[cached.length - 1].date === todayStr) {
            return cached;
        }
    }
    // Fetch from API
    const policy = unit.slice(0, 56);
    const nameHex = unit.slice(56);
    try {
        // ADD DAPP_API_TOKEN as barear token
        const url = `https://dapp.mayz.io/api/prices-historic/historic-priceADAx1e6-by-Token?CS=${policy}&TN_Hex=${nameHex}&days=30`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${DAPP_API_TOKEN}` } });
        const arr = res.data?.prices;
        if (!Array.isArray(arr)) throw new Error('Missing or invalid history in response');
        // Expect arr: [{ date: string, priceADAx1e6: string }]
        const history: HistoricPrice[] = arr.map((item: any) => ({
            date: item.date,
            price: BigInt(item.priceADAx1e6)
        }));
        if (history.length !== 30) throw new Error('History array length is not 30');
        historicPriceCache[unit] = history;
        return history;
    } catch (e: any) {
        console.error(`[PRICES][ERROR] Failed to fetch historic prices for ${unit}: ${e.message}`);
        throw e;
    }
}
