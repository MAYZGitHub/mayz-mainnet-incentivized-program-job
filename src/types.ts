// datumsAndRedeemers.ts
// Helpers for parsing and converting serialized datums and redeemers
// Used for incentive program logic. All code and comments in English.

import axios from 'axios';
import { Data } from '@lucid-evolution/lucid';
import { toJson } from './utils.js';
import { BASE_URL, BLOCKFROST_API_KEY } from './constants.js';


export interface IUserTaskPoints {
    date: string;
    paymentPKH: string;
    stakePKH: string;
    address: string;
    gMAYZHeld: number;
    multiplier: number;
    task: string;
    amountUnit: string;
    amount: number;
    currentAmount: number;
    points: number;
    isValid: boolean;
    finalPoints: number;
}

// --- LOCAL TYPE DEFINITIONS (copied from types.ts, no imports) ---

type Maybe<T> = T | null;

type CS = string;
type POSIXTime = string | number;
type PaymentKeyHash = string;
type PaymentPubKey = string;
type StakeCredentialPubKeyHash = string;
type AssetClass = string;

type MinMaxDef<T> = {
    min: T;
    max: T;
};

type FundCategory = {
    fcCategoryNumber: number;
    fcRequiredTokenGov: bigint;
    fcMaxUI: bigint;
};

export interface ProtocolDatum {
    pdProtocolVersion: number;
    pdScriptPolicyID_CS: CS;
    pdScriptValidator_Hash: string;
    pdOraclePaymentPubKey: PaymentPubKey;
    pdOracleData_Valid_Time: POSIXTime;
    pdAdmins: PaymentKeyHash[];
    pdDelegatorsAdmins: PaymentKeyHash[];
    pdTokenAdminPolicy_CS: CS;
    pdFundCategories: FundCategory[];
    pdFundLifeTime: MinMaxDef<POSIXTime>;
    pdTokenGov_AC: AssetClass;
    pdRequiredTokenGovForSwapOffer: bigint;
    pdRequiredTokenGovForBuyOrder: bigint;
    pdCommissionFund_PerYear_InBPx1e3: MinMaxDef<bigint>;
    pdCommissionSwapOffer_InBPx1e3: MinMaxDef<bigint>;
    pdCommissionBuyOrder_InBPx1e3: MinMaxDef<bigint>;
    pdShare_InBPx1e2_Protocol: number;
    pdShare_InBPx1e2_Managers: number;
    pdShare_InBPx1e2_Delegators: number;
    pdMaxDepositAndWithdraw: bigint;
    pdMinADA: bigint;
}

export interface FundDatum {
    fdFundVersion: number;
    fdFundPolicy_CS: CS;
    fdFundFT_TN_Hex: string;
    fdFundValidator_Hash: string;
    fdFundHoldingPolicyID_CS: CS;
    fdFundHoldingValidator_Hash: string;
    fdInvestUnitValidator_Hash: string;
    fdAdmins: PaymentKeyHash[];
    fdTokenAdminPolicy_CS: CS;
    fdFund_Category_Number: number;
    fdBeginAt: POSIXTime;
    fdDeadline: POSIXTime;
    fdClosedAt: Maybe<POSIXTime>;
    fdCommission_PerYear_InBPx1e3: bigint;
    fdCommissions_Table_Numerator_1e6: bigint[];
    fdHoldingsCount: number;
    fdHoldingsIndex: number;
    fdMaxDepositAndWithdraw: bigint;
    fdTokenGov_AC: AssetClass;
    fdRequiredTokenGov: bigint;
    fdMinADA: bigint;
}

export interface FundHoldingDatum {
    hdVersion: number;
    hdFundHolding_Index: number;
    hdSubtotal_FT_Minted_Accumulated: bigint;
    hdSubtotal_FT_Minted: bigint;
    hdSubtotal_FT_Commissions: bigint;
    hdSubtotal_FT_Commissions_Total: bigint;
    hdSubtotal_FT_Commissions_Release_PerMonth_1e6: bigint;
    hdSubtotal_FT_Commissions_Collected_Protocol: bigint;
    hdSubtotal_FT_Commissions_Collected_Managers: bigint;
    hdSubtotal_FT_Commissions_Collected_Delegators: bigint;
    hdMinADA: bigint;
}

