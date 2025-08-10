import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import fs from 'fs';
import path from 'path';
import { getBlockfrostKey, requireEnv } from './utils.js';

let myEnv;
if (fs.existsSync('.env.local')) {
    myEnv = dotenv.config({ path: '.env.local' });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
    myEnv = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} else {
    myEnv = dotenv.config(); // fallback a .env
}

dotenvExpand.expand(myEnv);
console.log('process.env.NEXT_PUBLIC_CARDANO_NET:', process.env.NEXT_PUBLIC_CARDANO_NET);
console.log('process.env.GMAYZ_FUND_POLICY_CS:', process.env.GMAYZ_FUND_POLICY_CS);

export const MONGO_URLDB_GOVERNANCE = requireEnv('GOVERNANCE_MONGO_URLDB');
export const MONGO_URLDB_DAPP = requireEnv('DAPP_MONGO_URLDB');
export const GMAYZ_FUND_POLICY_CS = requireEnv('GMAYZ_FUND_POLICY_CS');

export const SUPABASE_URL = requireEnv('SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');

export const BLOCKFROST_API_KEY = getBlockfrostKey();
export const BASE_URL =
    process.env.NEXT_PUBLIC_CARDANO_NET?.toLowerCase() === 'mainnet'
        ? 'https://cardano-mainnet.blockfrost.io/api/v0'
        : process.env.NEXT_PUBLIC_CARDANO_NET?.toLowerCase() === 'preview'
        ? 'https://cardano-preview.blockfrost.io/api/v0'
        : process.env.NEXT_PUBLIC_CARDANO_NET?.toLowerCase() === 'preprod'
        ? 'https://cardano-preprod.blockfrost.io/api/v0'
        : '';

export const DELEGATION_CREATE = 'Delegation - Create';
export const DELEGATION_DEPOSIT = 'Delegation - Deposit';
export const SWAPOFFER_CREATE = 'Swap Offer - Create';
export const SWAPOFFER_DEPOSIT = 'Swap Offer - Deposit';
export const SWAPOFFER_SWAP_ADA_FT = 'Swap Offer - Buy FT';

export const GMAYZ_MAX_MULTIPLIER = 1_000;

export const REGISTRATION_MIN_GMAYZ = 100;
export const SWAPOFFER_MIN_ADA = 500;

export const TASK_MAX_POINTS = 4_000;