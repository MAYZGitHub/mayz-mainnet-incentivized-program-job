import axios from 'axios';
import {
    BASE_URL,
    BLOCKFROST_API_KEY,
    DELEGATION_CREATE,
    DELEGATION_DEPOSIT,
    TASK_MAX_POINTS,
    REGISTRATION_MIN_GMAYZ,
    SWAPOFFER_CREATE,
    SWAPOFFER_DEPOSIT,
    SWAPOFFER_MIN_ADA,
    SWAPOFFER_SWAP_ADA_FT,
} from './constants.js';
import {
    fetchAndParseDelegationDatum,
    fetchAndParseDelegationRedeemerDeposit,
    fetchAndParseSwapOfferDatum,
    fetchAndParseSwapOfferRedeemerDeposit,
    fetchAndParseSwapOfferRedeemerSwapADAxFT,
} from './datumsAndRedeemers.js';
import { IDelegation } from './models/delegation.model.js';
import { IFund } from './models/fund.model.js';
import { ISwapOffer } from './models/swap-offer.model.js';
import { ITransaction } from './models/transaction.model.js';
import { getTokenPriceInLovelace } from './tokenPrices.js';
import { scriptHashFromAddress, toJson } from './utils.js';

async function checkInputFromWallet(data: any, walletAddress: string): Promise<boolean> {
    // Fetch UTXOs for input address check
    const inputs = data.inputs || [];
    const hasInputFromWallet = inputs.some((input: any) => input.address === walletAddress);
    if (!hasInputFromWallet) {
        return false;
    }

    return hasInputFromWallet;
}

// Modular per-task functions
export async function task01_calculateRegistration(
    paymentPKH: string,
    walletAddress: string,
    gMAYZHeld: number,
    swapOfferValidatorAddress: string,
    task1Txs: ITransaction[]
): Promise<{ amount: number; currentAmount: number; isValid: boolean; points: number }> {
    // Validate registration using txs from Mongo, not utxos by address
    let totalGMAYZ = 0;
    for (const tx of task1Txs) {
        try {
            if (!tx.hash) {
                throw new Error(`Invalid tx hash for ${paymentPKH}`);
            }
            console.log(`\n[TASK1] Analyzing tx: ${tx.hash}`);

            const utxosUrl = `${BASE_URL}/txs/${tx.hash}/utxos`;
            const utxosRes = await axios.get(utxosUrl, { headers: { project_id: BLOCKFROST_API_KEY } });

            if (!(await checkInputFromWallet(utxosRes.data, walletAddress))) {
                throw new Error(`No input from walletAddress (${walletAddress}) for tx ${tx.hash}`);
            }

            if (tx.type === SWAPOFFER_SWAP_ADA_FT) {
                // Fetch redeemers from Blockfrost
                const redeemersUrl = `${BASE_URL}/txs/${tx.hash}/redeemers`;
                const redeemersRes = await axios.get(redeemersUrl, { headers: { project_id: BLOCKFROST_API_KEY } });
                const redeemers = redeemersRes.data || [];
                const swapOfferValidatorHash = scriptHashFromAddress(swapOfferValidatorAddress);
                let foundValidRedeemer = false;
                for (const redeemer of redeemers) {
                    if (redeemer.purpose !== 'spend' || redeemer.script_hash !== swapOfferValidatorHash || !redeemer.redeemer_data_hash) {
                        continue;
                    }
                    const redeemerObj = await fetchAndParseSwapOfferRedeemerSwapADAxFT(redeemer.redeemer_data_hash, tx.hash);
                    if (!redeemerObj || typeof redeemerObj.rsaxfAmount_FT !== 'bigint' || typeof redeemerObj.rsaxfCommission_FT !== 'bigint') {
                        continue;
                    }
                    foundValidRedeemer = true;
                    totalGMAYZ += Number(redeemerObj.rsaxfAmount_FT - redeemerObj.rsaxfCommission_FT) / 1_000_000;
                    console.log(
                        `[TASK1] Added ${redeemerObj.rsaxfAmount_FT - redeemerObj.rsaxfCommission_FT} FT from tx ${tx.hash} (wallet: ${walletAddress}) [Total: ${totalGMAYZ}]`
                    );
                    break;
                }
                if (!foundValidRedeemer) {
                    throw new Error(`No valid SwapOffer ADAxFT redeemer found in tx ${tx.hash}`);
                }
            } else {
                throw new Error(`No valid SwapOffer ADAxFT tx found for ${paymentPKH}`);
            }
        } catch (e: any) {
            console.error(`[TASK1][ERROR] Error processing tx ${tx.hash}: ${e.message}`);
        }
    }
    console.log(`\n[TASK1] Calculating points for ${paymentPKH}`);
    const amount = totalGMAYZ;
    const currentAmount = gMAYZHeld;
    const minRequired = REGISTRATION_MIN_GMAYZ;
    const minAmount = Math.min(amount, currentAmount);
    const points = 0;
    if (minAmount < minRequired) {
        console.warn(`[TASK1][✗] Not enough gMAYZ for ${paymentPKH} (gMAYZ: ${minAmount})`);
        return { isValid: false, amount, currentAmount, points };
    } else {
        console.log(`[TASK1][✓] Valid for ${paymentPKH} (gMAYZ: ${minAmount})`);
        return { isValid: true, amount, currentAmount, points };
    }
}