export type TokenWithAmountForDatum = [string, string, bigint];
export type TokensForInvestUnitDatum = {
    iuValues: TokenWithAmountForDatum[];
};
export type TokensForInvestUnitWithDetails = {
    iuValuesWithDetailsAndAmount: any[];
};
export type TokensForInvestUnitWithDetails_And_Percentage = {
    iuValuesWithDetailsAndAmount: any[];
};

export interface InvestUnitDatum {
    iuVersion: number;
    iudFundPolicy_CS: CS;
    iudInvestUnit: TokensForInvestUnitDatum;
    iudMinADA: bigint;
}

export interface ScriptDatum {
    sdVersion: number;
    sdFundPolicy_CS: Maybe<CS>;
    sdAdminPaymentPKH: PaymentKeyHash;
    sdAdminStakePKH: Maybe<StakeCredentialPubKeyHash>;
    sdScriptHash: string;
}

export interface SwapOfferDatum {
    sodVersion: number;
    sodSwapOfferPolicyID_CS: CS;
    sodFundPolicy_CS: CS;
    sodSellerPaymentPKH: PaymentKeyHash;
    sodSellerStakePKH: Maybe<StakeCredentialPubKeyHash>;
    sodAskedCommission_InBPx1e3: bigint;
    sodAmount_FT_Available: bigint;
    sodAmount_ADA_Available: bigint;
    sodTotal_FT_Earned: bigint;
    sodTotal_ADA_Earned: bigint;
    sodAllowSellFT: number;
    sodAllowSellADA: number;
    sodSwapStatus: number;
    sodTokenGov_AC: AssetClass;
    sodRequiredTokenGov: bigint;
    sodMinADA: bigint;
}

export interface DelegationDatum {
    ddVersion: number;
    ddDelegationPolicyID_CS: CS;
    ddFundPolicy_CS: CS;
    ddDelegatorPaymentPKH: PaymentKeyHash;
    ddDelegatorStakePKH: Maybe<StakeCredentialPubKeyHash>;
    ddTokenGov_AC: AssetClass;
    ddStaked: bigint;
    ddMinADA: bigint;
}

// --- Redeemer Types ---

export interface SwapOfferValidatorRedeemerUpdateStatus {
    rusNewStatus: number;
}
export interface SwapOfferValidatorRedeemerUpdateCommission {
    rucrNewCommissionRate: bigint;
}
export interface SwapOfferValidatorRedeemerUpdateSwapRestrictions {
    rusrAllowSellFT: number;
    rusrAllowSellADA: number;
}
export interface SwapOfferValidatorRedeemerUpdateMinADA {}
export interface SwapOfferValidatorRedeemerDeposit {
    rdNewDeposit_FT: bigint;
    rdNewDeposit_ADA: bigint;
}
export interface SwapOfferValidatorRedeemerWithdraw {
    rwNewWithdraw_FT: bigint;
    rwNewWithdraw_ADA: bigint;
}
export interface SwapOfferValidatorRedeemerSwapFTxADA {
    rsfxaAmount_FT: bigint;
    rsfxaAmount_ADA: bigint;
    rsfxaCommission_ADA: bigint;
    rsfxaOracle_Data: any;
    rsfxaOracle_Signature: string;
}
export interface SwapOfferValidatorRedeemerSwapADAxFT {
    rsaxfAmount_ADA: bigint;
    rsaxfAmount_FT: bigint;
    rsaxfCommission_FT: bigint;
    rsaxfOracle_Data: any;
    rsaxfOracle_Signature: string;
}
export interface SwapOfferValidatorRedeemerDelete {}
export interface SwapOfferValidatorRedeemerEmergency {}

export type DelegationPolicyRedeemer = DelegationPolicyRedeemerMintID | DelegationPolicyRedeemerBurnID;

export interface DelegationPolicyRedeemerMintID {}

export interface DelegationPolicyRedeemerBurnID {}

export type DelegationValidatorRedeemer =
    | DelegationValidatorRedeemerUpdateMinADA
    | DelegationValidatorRedeemerDeposit
    | DelegationValidatorRedeemerWithdraw
    | DelegationValidatorRedeemerDelete
    | DelegationValidatorRedeemerEmergency;

export interface DelegationValidatorRedeemerUpdateMinADA {}

export interface DelegationValidatorRedeemerDeposit {
    rdDelegated_TokenGov_Change: bigint;
}

export interface DelegationValidatorRedeemerWithdraw {
    rwDelegated_TokenGov_Change: bigint;
}

