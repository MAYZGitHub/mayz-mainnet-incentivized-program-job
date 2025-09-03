# MAYZ Incentivized Program Cron Job – Logic & Backlog

## Overview
This automated process checks every participant’s activity to calculate and assign points for the MAYZ Mainnet Incentivized Program. It combines on-chain (blockchain) and off-chain (e.g., Twitter/X posts) data to ensure each user is rewarded strictly according to the real code logic.

For each user and each task, the system:
- Gathers all relevant transactions and actions.
- Checks if the actions meet the requirements (amounts, types, timing, etc.).
- Verifies if tokens are still held at the end (for holding tasks).
- Marks each task as **completed** or **incomplete** and calculates points accordingly.

This ensures that only users who meet all the conditions get points, and that the process is auditable and repeatable.

---

## 1. Data Sources & Prerequisites
To calculate points and validate actions, the system uses:
- **Governance Database:** Stores all $gMAYZ purchase transactions (for registration).
- **Dapp Database:** Stores all Fund Token (FT) and other dapp transactions.
- **Blockchain API (Blockfrost):** Used to verify that transactions are real, confirmed, and to get up-to-date wallet balances and token prices.
- **Program Models:** Lists of which contracts and tokens count for the campaign (so only the right tokens and addresses are checked).

Before awarding points, the system:
- Gathers all transactions for each user from the databases.
- Checks that each action meets the requirements (minimum amounts, correct type, confirmed status, etc.).
- For holding tasks, verifies that tokens are still in the user’s wallet at the end of the campaign.

---

## 2. Tasks & Point Calculation

### Task 1: Registration ($gMAYZ Purchase)
**Step-by-step logic:**
1. Search for all `Swap Offer - Buy FT` transactions with status `confirmed` in the Governance DB for the user, dated after the program start (e.g., `2025-08-15`).
2. For each transaction:
   - Check on-chain (via Blockfrost) that the transaction is real, confirmed.
   - Parse the datum and redeemer to determine the exact amount of $gMAYZ bought (net of commission/fee).
   - Verify that the transaction is for the official $gMAYZ fund (using the correct fund policy ID).
   - Calculate the **net amount received**: total $gMAYZ bought minus any FT fee paid.
3. Sum up the net $gMAYZ received across all valid transactions.
4. If the user has **not bought enough $gMAYZ** (total net < 100 $gMAYZ), the task is marked as **incomplete**.
5. Determine the user's $gMAYZ **Owned** at the snapshot: `Owned = Held in wallet + gMAYZ listed in active Governance swap offers (FT available) + gMAYZ staked in active Dapp delegations`.
6. The task is **completed** if both are true: (a) total net bought ≥ 100 and (b) $gMAYZ Owned ≥ 100 at the snapshot. Otherwise, it is **incomplete**.

### Task 2: Swap Offers (Detailed Calculation)

**Step-by-step logic:**
1. Search for all `Swap Offer - Create` and `Swap Offer - Deposit` transactions with status `confirmed` in the Dapp DB for the user, dated after the program start (e.g., `2025-08-15`).
2. For each relevant transaction:
   - Confirm the transaction is real, confirmed, and originated from the user's wallet (Blockfrost check).
   - Parse the datum to extract the offered amount of FT and ADA (if any) for that swap offer.
   - Identify the FT unit (policy+hex) and find the corresponding Fund for token details.
   - For FT, fetch the **historic price in ADA at the exact date of the transaction**. For ADA, use the amount directly (1:1).
   - Calculate the ADA equivalent for FT: `FT amount * FT price at tx date` (convert from lovelace to ADA).
   - Sum all ADA values from FT and ADA for all such transactions. This sum is the user's **Task 2 entry amount**.
3. **Threshold check:** If the total entry amount (sum above) is **less than 500 ADA**, the task is marked as **incomplete** and no points are awarded.
4. **Active offer check:**
   - Retrieve all currently active swap offers for the user (offers that remain open/active at the time of calculation).
   - For each active offer, sum the FT (converted to ADA using the **current FT price**) and ADA amounts.
   - If the sum of active offers is **zero** (i.e., the user has no active offers left), the task is marked as **incomplete** and no points are awarded.
   - The active amount is **not** required to meet the 500 ADA threshold; it only needs to be greater than zero.
5. **Points calculation:**
   - If both checks above are passed, points are awarded as: `Points = min(entry amount * 2, 4,000)` (i.e., 1 ADA = 2 points, capped at 4,000).

**Key details:**
- The 500 ADA threshold is checked **at the moment of each offer creation/deposit**, using the FT price at that time. This ensures users are not penalized by later price drops.
- The current value of active offers is only checked to ensure the user still has something active; it does **not** need to meet the 500 ADA threshold again.
- Both FT and ADA are counted; FT is always converted to ADA using the correct price (historic for entry, current for active check).
- If the user closes or cancels all offers before the end, they lose eligibility for this task.
- Only confirmed, valid transactions and offers for official funds are counted.

---

### Task 3: Hold Fund Tokens (FT) – Detailed Calculation

