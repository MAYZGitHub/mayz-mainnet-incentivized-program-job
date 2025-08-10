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
1. Search for all `Swap Offer - Buy FT` transactions with status `confirmed` in the Governance DB for the user, dated after the program start (e.g., `2024-01-01`).
2. For each transaction:
   - Check on-chain (via Blockfrost) that the transaction is real and confirmed.
   - Parse the datum and redeemer to determine the exact amount of $gMAYZ bought (net of commission/fee).
   - Verify that the transaction is for the official $gMAYZ fund (using the correct fund policy ID).
   - Calculate the **net amount received**: total $gMAYZ bought minus any FT fee paid.
3. Sum up the net $gMAYZ received across all valid transactions.
4. If the user has **not bought enough $gMAYZ** (total net < 100 $gMAYZ), the task is marked as **incomplete**.
5. If the user has bought enough $gMAYZ but does **not** have at least 100 $gMAYZ in their wallet at the snapshot (each day is recalculated until the end of the campaign), the task is marked as **incomplete**.
6. If the user has bought enough $gMAYZ and still holds at least 100 $gMAYZ in their wallet at the snapshot, the task is marked as **completed** and points are awarded.

### Task 2: Swap Offers
- Create swap offer (type: `Swap Offer - Create`, status: `confirmed`) in dapp DB.
- Offer value ≥ 500 ADA in FT, remains active until campaign end.
- Points: 1 ADA = 2 points, max 4,000 points.

### Task 3: Hold Fund Tokens (FT)
**Step-by-step logic:**
1. Search for all `Swap Offer - Buy FT` transactions with status `confirmed` in the Dapp DB for the user, dated after the program start (e.g., `2024-01-01`). Only transactions for official funds (excluding $gMAYZ fund) are considered.
2. For each transaction:
   - Check on-chain (via Blockfrost) that the transaction is real and confirmed.
   - Parse the datum and redeemer to determine the exact amount of each FT bought (net of commission/fee).
   - Aggregate the total net amount bought for each FT (by token unit).
3. For each FT token:
   - Look up the user's current wallet balance for that FT at the time of calculation (using Blockfrost).
   - Determine the currently held amount for each FT as the minimum of (total bought, current wallet balance).
   - Fetch the current ADA price for each FT.
4. Calculate:
   - The ADA value of all FTs ever bought.
   - The ADA value of FTs still held (currently held * price).
   - Points are awarded as **1 ADA = 1 point**, capped at a maximum of 4,000 points (using the ADA value of FTs currently held).
5. The task is marked as:
   - **Completed** if the user has bought and still holds a nonzero amount of any FT (ADA value > 0).
   - **Incomplete** if the user has bought FT but currently holds zero of all FTs (sold or moved all) or if the user never bought any FT.

### Task 4: Stake $gMAYZ
- Stake $gMAYZ in a Fund, keep staked until campaign end.
- Points: 1 $gMAYZ = 2 points, max 4,000 points.

### Task 5: Give Feedback
- Complete Google feedback form (off-chain, tracked in DB).
- Adds 5% bonus to total points.

---

## 3. Points Multiplier
- Total score × amount of $gMAYZ held (up to 1,000 units).
- All holdings are snapshot at campaign end.

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