export interface DelegationValidatorRedeemerDelete {}

export interface DelegationValidatorRedeemerEmergency {}

// --- Datum Parsing Helpers ---

export function parseProtocolDatum(fields: any[]): ProtocolDatum {
    return {
        pdProtocolVersion: Number(fields[0]),
        pdScriptPolicyID_CS: fields[1],
        pdScriptValidator_Hash: fields[2],
        pdOraclePaymentPubKey: fields[3],
        pdOracleData_Valid_Time: fields[4],
        pdAdmins: fields[5],
        pdDelegatorsAdmins: fields[6],
        pdTokenAdminPolicy_CS: fields[7],
        pdFundCategories: fields[8],
        pdFundLifeTime: fields[9],
        pdTokenGov_AC: fields[10],
        pdRequiredTokenGovForSwapOffer: BigInt(fields[11]),
        pdRequiredTokenGovForBuyOrder: BigInt(fields[12]),
        pdCommissionFund_PerYear_InBPx1e3: fields[13],
        pdCommissionSwapOffer_InBPx1e3: fields[14],
        pdCommissionBuyOrder_InBPx1e3: fields[15],
        pdShare_InBPx1e2_Protocol: Number(fields[16]),
        pdShare_InBPx1e2_Managers: Number(fields[17]),
        pdShare_InBPx1e2_Delegators: Number(fields[18]),
        pdMaxDepositAndWithdraw: BigInt(fields[19]),
        pdMinADA: BigInt(fields[20]),
    };
}

export function parseFundDatum(fields: any[]): FundDatum {
    return {
        fdFundVersion: Number(fields[0]),
        fdFundPolicy_CS: fields[1],
        fdFundFT_TN_Hex: fields[2],
        fdFundValidator_Hash: fields[3],
        fdFundHoldingPolicyID_CS: fields[4],
        fdFundHoldingValidator_Hash: fields[5],
        fdInvestUnitValidator_Hash: fields[6],
        fdAdmins: fields[7],
        fdTokenAdminPolicy_CS: fields[8],
        fdFund_Category_Number: Number(fields[9]),
        fdBeginAt: fields[10],
        fdDeadline: fields[11],
        fdClosedAt: fields[12],
        fdCommission_PerYear_InBPx1e3: BigInt(fields[13]),
        fdCommissions_Table_Numerator_1e6: fields[14],
        fdHoldingsCount: Number(fields[15]),
        fdHoldingsIndex: Number(fields[16]),
        fdMaxDepositAndWithdraw: BigInt(fields[17]),
        fdTokenGov_AC: fields[18],
        fdRequiredTokenGov: BigInt(fields[19]),
        fdMinADA: BigInt(fields[20]),
    };
}

export function parseSwapOfferDatum(fields: any[]): SwapOfferDatum {
    // Map array to object according to SwapOfferDatum interface
    return {
        sodVersion: Number(fields[0]),
        sodSwapOfferPolicyID_CS: fields[1],
        sodFundPolicy_CS: fields[2],
        sodSellerPaymentPKH: fields[3],
        sodSellerStakePKH: fields[4],
        sodAskedCommission_InBPx1e3: BigInt(fields[5]),
        sodAmount_FT_Available: BigInt(fields[6]),
        sodAmount_ADA_Available: BigInt(fields[7]),
        sodTotal_FT_Earned: BigInt(fields[8]),
        sodTotal_ADA_Earned: BigInt(fields[9]),
        sodAllowSellFT: Number(fields[10]),
        sodAllowSellADA: Number(fields[11]),
        sodSwapStatus: Number(fields[12]),
        sodTokenGov_AC: fields[13],
        sodRequiredTokenGov: BigInt(fields[14]),
        sodMinADA: BigInt(fields[15]),
    };
}

/**
 * Parses a DelegationDatum from a PlutusData fields array.
 * Returns an object with named fields for easier access.
 */
export function parseDelegationDatum(fields: any[]): DelegationDatum {
    // Map array to object according to DelegationDatum interface
    return {
        ddVersion: Number(fields[0]),
        ddDelegationPolicyID_CS: fields[1],
        ddFundPolicy_CS: fields[2],
        ddDelegatorPaymentPKH: fields[3],
        ddDelegatorStakePKH: fields[4],
        ddTokenGov_AC: fields[5],
        ddStaked: BigInt(fields[6]),
        ddMinADA: BigInt(fields[7]),
    };
}