// --- Task 2: Swap Offers Points Calculation ---
/**
 * Calculates Task 2 swap offer points for a user, following incentivized program rules.
 * @param paymentPKH The user's payment public key hash
 * @param task2Txs All transactions for the user
 * @param swapOffers All swap offers in the system
 * @param swapOfferValidatorAddress The swap offer validator address
 * @param funds All funds in the system
 * @returns { amount, currentAmount, isValid, points }
 */
export async function task02_calculateSwapOffers(
    paymentPKH: string,
    walletAddress: string,
    swapOfferValidatorAddress: string,
    funds: IFund[],
    swapOffers: ISwapOffer[],
    task2Txs: ITransaction[]
): Promise<{ amount: number; currentAmount: number; isValid: boolean; points: number }> {
    // --- 1. Calculate 'amount': sum of SWAPOFFER_CREATE and SWAPOFFER_DEPOSIT TXs (FT as ADA + ADA) ---
    let totalFTByUnit: Record<string, number> = {};
    let totalADA = 0;

    for (const tx of task2Txs) {
        try {
            if (!tx.hash) {
                throw new Error(`Invalid tx hash for ${paymentPKH}`);
            }
            console.log(`\n[TASK2] Analyzing tx: ${tx.hash}`);

            const utxosUrl = `${BASE_URL}/txs/${tx.hash}/utxos`;
            const utxosRes = await axios.get(utxosUrl, { headers: { project_id: BLOCKFROST_API_KEY } });

            if (!(await checkInputFromWallet(utxosRes.data, walletAddress))) {
                throw new Error(`No input from walletAddress (${walletAddress}) for tx ${tx.hash}`);
            }

            if (tx.type === SWAPOFFER_CREATE) {
                // Fetch UTXOs for the tx
                const outputs = utxosRes.data.outputs || [];
                let foundValidDatum = false;
                for (const output of outputs) {
                    if (output.address !== swapOfferValidatorAddress) {
                        continue;
                    }
                    const swapOfferDatum = await fetchAndParseSwapOfferDatum(output, tx.hash);
                    if (!swapOfferDatum) {
                        continue;
                    }
                    const policy = String(swapOfferDatum.sodFundPolicy_CS);
                    // Find Fund for policy to get token name hex
                    const fund = funds.find((f) => f.fdFundPolicy_CS === policy);
                    if (!fund || !fund.fdFundFT_TN_Hex) {
                        continue;
                    }
                    foundValidDatum = true;
                    const ftUnit = policy + fund.fdFundFT_TN_Hex;
                    // FT from datum
                    const ftAmount =
                        typeof swapOfferDatum.sodAmount_FT_Available === 'bigint'
                            ? Number(swapOfferDatum.sodAmount_FT_Available)
                            : parseInt(swapOfferDatum.sodAmount_FT_Available || '0', 10);
                    if (!totalFTByUnit[ftUnit]) totalFTByUnit[ftUnit] = 0;
                    totalFTByUnit[ftUnit] += ftAmount;
                    // ADA from datum
                    const adaAmount =
                        typeof swapOfferDatum.sodAmount_ADA_Available === 'bigint'
                            ? Number(swapOfferDatum.sodAmount_ADA_Available)
                            : parseInt(swapOfferDatum.sodAmount_ADA_Available || '0', 10);
                    totalADA += adaAmount;
                    break;
                }
                if (!foundValidDatum) {
                    throw new Error(`No valid SwapOffer datum found for tx ${tx.hash}`);
                }
            } else if (tx.type === SWAPOFFER_DEPOSIT) {
                // Parse redeemers for deposit
                const redeemersUrl = `${BASE_URL}/txs/${tx.hash}/redeemers`;
                const redeemersRes = await axios.get(redeemersUrl, { headers: { project_id: BLOCKFROST_API_KEY } });
                const redeemers = redeemersRes.data || [];
                const swapOfferValidatorHash = scriptHashFromAddress(swapOfferValidatorAddress);
                let foundValidRedeemer = false;
                for (const redeemer of redeemers) {
                    if (redeemer.purpose !== 'spend' || redeemer.script_hash !== swapOfferValidatorHash || !redeemer.redeemer_data_hash) {
                        continue;
                    }
                    const redeemerObj = await fetchAndParseSwapOfferRedeemerDeposit(redeemer.redeemer_data_hash, tx.hash);
                    if (!redeemerObj || typeof redeemerObj.rdNewDeposit_FT !== 'bigint' || typeof redeemerObj.rdNewDeposit_ADA !== 'bigint') {
                        continue;
                    }
                    foundValidRedeemer = true;
                    // Try to extract the FT unit from the datum of the output at the swapOfferValidatorAddress in this tx
                    const outputs = utxosRes.data.outputs || [];
                    let foundValidDatum = false;
                    let ftUnit: string | null = null;
                    for (const output of outputs) {
                        if (output.address !== swapOfferValidatorAddress) continue;
                        const swapOfferDatum = await fetchAndParseSwapOfferDatum(output, tx.hash);
                        if (!swapOfferDatum) {
                            continue;
                        }
                        const policy = String(swapOfferDatum.sodFundPolicy_CS);
                        const fund = funds.find((f) => f.fdFundPolicy_CS === policy);
                        if (fund && fund.fdFundFT_TN_Hex) {
                            ftUnit = policy + fund.fdFundFT_TN_Hex;
                            foundValidDatum = true;
                            break;
                        }
                    }
                    if (!foundValidDatum) {
                        throw new Error(`No valid SwapOffer datum found for tx ${tx.hash}`);
                    }
                    if (!totalFTByUnit[ftUnit!]) totalFTByUnit[ftUnit!] = 0;
                    totalFTByUnit[ftUnit!] += Number(redeemerObj.rdNewDeposit_FT);
                    // ADA from redeemer
                    totalADA += Number(redeemerObj.rdNewDeposit_ADA);
                    break;
                }
                if (!foundValidRedeemer) {
                    throw new Error(`No valid SwapOffer DEPOSIT redeemer found in tx ${tx.hash}`);
                }
            } else {
                throw new Error(`No valid SwapOffer CREATE or DEPOSIT tx found for ${paymentPKH}`);
            }
        } catch (e: any) {
            console.error(`[TASK2][ERROR] Error processing tx ${tx.hash}: ${e.message}`);
        }
    }
    console.log(`\n[TASK2] Calculating points for ${paymentPKH}`);
    // Convert FT to ADA using getTokenPriceInLovelace
    let amountFTasADA = 0;
    for (const unit of Object.keys(totalFTByUnit)) {
        const priceLovelace = Number(await getTokenPriceInLovelace(unit));
        amountFTasADA += (totalFTByUnit[unit] * priceLovelace) / 1_000_000 / 1_000_000;
        console.log(`[TASK2] Added ${totalFTByUnit[unit]} ${unit} at ${priceLovelace} lovelace = ${amountFTasADA} ADA`);
    }
    // ADA is already in lovelace, convert to ADA
    const amountADA = totalADA / 1_000_000;
    console.log(`[TASK2] Added ${totalADA} lovelace ADA = ${amountADA} ADA`);
    const amount = amountFTasADA + amountADA;
    console.log(`[TASK2] Amount: ${amount} ADA`);

    // --- 2. Calculate 'current amount': sum of all active swap offers for user (FT as ADA + ADA) ---
    // TODO filter active, allowing sell and that
    const userActiveOffers = swapOffers.filter((offer) => offer.sodSellerPaymentPKH === paymentPKH);

    let currentAmount = 0;
    for (const offer of userActiveOffers) {
        try {
            if (offer.sodAmount_FT_Available && offer.sodFundPolicy_CS && offer.sodAmount_ADA_Available) {
                const fund = funds.find((f) => f.fdFundPolicy_CS === offer.sodFundPolicy_CS);
                if (!fund || !fund.fdFundFT_TN_Hex) {
                    throw new Error(`No valid user SwapOffer: ${toJson(offer)}`);
                }
                const ftUnit = offer.sodFundPolicy_CS + fund.fdFundFT_TN_Hex;
                const priceLovelace = Number(await getTokenPriceInLovelace(ftUnit));
                const ftAda = (Number(offer.sodAmount_FT_Available) * priceLovelace) / 1_000_000 / 1_000_000;
                console.log(`[TASK2] Current: Added ${offer.sodAmount_FT_Available} ${ftUnit} at ${priceLovelace} lovelace = ${ftAda} ADA`);
                currentAmount += ftAda;
                console.log(`[TASK2] Current: Added ${offer.sodAmount_ADA_Available} lovelace ADA = ${Number(offer.sodAmount_ADA_Available) / 1_000_000} ADA`);
                currentAmount += Number(offer.sodAmount_ADA_Available) / 1_000_000;
            } else {
                throw new Error(`No valid user SwapOffer: ${toJson(offer)}`);
            }
        } catch (e: any) {
            console.error(`[TASK2][ERROR] Error processing SwapOffer: ${e.message}`);
        }
    }
    console.log(`[TASK2] Current Amount: ${currentAmount} ADA`);

    // --- 3. Points calculation with minimum threshold ---
    const minRequired = SWAPOFFER_MIN_ADA;
    const minAmount = Math.min(amount, currentAmount);
    if (minAmount < minRequired) {
        console.warn(`[TASK2][✗] Not enough ADA for ${paymentPKH} (ADA: ${minAmount})`);
        return {
            isValid: false,
            amount,
            currentAmount,
            points: 0,
        };
    } else {
        let swapOfferPoints = Math.min(minAmount * 2, TASK_MAX_POINTS);
        console.log(`[TASK2][✓] Valid for ${paymentPKH} (ADA: ${minAmount}, Points: ${swapOfferPoints})`);
        return {
            isValid: true,
            amount,
            currentAmount,
            points: swapOfferPoints,
        };
    }
}