**Step-by-step logic:**
1. Search for all `Swap Offer - Buy FT` transactions with status `confirmed` in the Dapp DB for the user, dated after the program start (e.g., `2025-08-15`). Only transactions for official funds (excluding $gMAYZ fund) are considered.
2. For each transaction:
   - Confirm the transaction is real, confirmed, and originated from the user's wallet (Blockfrost check).
   - Parse the datum and redeemer to determine the **net FT amount bought** (subtracting any commission/fee).
   - Aggregate the total net amount bought for each FT (by token unit).
3. For each FT token:
   - Look up the user's **current wallet balance** for that FT (using Blockfrost at the time of calculation).
   - For each FT, record:
     - **Total bought** (sum of all net buys for that FT)
     - **Current held** (current wallet balance for that FT)
   - Fetch the **current ADA price** for each FT.
4. Calculate:
   - **ADA value of all FTs ever bought:** For each FT, `total bought * current ADA price`. Sum across all FTs.
   - **ADA value of FTs currently held:** For each FT, `current held * current ADA price`. Sum across all FTs.
   - The **minimum** of these two values is used for point calculation: `min(total bought ADA value, currently held ADA value)`.
5. **Points awarded:**
   - Points = `min(ADA value, 4,000)` (i.e., 1 ADA = 1 point, capped at 4,000).
   - The task is **completed** if the user holds a nonzero amount of any FT (ADA value > 0 at calculation time).
   - The task is **incomplete** if the user has bought FT but currently holds zero of all FTs, or never bought any FT.

**Key details:**
- All price conversions use the **current ADA price** for each FT, both for "total bought" and "currently held" calculations.
- If the user sells, moves, or loses all FTs before the snapshot, their "currently held" value drops to zero and the task is marked incomplete.
- Only confirmed, valid transactions and official funds are counted.
- The minimum of "total bought" and "currently held" (both in ADA) ensures users cannot game the system by buying a large amount and then selling before the snapshot.
- The cap of 4,000 points applies to the final result.

---

### Task 4: Stake $gMAYZ – Detailed Calculation

**Step-by-step logic:**
1. Search for all `Delegation - Create` and `Delegation - Deposit` transactions with status `confirmed` in the Dapp DB for the user, dated after the program start (e.g., `2025-08-15`).
2. For each transaction:
   - Confirm the transaction is real, confirmed, and originated from the user's wallet (Blockfrost check).
   - Parse the datum and redeemer to determine the exact amount of $gMAYZ staked (net of commission/fee, if applicable).
   - Aggregate the total net amount staked across all valid transactions (convert from lovelace to $gMAYZ units).
3. **Sum up the total $gMAYZ staked** by the user during the campaign (this is the "amount").
4. **Check current active delegations:**
   - Retrieve all delegations for the user from the DB (filtered by delegator payment public key hash).
   - For each delegation, sum the currently active staked $gMAYZ (convert from lovelace to $gMAYZ units).
   - The sum of all current active delegations is the "current amount".
5. **Completion check:**
   - If the user has staked $gMAYZ during the campaign but currently has **zero** $gMAYZ staked (i.e., all delegations withdrawn or moved), the task is marked as **incomplete** and no points are awarded.
   - If the user has never staked any $gMAYZ, the task is also **incomplete**.
   - The task is **completed** if the user has any active $gMAYZ staked at the time of calculation (current amount > 0).
6. **Points calculation:**
   - Points = `min(total staked $gMAYZ, current active $gMAYZ) * 2`, capped at 4,000 points.
   - This ensures users cannot game the system by staking a large amount and then withdrawing before the snapshot.

**Key details:**
- All amounts are converted from lovelace to $gMAYZ units (divide by 1,000,000).
- Only confirmed, valid transactions and delegations are counted.
- The "current amount" is determined from the DB at the time of calculation (snapshot).
- Both the total staked during the campaign and the currently active staked amount are used; the minimum of these two is used for points.
- The cap of 4,000 points applies to the final result.
- If the user unstakes all before the end, they lose eligibility for this task.

---

### Task 5: Give Feedback
- Complete Google feedback form (off-chain, tracked in DB).
- Adds 5% bonus to total points.

---

## 3. Points Multiplier
- Total score × amount of $gMAYZ **Owned** (up to 1,000 units).
- Owned = Held in wallet + in active Governance swap offers (FT available) + staked in active Dapp delegations.
- Ownership is snapshotted at campaign end.

---

## 4. Technical Steps (Daily Job)
1. Connect to MongoDBs.
2. Load Protocol and Fund Models for contract addresses and fund IDs.
3. Fetch and parse transactions for all users and tasks.
4. Cross-check registration with social share DB.
5. Fetch prices (ADA, FT, etc.) using Blockfrost.
6. Calculate points per user, per task, applying caps and bonus.
7. Apply multiplier for $gMAYZ holdings.
8. Store/export results for rewards.
9. Log and handle errors robustly.

---

For each user, the system tracks which tasks are completed or incomplete, and only completed tasks count for points. This logic ensures fairness and transparency for all participants.