// --- Redeemers Parsing Helpers ---

/**
 * Parses a SwapOfferValidatorRedeemerDeposit from a PlutusData fields array.
 * Returns an object with named fields for easier access.
 */
export function parseSwapOfferRedeemerDeposit(fields: any[]): SwapOfferValidatorRedeemerDeposit {
    // fields[0] is the actual PlutusData constructor for Deposit
    // fields[0].fields contains the real values in order
    const inner = fields[0]?.fields;
    if (!inner || !Array.isArray(inner) || inner.length < 2) {
        throw new Error('[parseSwapOfferRedeemerDeposit] Invalid nested fields structure');
    }
    return {
        rdNewDeposit_FT: BigInt(inner[0]?.int ?? 0),
        rdNewDeposit_ADA: BigInt(inner[1]?.int ?? 0),
    };
}

/**
 * Parses a SwapOfferValidatorRedeemerSwapADAxFT from a PlutusData fields array.
 * Returns an object with named fields for easier access.
 */
export function parseSwapOfferRedeemerSwapADAxFT(fields: any[]): SwapOfferValidatorRedeemerSwapADAxFT {
    // fields[0] is the actual PlutusData constructor for SwapADAxFT
    // fields[0].fields contains the real values in order
    const inner = fields[0]?.fields;
    if (!inner || !Array.isArray(inner) || inner.length < 5) {
        throw new Error('[parseSwapOfferRedeemerSwapADAxFT] Invalid nested fields structure');
    }
    return {
        rsaxfAmount_ADA: BigInt(inner[0]?.int ?? 0),
        rsaxfAmount_FT: BigInt(inner[1]?.int ?? 0),
        rsaxfCommission_FT: BigInt(inner[2]?.int ?? 0),
        rsaxfOracle_Data: inner[3], // keep as-is, or recursively parse if needed
        rsaxfOracle_Signature: inner[4]?.bytes ?? '',
    };
}

export function parseDelegationRedeemerDeposit(fields: any[]): DelegationValidatorRedeemerDeposit {
    // fields[0] is the PlutusData constructor for Deposit
    // fields[0].fields contains the real values in order
    const inner = fields[0]?.fields;
    if (!inner || !Array.isArray(inner) || inner.length < 1) {
        throw new Error('[parseDelegationRedeemerDeposit] Invalid nested fields structure');
    }
    return {
        rdDelegated_TokenGov_Change: BigInt(inner[0]?.int ?? 0),
    };
}

// --- Fetch and Parse Datums Helpers ---

/**
 * Fetches and parses a SwapOfferDatum from a Blockfrost output.
 * Handles inline datum, datum by hash, error handling, and field extraction.
 * Returns the parsed SwapOfferDatum or null if not found/parseable.
 */
/**
 * Fetches and parses a SwapOfferDatum from a Blockfrost output.
 * Handles inline datum, datum by hash, error handling, and field extraction.
 * Returns the parsed SwapOfferDatum or null if not found/parseable.
 *
 * @param output - The transaction output containing the datum (already filtered by address)
 * @param txHash - The transaction hash (for logging)
 */
export async function fetchAndParseSwapOfferDatum(output: any, txHash: string): Promise<SwapOfferDatum | null> {
    let datum: any = null;
    if (output.inline_datum) {
        try {
            datum = Data.from(output.inline_datum);
            console.log(`[DATUM][Swap Offer][✓] Inline datum parsed for tx ${txHash}`);
        } catch (e) {
            console.warn(`[DATUM][Swap Offer][✗] Inline datum parse error for tx ${txHash} → ${e}`);
            return null;
        }
    } else if (output.data_hash) {
        try {
            const fetched = await axios.get(`${BASE_URL}/scripts/datum/${output.data_hash}`, { headers: { project_id: BLOCKFROST_API_KEY } });
            datum = fetched.data.json_value;
            console.log(`[DATUM][Swap Offer][✓] Datum fetched by hash for tx ${txHash}`);
        } catch (e) {
            console.warn(`[DATUM][Swap Offer][✗] Failed to fetch datum for tx ${txHash} → ${e}`);
            return null;
        }
    } else {
        console.warn(`[DATUM][Swap Offer][✗] No datum found for output in tx ${txHash}`);
        return null;
    }
    // Defensive extraction of datum fields
    let fields;
    if (datum && datum.fields) {
        if (datum.fields[0] && datum.fields[0].fields) {
            fields = datum.fields[0].fields;
        } else {
            fields = datum.fields;
        }
    } else {
        console.warn(`[DATUM][Swap Offer][✗] Unexpected datum format for tx ${txHash}`);
        return null;
    }
    if (!Array.isArray(fields) || fields.length < 16) {
        console.warn(`[DATUM][Swap Offer][✗] Datum fields array length mismatch for tx ${txHash}`);
        return null;
    }
    try {
        const swapOfferDatum = parseSwapOfferDatum(fields);
        console.log(`[DATUM][Swap Offer][✓] Parsed SwapOfferDatum for tx ${txHash}:`, toJson(swapOfferDatum));
        return swapOfferDatum;
    } catch (e) {
        console.warn(`[DATUM][Swap Offer][✗] Error parsing fields for tx ${txHash} → ${e}`);
        return null;
    }
}