export async function task03_calculateHoldFTPoints(
    paymentPKH: string,
    walletAddress: string,
    walletAmounts: Record<string, bigint>,
    swapOfferValidatorAddress: string,
    funds: IFund[],
    task3Txs: ITransaction[]
): Promise<{ amount: number; currentAmount: number; isValid: boolean; points: number }> {
    // Map: token unit (policy+hex) -> total bought
    const totalBoughtByUnit: Record<string, number> = {};
    for (const tx of task3Txs) {
        try {
            if (!tx.hash) {
                throw new Error(`Invalid tx hash for ${paymentPKH}`);
            }
            console.log(`\n[TASK3] Analyzing tx: ${tx.hash}`);

            const utxosUrl = `${BASE_URL}/txs/${tx.hash}/utxos`;
            const utxosRes = await axios.get(utxosUrl, { headers: { project_id: BLOCKFROST_API_KEY } });

            if (!(await checkInputFromWallet(utxosRes.data, walletAddress))) {
                throw new Error(`No input from walletAddress (${walletAddress}) for tx ${tx.hash}`);
            }

            if (tx.type === SWAPOFFER_SWAP_ADA_FT) {
                const outputs = utxosRes.data.outputs || [];
                let foundValidDatum = false;
                let ftUnit: string | null = null;
                for (const output of outputs) {
                    if (output.address !== swapOfferValidatorAddress) {
                        continue;
                    }
                    const swapOfferDatum = await fetchAndParseSwapOfferDatum(output, tx.hash);
                    if (!swapOfferDatum) {
                        continue;
                    }
                    const policy = String(swapOfferDatum.sodFundPolicy_CS);
                    // Find Fund for policy to get token name hex
                    const fund = funds.find((f) => f.fdFundPolicy_CS === policy);
                    if (!fund || !fund.fdFundFT_TN_Hex) {
                        continue;
                    }
                    foundValidDatum = true;
                    ftUnit = policy + fund.fdFundFT_TN_Hex;
                    break;
                }
                if (!foundValidDatum || !ftUnit) {
                    throw new Error(`No valid SwapOffer datum found for tx ${tx.hash}`);
                }

                // Fetch redeemers from Blockfrost
                const redeemersUrl = `${BASE_URL}/txs/${tx.hash}/redeemers`;
                const redeemersRes = await axios.get(redeemersUrl, { headers: { project_id: BLOCKFROST_API_KEY } });
                const redeemers = redeemersRes.data || [];
                const swapOfferValidatorHash = scriptHashFromAddress(swapOfferValidatorAddress);
                let foundValidRedeemer = false;
                for (const redeemer of redeemers) {
                    if (redeemer.purpose !== 'spend' || redeemer.script_hash !== swapOfferValidatorHash || !redeemer.redeemer_data_hash) {
                        continue;
                    }
                    const redeemerObj = await fetchAndParseSwapOfferRedeemerSwapADAxFT(redeemer.redeemer_data_hash, tx.hash);
                    if (!redeemerObj || typeof redeemerObj.rsaxfAmount_FT !== 'bigint' || typeof redeemerObj.rsaxfCommission_FT !== 'bigint') {
                        continue;
                    }
                    foundValidRedeemer = true;
                    if (!totalBoughtByUnit[ftUnit]) totalBoughtByUnit[ftUnit] = 0;
                    totalBoughtByUnit[ftUnit] += Number(redeemerObj.rsaxfAmount_FT - redeemerObj.rsaxfCommission_FT);
                    break;
                }
                if (!foundValidRedeemer) {
                    throw new Error(`No valid SwapOffer ADAxFT redeemer found in tx ${tx.hash}`);
                }
            } else {
                throw new Error(`No valid SwapOffer ADAxFT tx found for ${paymentPKH}`);
            }
        } catch (e: any) {
            console.error(`[TASK3][ERROR] Error processing tx ${tx.hash}: ${e.message}`);
        }
    }
    console.log(`\n[TASK3] Calculating points for ${paymentPKH}`);
    // 2. For each FT token, calculate ADA values
    let amount = 0;
    let currentAmount = 0;
    for (const unit of Object.keys(totalBoughtByUnit)) {
        const priceLovelace = Number(await getTokenPriceInLovelace(unit));
        const totalBought = totalBoughtByUnit[unit];
        const currentBalance = Number(walletAmounts[unit] || 0);

        // ADA value of all bought
        const amountFTasADA = Number((totalBought * priceLovelace) / 1_000_000) / 1_000_000;
        // ADA value of currently held
        // const currentAmountFTasADA = Number(((totalBought < currentBalance ? totalBought : currentBalance) * priceLovelace) / 1_000_000) / 1_000_000;
        const currentAmountFTasADA = Number((currentBalance * priceLovelace) / 1_000_000) / 1_000_000;
        amount += amountFTasADA;
        console.log(`[TASK3] Added ${totalBought} ${unit} at ${priceLovelace} lovelace = ${amountFTasADA} ADA`);
        currentAmount += currentAmountFTasADA;
        console.log(`[TASK3] Current: Added ${currentBalance} ${unit} at ${priceLovelace} lovelace = ${currentAmountFTasADA} ADA`);
    }
    console.log(`[TASK3] Amount: ${amount} ADA`);
    console.log(`[TASK3] Current: ${currentAmount} ADA`);
    const minAmount = Math.min(amount, currentAmount);
    const points = Math.min(minAmount * 1, TASK_MAX_POINTS);
    console.log(`[TASK3][✓] Valid for ${paymentPKH} (ADA: ${minAmount}, Points: ${points})`);
    return { isValid: true, amount, currentAmount, points };
}

