// Mainnet Incentivized Program Job Script (TypeScript)
import axios from 'axios';
import { task01_calculateRegistration, task02_calculateSwapOffers, task03_calculateHoldFTPoints, task04_calculateStake } from './calculate-points.js';
import {
    BASE_URL,
    BLOCKFROST_API_KEY,
    DELEGATION_CREATE,
    DELEGATION_DEPOSIT,
    GMAYZ_FUND_POLICY_CS,
    GMAYZ_MAX_MULTIPLIER,
    MONGO_URLDB_DAPP,
    MONGO_URLDB_GOVERNANCE,
    SWAPOFFER_CREATE,
    SWAPOFFER_DEPOSIT,
    SWAPOFFER_SWAP_ADA_FT,
    TASK_MAX_POINTS,
} from './constants.js';
import { DelegationModel, IDelegation } from './models/delegation.model.js';
import { FundModel, IFund } from './models/fund.model.js';
import { ProtocolModel } from './models/protocol.model.js';
import { ISwapOffer, SwapOfferModel } from './models/swap-offer.model.js';
import { ITransaction, TransactionModel } from './models/transaction.model.js';
import { WalletModel } from './models/wallet.model.js';
import { connectDb, disconnectDb, isSharedOnXTxHash, saveUserTaskPoints } from './utils.js';

// --- MAYZ Incentivized Program Cron Job ---
// This script aggregates, checks, and scores all users for the incentive program, as per the detailed requirements.
// All code and comments are in English, and only this file is changed.

// --- ENTRYPOINT ---
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});