/**
 * Fetches and parses a DelegationDatum from a Blockfrost output.
 * Handles inline datum, datum by hash, error handling, and field extraction.
 * Returns the parsed DelegationDatum or null if not found/parseable.
 *
 * @param output - The transaction output containing the datum (already filtered by address)
 * @param txHash - The transaction hash (for logging)
 */
export async function fetchAndParseDelegationDatum(output: any, txHash: string): Promise<DelegationDatum | null> {
    let datum: any = null;
    if (output.inline_datum) {
        try {
            datum = Data.from(output.inline_datum);
            console.log(`[DATUM][Delegation][✓] Inline datum parsed for tx ${txHash}`);
        } catch (e) {
            console.warn(`[DATUM][Delegation][✗] Inline datum parse error for tx ${txHash} → ${e}`);
            return null;
        }
    } else if (output.data_hash) {
        try {
            const fetched = await axios.get(`${BASE_URL}/scripts/datum/${output.data_hash}`, { headers: { project_id: BLOCKFROST_API_KEY } });
            datum = fetched.data.json_value;
            console.log(`[DATUM][Delegation][✓] Datum fetched by hash for tx ${txHash}`);
        } catch (e) {
            console.warn(`[DATUM][Delegation][✗] Failed to fetch datum for tx ${txHash} → ${e}`);
            return null;
        }
    } else {
        console.warn(`[DATUM][Delegation][✗] No datum found for tx ${txHash}`);
        return null;
    }
    // Defensive extraction of datum fields
    let fields;
    if (datum && datum.fields) {
        if (datum.fields[0] && datum.fields[0].fields) {
            fields = datum.fields[0].fields;
        } else {
            fields = datum.fields;
        }
    } else {
        console.warn(`[DATUM][Delegation][✗] Unexpected datum format for tx ${txHash}`);
        return null;
    }
    if (!Array.isArray(fields) || fields.length < 8) {
        console.warn(`[DATUM][Delegation][✗] Datum fields array length mismatch for tx ${txHash}`);
        return null;
    }
    try {
        const delegationDatum = parseDelegationDatum(fields);
        console.log(`[DATUM][Delegation][✓] Parsed DelegationDatum for tx ${txHash}:`, toJson(delegationDatum));
        return delegationDatum;
    } catch (e) {
        console.warn(`[DATUM][Delegation][✗] Error parsing fields for tx ${txHash} → ${e}`);
        return null;
    }
}

// --- Fetch and Parse Redeemers Helpers ---

/**
 * Fetches and parses a SwapOfferValidatorRedeemerDeposit redeemer from Blockfrost.
 * Handles Blockfrost API, error handling, and returns the PlutusData JSON structure.
 * Returns the parsed PlutusData or null if not found/parseable.
 *
 * @param redeemerDataHash - The redeemer data hash (hex)
 * @param txHash - The transaction hash (for logging)
 */