/**
 * Calculates Task 4 staking points for a user, following incentivized program rules.
 * @param paymentPKH The user's payment public key hash
 * @param task4Txs All transactions for the user
 * @param delegations All delegations in the system
 * @param delegationValidatorAddress The delegation validator address
 * @returns { amount, currentAmount, points }
 */
export async function task04_calculateStake(
    paymentPKH: string,
    walletAddress: string,
    delegations: IDelegation[],
    delegationValidatorAddress: string,
    task4Txs: ITransaction[]
): Promise<{ amount: number; currentAmount: number; isValid: boolean; points: number }> {
    let totalStaked = 0n;
    for (const tx of task4Txs) {
        try {
            if (!tx.hash) {
                throw new Error(`Invalid tx hash for ${paymentPKH}`);
            }
            console.log(`\n[TASK4] Analyzing tx: ${tx.hash}`);

            const utxosUrl = `${BASE_URL}/txs/${tx.hash}/utxos`;
            const utxosRes = await axios.get(utxosUrl, { headers: { project_id: BLOCKFROST_API_KEY } });

            if (!(await checkInputFromWallet(utxosRes.data, walletAddress))) {
                throw new Error(`No input from walletAddress (${walletAddress}) for tx ${tx.hash}`);
            }

            if (tx.type === DELEGATION_CREATE && tx.hash) {
                // Fetch UTXOs for the tx
                const outputs = utxosRes.data.outputs || [];
                let foundValidDatum = false;
                for (const output of outputs) {
                    if (output.address !== delegationValidatorAddress) {
                        continue;
                    }
                    const delegationDatum = await fetchAndParseDelegationDatum(output, tx.hash);
                    if (!delegationDatum || typeof delegationDatum.ddStaked !== 'bigint') {
                        continue;
                    }
                    totalStaked += delegationDatum.ddStaked;
                    console.log(`[TASK4] Added ${delegationDatum.ddStaked} gMAYZ from tx ${tx.hash} (wallet: ${paymentPKH}) [Total: ${totalStaked}]`);
                    foundValidDatum = true;
                    break;
                }
                if (!foundValidDatum) {
                    throw new Error(`No valid delegation datum found for tx ${tx.hash}`);
                }
            } else if (tx.type === DELEGATION_DEPOSIT && tx.hash) {
                // Parse redeemers for deposit
                const redeemersUrl = `${BASE_URL}/txs/${tx.hash}/redeemers`;
                const redeemersRes = await axios.get(redeemersUrl, { headers: { project_id: BLOCKFROST_API_KEY } });
                const redeemers = redeemersRes.data || [];
                const delegationValidatorHash = scriptHashFromAddress(delegationValidatorAddress);
                let foundValidRedeemer = false;
                for (const redeemer of redeemers) {
                    if (redeemer.purpose !== 'spend' || redeemer.script_hash !== delegationValidatorHash || !redeemer.redeemer_data_hash) {
                        continue;
                    }
                    const redeemerObj = await fetchAndParseDelegationRedeemerDeposit(redeemer.redeemer_data_hash, tx.hash);
                    if (!redeemerObj || typeof redeemerObj.rdDelegated_TokenGov_Change !== 'bigint') {
                        continue;
                    }
                    foundValidRedeemer = true;
                    if (redeemerObj.rdDelegated_TokenGov_Change <= 0n) {
                        break;
                    }
                    totalStaked += redeemerObj.rdDelegated_TokenGov_Change;
                    console.log(`[TASK4] Added ${redeemerObj.rdDelegated_TokenGov_Change} gMAYZ from tx ${tx.hash} (wallet: ${paymentPKH}) [Total: ${totalStaked}]`);
                    break;
                }
                if (!foundValidRedeemer) {
                    throw new Error(`No valid delegation DEPOSIT redeemer found in tx ${tx.hash}`);
                }
            } else {
                throw new Error(`No valid delegation CREATE or DEPOSIT tx found for ${paymentPKH}`);
            }
        } catch (e: any) {
            console.error(`[TASK4][ERROR] Error processing tx ${tx.hash}: ${e.message}`);
        }
    }

    console.log(`\n[TASK4] Calculating points for ${paymentPKH}`);
    // Convert to number of tokens (assuming 6 decimals, as in swap offers)
    const amount = Number(totalStaked) / 1_000_000;
    console.log(`[TASK4] Amount: ${amount} gMAYZ`);

    // --- Calculate 'current amount': sum of all delegations for user (from DB) ---
    // TODO filter active
    const userActiveDelegations = delegations.filter((d) => d.ddDelegatorPaymentPKH === paymentPKH);

    let currentAmount = 0;
    for (const delegation of userActiveDelegations) {
        try {
            if (typeof delegation.ddStaked === 'string') {
                currentAmount += Number(delegation.ddStaked) / 1_000_000;
            } else {
                throw new Error(`No valid user delegation found for ${paymentPKH}`);
            }
        } catch (e: any) {
            console.error(`[TASK4][ERROR] Error processing delegation: ${e.message}`);
        }
    }
    console.log(`[TASK4] Current Amount: ${currentAmount} gMAYZ`);
    const minAmount = Math.min(amount, currentAmount);
    const points = Math.min(minAmount * 2, TASK_MAX_POINTS);
    console.log(`[TASK4][✓] Valid for ${paymentPKH} (gMAYZ: ${minAmount}, Points: ${points})`);
    return { isValid: true, amount, currentAmount, points };
}

// Helper: Fetch gMAYZ held by a wallet
export async function getGMAYZHeld(address: string, gmayzPolicy: string): Promise<number> {
    // TODO: If asset name is dynamic, get from fund model, else set hex manually
    const gmayzAssetHex = '674d41595a'; // 'GMAYZ' in hex, adjust if needed
    const gmayzUnit = `${gmayzPolicy}${gmayzAssetHex}`;
    try {
        const url = `${BASE_URL}/addresses/${address}`;
        console.log(`[GMAYZ][Blockfrost] GET ${url}`);
        const res = await axios.get(url, { headers: { project_id: BLOCKFROST_API_KEY } });
        const amounts = res.data.amount || [];
        const gmayz = amounts.find((a: any) => a.unit === gmayzUnit);
        const qty = gmayz ? Number(gmayz.quantity) : 0;
        return Number.isFinite(qty) ? qty : 0;
    } catch (e: any) {
        console.warn(`[GMAYZ][WARN] Failed to fetch gMAYZ for ${address}: ${e.message}`);
        return 0;
    }
}