// --- MAIN LOGIC ---
async function main() {

    const nowDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    console.log('--- MAYZ Incentivized Program Cron Job START ---');
    console.log(`[DATE] ${nowDate}`);

    // --- GOVERNANCE DB PHASE ---
    await connectDb(MONGO_URLDB_GOVERNANCE, 'Governance');
    console.log('[GOV DB] Connected to Governance DB');
    // Load Protocol and Fund Models for contract addresses and fund IDs (from Governance DB)
    const protocolInGov = await ProtocolModel.findOne();
    if (!protocolInGov) throw new Error('Protocol not found in Governance DB');
    const fundGMAYZ: IFund | null = await FundModel.findOne({ fdFundPolicy_CS: GMAYZ_FUND_POLICY_CS });
    if (!fundGMAYZ || !fundGMAYZ.fdFundPolicy_CS) throw new Error('GMAYZ Fund not found or policy CS missing in Governance DB');
    let userWalletInfo: Record<string, { address: string; stake: string }> = {};
    // Only process wallets that have at least one tx of a relevant type (using real constants)
    const relevantTypesInGov = [SWAPOFFER_SWAP_ADA_FT];
    // Aggregate unique users from governance transactions with relevant types
    const govUsers: string[] = await TransactionModel.distinct('paymentPKH', {
        type: { $in: relevantTypesInGov },
        status: 'confirmed',
        date: { $gte: new Date('2024-01-01') },
    });
    console.log(`[GOV DB] Found ${govUsers.length} unique wallets with relevant tx types in Governance DB`);
    // Fetch all relevant governance transactions per user
    const govTxsByUser: Record<string, ITransaction[]> = {};
    let totalGovTxs = 0;
    for (const paymentPKH of govUsers) {
        const walletDoc = await WalletModel.findOne({ paymentPKH });
        if (walletDoc && walletDoc.mainnet_address && walletDoc.stakePKH) {
            userWalletInfo[paymentPKH] = {
                address: walletDoc.mainnet_address,
                stake: walletDoc.stakePKH,
            };
            console.log(`[GOV DB][WALLET] Wallet PKH: ${paymentPKH}`);
            console.log(`[GOV DB][WALLET] Wallet Stake: ${walletDoc.stakePKH}`);
            console.log(`[GOV DB][WALLET] Wallet Address: ${walletDoc.mainnet_address}`);
        } else {
            console.warn(`[GOV DB][WALLET][WARN] No wallet info for PKH: ${paymentPKH}`);
        }

        const txs = await TransactionModel.find({ paymentPKH, type: { $in: relevantTypesInGov }, status: 'confirmed', date: { $gte: new Date('2024-01-01') } }, null, {
            sort: { date: 1 },
        });
        govTxsByUser[paymentPKH] = txs;
        totalGovTxs += txs.length;
        console.log(`[GOV DB][WALLET] has ${txs.length} relevant txs`);
    }
    console.log(`[GOV DB] Total relevant txs in Governance DB: ${totalGovTxs}`);
    await disconnectDb('Governance');
    console.log('[GOV DB] Disconnected from Governance DB');

    // --- DAPP DB PHASE ---
    await connectDb(MONGO_URLDB_DAPP, 'Dapp');
    console.log('\n[DAPP DB] Connected to Dapp DB');

    const protocolInDapp = await ProtocolModel.findOne();
    if (!protocolInDapp) throw new Error('Protocol not found in Dapp DB');
    const funds: IFund[] = await FundModel.find();
    console.log(`[DAPP DB] Found ${funds.length} funds in Dapp DB`);
    // --- LOAD ALL SWAP OFFERS (for swap offers task) ---
    const allSwapOffers: ISwapOffer[] = await SwapOfferModel.find({});
    console.log(`[DAPP DB] Loaded ${allSwapOffers.length} swap offers from DB`);
    // --- LOAD ALL DELEGATIONS (for staking task) ---
    const allDelegations: IDelegation[] = await DelegationModel.find({});
    console.log(`[DAPP DB] Loaded ${allDelegations.length} delegations from DB`);
    // Only process wallets that have at least one tx of a relevant type (using real constants)
    const relevantTypesInDapp = [DELEGATION_CREATE, DELEGATION_DEPOSIT, SWAPOFFER_CREATE, SWAPOFFER_DEPOSIT, SWAPOFFER_SWAP_ADA_FT];
    // Aggregate unique users from dapp transactions with relevant types
    const dappUsers: string[] = await TransactionModel.distinct('paymentPKH', {
        type: { $in: relevantTypesInDapp },
        status: 'confirmed',
        date: { $gte: new Date('2024-01-01') },
    });
    console.log(`[DAPP DB] Found ${dappUsers.length} unique wallets with relevant tx types in Dapp DB`);
    // Fetch all relevant dapp transactions per user
    const dappTxsByUser: Record<string, ITransaction[]> = {};
    let totalDappTxs = 0;
    for (const paymentPKH of dappUsers) {
        const walletDoc = await WalletModel.findOne({ paymentPKH });
        if (walletDoc && walletDoc.mainnet_address && walletDoc.stakePKH) {
            userWalletInfo[paymentPKH] = {
                address: walletDoc.mainnet_address,
                stake: walletDoc.stakePKH,
            };
            console.log(`[DAPP DB][WALLET] Wallet PKH: ${paymentPKH}`);
            console.log(`[DAPP DB][WALLET] Wallet Stake: ${walletDoc.stakePKH}`);
            console.log(`[DAPP DB][WALLET] Wallet Address: ${walletDoc.mainnet_address}`);
        } else {
            console.warn(`[DAPP DB][WALLET][WARN] No wallet info for PKH: ${paymentPKH} - ${walletDoc}`);
        }
        const txs = await TransactionModel.find({ paymentPKH, type: { $in: relevantTypesInDapp }, status: 'confirmed', date: { $gte: new Date('2024-01-01') } }, null, {
            sort: { date: 1 },
        });
        dappTxsByUser[paymentPKH] = txs;
        totalDappTxs += txs.length;
        console.log(`[DAPP DB][WALLET] has ${txs.length} relevant txs`);
    }

    console.log(`[DAPP DB] Total relevant txs in Dapp DB: ${totalDappTxs}`);
    await disconnectDb('Dapp');
    console.log('[DAPP DB] Disconnected from Dapp DB');

    // --- USER AGGREGATION ---
    const allWallets = Array.from(new Set([...govUsers, ...dappUsers]));
    console.log(`\n[WALLETS] Total unique wallets to process: ${allWallets.length}`);

    // --- POINTS CALCULATION PHASE ---
    const userTaskPoints: Array<{
        date: string;
        paymentPKH: string;
        stakePKH: string;
        address: string;
        gMAYZHeld: number;
        multiplier: number;
        task: string;
        amount: number;
        currentAmount: number;
        points: number;
        isValid: boolean;
        finalPoints: number;
    }> = [];
    
    // Main per-user loop
    for (const paymentPKH of allWallets) {
        try {
            console.log(`\n[WALLET] Processing wallet: ${paymentPKH}`);

            const walletInfo = userWalletInfo[paymentPKH];

            // Fetch current wallet balances for all FT tokens
            let addressInfo;
            try {
                const url = `${BASE_URL}/addresses/${walletInfo.address}`;
                addressInfo = await axios.get(url, { headers: { project_id: BLOCKFROST_API_KEY } });
            } catch (e: any) {
                throw new Error(`Blockfrost error for Wallet balance: ${e.message}`);
            }
            const walletAmounts: Record<string, bigint> = {};
            for (const a of addressInfo.data.amount || []) {
                walletAmounts[a.unit] = BigInt(a.quantity);
            }

            // Fetch real gMAYZ held by the user
            let gMAYZHeld = 0;
            if (walletInfo && walletInfo.address) {
                // gMAYZHeld = await getGMAYZHeld(walletInfo.address, fundGMAYZ.fdFundPolicy_CS);
                const gmayzAssetHex = '674d41595a'; // 'GMAYZ' in hex, adjust if needed
                const gmayzUnit = `${fundGMAYZ.fdFundPolicy_CS}${gmayzAssetHex}`;
                if (!walletAmounts[gmayzUnit]) walletAmounts[gmayzUnit] = 0n;
                gMAYZHeld = Number(walletAmounts[gmayzUnit]) / 1_000_000;
                console.log(`[WALLET] gMAYZ held for ${paymentPKH}: ${gMAYZHeld}`);
            } else {
                console.warn(`[WALLET][WARN] No address for PKH: ${paymentPKH}, gMAYZ held not calculated`);
            }

            let multiplier = 1;
            if (gMAYZHeld > 0) {
                // --- MULTIPLIER ---
                multiplier = Math.max(Math.min(gMAYZHeld, GMAYZ_MAX_MULTIPLIER), 1);
                console.log(`[MULTIPLIER] Multiplier applied for ${paymentPKH}, gMAYZ held = ${gMAYZHeld}, multiplier = ${multiplier}`);
            }

            try {
                // --- REGISTRATION (Task 1) ---
                const task1Txs = (govTxsByUser[paymentPKH] || []).filter((tx) => tx.type === SWAPOFFER_SWAP_ADA_FT);
                console.log(`\n[TASK1] Found ${task1Txs.length} txs for ${paymentPKH}`);

                if (task1Txs.length > 0) {
                    const task1Result = await task01_calculateRegistration(paymentPKH, walletInfo.address, gMAYZHeld, protocolInGov.pdpSwapOfferValidator_AddressMainnet, task1Txs);
                    const finalPoints = task1Result.points * multiplier;

                    userTaskPoints.push({
                        date: nowDate,
                        paymentPKH: paymentPKH.slice(0, 6),
                        stakePKH: walletInfo.stake.slice(0, 6),
                        address: walletInfo.address.slice(0, 6) + '...' + walletInfo.address.slice(-6),
                        gMAYZHeld,
                        multiplier,
                        task: 'registration',
                        amount: task1Result.amount,
                        currentAmount: task1Result.currentAmount,
                        points: task1Result.points,
                        isValid: task1Result.isValid,
                        finalPoints,
                    });
                }
            } catch (e: any) {
                console.error(`[TASK1][ERROR] Error processing txs for ${paymentPKH}: ${e.message}`);
            }
            try {
                // --- SWAP OFFERS (Task 2) ---
                const task2Txs = (dappTxsByUser[paymentPKH] || []).filter((tx) => tx.type === SWAPOFFER_CREATE || tx.type === SWAPOFFER_DEPOSIT);
                console.log(`\n[TASK2] Found ${task2Txs.length} txs for ${paymentPKH}`);
                if (task2Txs.length > 0) {
                    const task2Result = await task02_calculateSwapOffers(
                        paymentPKH,
                        walletInfo.address,
                        protocolInDapp.pdpSwapOfferValidator_AddressMainnet,
                        funds,
                        allSwapOffers,
                        task2Txs
                    );
                    const finalPoints = task2Result.points * multiplier;
                    userTaskPoints.push({
                        date: nowDate,
                        paymentPKH: paymentPKH.slice(0, 6),
                        stakePKH: walletInfo.stake.slice(0, 6),
                        address: walletInfo.address.slice(0, 6) + '...' + walletInfo.address.slice(-6),
                        gMAYZHeld,
                        multiplier,
                        task: 'swap_offer',
                        amount: task2Result.amount,
                        currentAmount: task2Result.currentAmount,
                        points: task2Result.points,
                        isValid: task2Result.isValid,
                        finalPoints,
                    });
                }
            } catch (e: any) {
                console.error(`[TASK2][ERROR] Error processing txs for ${paymentPKH}: ${e.message}`);
            }
            try {
                // --- HOLD FUND TOKENS (Task 3) ---
                const task3Txs = (dappTxsByUser[paymentPKH] || []).filter((tx) => tx.type === SWAPOFFER_SWAP_ADA_FT);
                console.log(`\n[TASK3] Found ${task3Txs.length} txs for ${paymentPKH}`);
                if (task3Txs.length > 0) {
                    const task3Result = await task03_calculateHoldFTPoints(
                        paymentPKH,
                        walletInfo.address,
                        walletAmounts,
                        protocolInDapp.pdpSwapOfferValidator_AddressMainnet,
                        funds,
                        task3Txs
                    );
                    const finalPoints = task3Result.points * multiplier;
                    userTaskPoints.push({
                        date: nowDate,
                        paymentPKH: paymentPKH.slice(0, 6),
                        stakePKH: walletInfo.stake.slice(0, 6),
                        address: walletInfo.address.slice(0, 6) + '...' + walletInfo.address.slice(-6),
                        gMAYZHeld,
                        multiplier,
                        task: 'hold_ft',
                        amount: task3Result.amount,
                        currentAmount: task3Result.currentAmount,
                        points: task3Result.points,
                        isValid: task3Result.isValid,
                        finalPoints,
                    });
                }
            } catch (e: any) {
                console.error(`[TASK3][ERROR] Error processing txs for ${paymentPKH}: ${e.message}`);
            }
            try {
                // --- STAKE IN FUNDS (Task 4) ---
                const task4Txs = (dappTxsByUser[paymentPKH] || []).filter((tx) => tx.type === DELEGATION_CREATE || tx.type === DELEGATION_DEPOSIT);
                console.log(`\n[TASK4] Found ${task4Txs.length} txs for ${paymentPKH}`);
                if (task4Txs.length > 0) {
                    const task4Result = await task04_calculateStake(paymentPKH, walletInfo.address, allDelegations, protocolInDapp.pdpDelegationValidator_AddressMainnet, task4Txs);
                    const finalPoints = task4Result.points * multiplier;
                    userTaskPoints.push({
                        date: nowDate,
                        paymentPKH: paymentPKH.slice(0, 6),
                        stakePKH: walletInfo.stake.slice(0, 6),
                        address: walletInfo.address.slice(0, 6) + '...' + walletInfo.address.slice(-6),
                        gMAYZHeld,
                        multiplier,
                        task: 'stake_fund',
                        amount: task4Result.amount,
                        currentAmount: task4Result.currentAmount,
                        points: task4Result.points,
                        isValid: task4Result.isValid,
                        finalPoints,
                    });
                }
            } catch (e: any) {
                console.error(`[TASK4][ERROR] Error processing txs for ${paymentPKH}: ${e.message}`);
            }
            // // --- FEEDBACK (PLACEHOLDER) ---
            // console.log(`[STEP] Calculating feedback points for ${paymentPKH} (placeholder)`);
            // const feedbackPoints = calculateFeedbackPoints(userTotals[paymentPKH]);
            // console.log(`[RESULT] Feedback points for ${paymentPKH}: ${feedbackPoints}`);
            // userTaskPoints.push({ paymentPKH, task: 'feedback', points: feedbackPoints });
            // userTotals[paymentPKH] = (userTotals[paymentPKH] || 0) + feedbackPoints;
        } catch (err) {
            console.error(`[ERROR] Processing wallet ${paymentPKH}:`, err);
        }
    }

    // --- OUTPUT PHASE ---
    console.log('--- USER TASK POINTS LIST ---');
    console.table(userTaskPoints);

    // Save user task points to Supabase
    if (userTaskPoints.length > 0) {
        try {
            // await saveUserTaskPoints(userTaskPoints);
            console.log(`[SUPABASE] Successfully saved ${userTaskPoints.length} user task points.`);
        } catch (err) {
            console.error(`[SUPABASE] Error saving user task points:`, err);
        }
    }

    // Print summary: aggregate by paymentPKH with full details
    const allTasks = ['registration', 'swap_offer', 'hold_ft', 'stake_fund'];
    const userMap: Record<string, typeof userTaskPoints[0][]> = {};
    for (const entry of userTaskPoints) {
        if (!userMap[entry.paymentPKH]) userMap[entry.paymentPKH] = [];
        userMap[entry.paymentPKH].push(entry);
    }
    const userTotals = Object.entries(userMap).map(([paymentPKH, entries]) => {
        const first = entries[0];
        const points = entries.reduce((sum, e) => sum + (e.points || 0), 0);
        const finalPoints = entries.filter(e => e.isValid).reduce((sum, e) => sum + (e.finalPoints || 0), 0);
        const completed = entries.filter(e => e.isValid).map(e => e.task);
        // Incompleted: tasks with !isValid plus any missing tasks
        const presentTasks = new Set(entries.map(e => e.task));
        const incompleted = [
            ...entries.filter(e => !e.isValid).map(e => e.task),
            ...allTasks.filter(t => !presentTasks.has(t)),
        ];
        return {
            date: first.date,
            paymentPKH: first.paymentPKH,
            stakePKH: first.stakePKH,
            address: first.address,
            gMAYZHeld: first.gMAYZHeld,
            multiplier: first.multiplier,
            points,
            finalPoints,
            completed,
            incompleted,
        };
    });
    const summaryList = userTotals.sort((a, b) => b.finalPoints - a.finalPoints);
    const printableSummary = summaryList.map((entry) => ({
        ...entry,
        completed: entry.completed.join(', '),
        incompleted: entry.incompleted.join(', '),
    }));
    console.log('--- USER POINTS SUMMARY (total per wallet, descending) ---');
    console.table(printableSummary);

    console.log('--- MAYZ Incentivized Program Cron Job END ---');
}