export async function fetchAndParseSwapOfferRedeemerDeposit(redeemerDataHash: string, txHash: string): Promise<SwapOfferValidatorRedeemerDeposit | null> {
    try {
        const url = `${BASE_URL}/scripts/datum/${redeemerDataHash}`;
        const res = await axios.get(url, { headers: { project_id: BLOCKFROST_API_KEY } });
        if (res.data && res.data.json_value) {
            const plutusData = res.data.json_value;
            if (plutusData.constructor !== 1) {
                console.warn(`[REDEEMER][SWAP][Deposit][SKIP] Wrong constructor (${plutusData.constructor}) for tx ${txHash}`);
                return null;
            }
            const fields = plutusData.fields;
            const named = parseSwapOfferRedeemerDeposit(fields);
            console.log(`[REDEEMER][SWAP][Deposit][✓] Parsed for tx ${txHash}:`, toJson(named));
            return named;
        } else {
            console.warn(`[REDEEMER][SWAP][Deposit][✗] No json_value in Blockfrost response for tx ${txHash}`);
            return null;
        }
    } catch (e) {
        console.warn(`[REDEEMER][SWAP][Deposit][✗] Failed to fetch redeemer for tx ${txHash} → ${e}`);
        return null;
    }
}

/**
 * Fetches and parses a SwapOfferValidatorRedeemerSwapADAxFT redeemer from Blockfrost.
 * Handles Blockfrost API, error handling, and returns the PlutusData JSON structure.
 * Returns the parsed PlutusData or null if not found/parseable.
 *
 * @param redeemerDataHash - The redeemer data hash (hex)
 * @param txHash - The transaction hash (for logging)
 */
/**
 * Fetches and parses a SwapOfferValidatorRedeemerSwapADAxFT redeemer from Blockfrost.
 * Checks constructor === 7 and parses fields to named object. Returns null if not valid.
 */
export async function fetchAndParseSwapOfferRedeemerSwapADAxFT(redeemerDataHash: string, txHash: string): Promise<SwapOfferValidatorRedeemerSwapADAxFT | null> {
    try {
        const url = `${BASE_URL}/scripts/datum/${redeemerDataHash}`;
        const res = await axios.get(url, { headers: { project_id: BLOCKFROST_API_KEY } });
        if (res.data && res.data.json_value) {
            const plutusData = res.data.json_value;
            if (plutusData.constructor !== 7) {
                console.warn(`[REDEEMER][SWAP][SwapADAxFT][SKIP] Wrong constructor (${plutusData.constructor}) for tx ${txHash}`);
                return null;
            }
            const fields = plutusData.fields;
            const named = parseSwapOfferRedeemerSwapADAxFT(fields);
            console.log(`[REDEEMER][SWAP][SwapADAxFT][✓] Parsed for tx ${txHash}:`, toJson(named));
            return named;
        } else {
            console.warn(`[REDEEMER][SWAP][SwapADAxFT][✗] No json_value in Blockfrost response for tx ${txHash}`);
            return null;
        }
    } catch (e) {
        console.warn(`[REDEEMER][SWAP][SwapADAxFT][✗] Failed to fetch redeemer for tx ${txHash} → ${e}`);
        return null;
    }
}

/**
 * Fetches and parses a DelegationValidatorRedeemerDeposit redeemer from Blockfrost.
 * Handles Blockfrost API, error handling, and returns the PlutusData JSON structure.
 * Returns the parsed PlutusData or null if not found/parseable.
 *
 * @param redeemerDataHash - The redeemer data hash (hex)
 * @param txHash - The transaction hash (for logging)
 */
export async function fetchAndParseDelegationRedeemerDeposit(redeemerDataHash: string, txHash: string): Promise<DelegationValidatorRedeemerDeposit | null> {
    try {
        const url = `${BASE_URL}/scripts/datum/${redeemerDataHash}`;
        const res = await axios.get(url, { headers: { project_id: BLOCKFROST_API_KEY } });
        if (res.data && res.data.json_value) {
            const plutusData = res.data.json_value;
            if (plutusData.constructor !== 1) {
                console.warn(`[REDEEMER][Delegation][Deposit][SKIP] Wrong constructor (${plutusData.constructor}) for tx ${txHash}`);
                return null;
            }
            const fields = plutusData.fields;
            const named = parseDelegationRedeemerDeposit(fields);
            console.log(`[REDEEMER][Delegation][Deposit][✓] Parsed for tx ${txHash}:`, toJson(named));
            return named;
        } else {
            console.warn(`[REDEEMER][Delegation][Deposit][✗] No json_value in Blockfrost response for tx ${txHash}`);
            return null;
        }
    } catch (e) {
        console.warn(`[REDEEMER][Delegation][Deposit][✗] Failed to fetch redeemer for tx ${txHash} → ${e}`);
        return null;
    }
}
