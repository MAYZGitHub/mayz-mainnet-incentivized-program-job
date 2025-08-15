// At the top of your file or in a utils file

import mongoose from 'mongoose';
import { ITransaction } from './models/transaction.model.js';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { CML } from '@lucid-evolution/lucid';
import { IUserTaskPoints } from './types.js';

// --- CONFIG HELPERS ---
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function getBlockfrostKey(): string {
    const net = process.env.NEXT_PUBLIC_CARDANO_NET?.toLowerCase();
    if (net === 'mainnet') return process.env.BLOCKFROST_KEY_MAINNET!;
    if (net === 'preview') return process.env.BLOCKFROST_KEY_PREVIEW!;
    if (net === 'preprod') return process.env.BLOCKFROST_KEY_PREPROD!;
    throw new Error('Unsupported or missing NEXT_PUBLIC_CARDANO_NET');
}

// --- DB HELPERS ---
export async function connectDb(url: string, name: string) {
    try {
        await mongoose.connect(url);
        console.log(`[DB] Connected to ${name}`);
    } catch (err) {
        console.error(`[DB] Failed to connect to ${name}:`, err);
        throw err;
    }
}
export async function disconnectDb(name: string) {
    try {
        await mongoose.disconnect();
        console.log(`[DB] Disconnected from ${name}`);
    } catch (err) {
        console.error(`[DB] Failed to disconnect from ${name}:`, err);
    }
}

/**
 * Returns a Supabase client after checking required environment variables.
 * Throws an error if variables are missing.
 */
export function getSupabaseClient(): SupabaseClient {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
        throw new Error('Supabase environment variables are not set.');
    }
    try {
        return createClient(url, anonKey);
    } catch (err) {
        console.error('[Supabase] Failed to create client:', err);
        throw err;
    }
}

export async function isSharedOnXTxHash(walletAddress: string, txHash: string) {
    try {
        const supabase = getSupabaseClient();

        
        const { data, error } = await supabase.from('x_shares').select('user_address').eq('user_address', walletAddress).eq('tx_hash', txHash).single();

        if (error) {
            // Not found or other error
            return false;
        }
        return !!data;
    } catch (error) {
        console.error(`Error checking shared on X: ${error}`);
        return false;
    }
}

export async function saveUserTaskPoints(userTaskPoints: IUserTaskPoints[]) {
    try {
        // Map input objects to the exact user_task_points table schema
        const mappedRows = userTaskPoints.map(pt => ({
            date: pt.date,
            paymentPKH: pt.paymentPKH,
            stakePKH: pt.stakePKH,
            address: pt.address,
            gMAYZHeld: pt.gMAYZHeld,
            multiplier: pt.multiplier,
            task: pt.task,
            // amountUnit: pt.amountUnit,
            amount: pt.amount,
            currentAmount: pt.currentAmount,
            points: pt.points,
            isValid: pt.isValid,
            finalPoints: pt.finalPoints,
            // created_at is handled by the DB default
        }));

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.from('user_task_points').insert(mappedRows);

        if (error) {
            throw new Error(`Error inserting user task points: ${error}`);
        }
        return data;
    } catch (error) {
        console.error(`Error inserting user task points: ${error}`);
        throw error;
    }
}

/**
 * Dummy signer check for Cardano txs.
 * Blockfrost does NOT expose real tx signers (vkey witnesses).
 * This always returns true for now.
 * TODO: Implement input-address-based inference if needed.
 */
export function txHasSigner(tx: ITransaction, paymentPKH: string): boolean {
    // Blockfrost limitation: no real signer info
    // Placeholder logic (always true)
    // Optionally: log a warning
    // console.warn('[DUMMY] txHasSigner always returns true due to Blockfrost limitations');
    return true;
}

export function extractHashesFromAddress(address: string): { pkh: string; stake: string } {
    const parsed = CML.Address.from_bech32(address);
    const base = CML.BaseAddress.from_address(parsed);
    if (!base) throw new Error('Only BaseAddress format is supported');

    const pkh = base.payment().to_canonical_cbor_hex();
    const stake = base.stake().to_canonical_cbor_hex();

    return { pkh, stake };
}

/**
 * Extracts the script hash (hex) from a Plutus script address (Bech32).
 * Throws if not a valid script address.
 */
export function scriptHashFromAddress(address: string): string {
    const parsed = CML.Address.from_bech32(address);
    const scriptCred = parsed.payment_cred()?.as_script();
    if (!scriptCred) throw new Error('Address is not a script address');
    return scriptCred.to_hex();
}

/**
 * Works like JSON.stringify, but serializes BigInt as string.
 * Supports all JSON.stringify arguments: value, replacer, space.
 * Usage: toJson(obj, replacer, space)
 */
export function toJson(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string {
    return JSON.stringify(
        value,
        function (this: any, key, val) {
            if (typeof val === 'bigint') return val.toString();
            return replacer ? replacer.call(this, key, val) : val;
        },
        space
    );
}


// Robust UTC date formatting helper
export function formatDateUTC(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
