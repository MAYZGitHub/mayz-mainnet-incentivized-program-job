import mongoose, { Schema, Types, model } from 'mongoose';

// NOTE: This is a local copy of FundEntityMongo from the backend (MayzSmartDB). DO NOT MODIFY unless strictly necessary.
// All code and comments must remain in English.

export interface IFund {
    protocol_id: Types.ObjectId;
    protocolVersion: number;
    investUnit_id: Types.ObjectId;
    fundHoldings_ids: Types.ObjectId[];
    hasFundHoldings: boolean;
    name: string;
    status: string;
    total_FT_Minted: string;
    tokenEmergencyAdmin_CS: string;
    priceADAx1e6?: string;
    TVLx1e6?: string;
    change24?: number;
    feeEarned?: string;
    staked?: string;
    showInSite: boolean;
    showInHome: boolean;
    isOfficial: boolean;
    fdpFundVersion: number;
    fdpFundPolicy_Params: object;
    fdpFundPolicy_Script: object;
    fdpFundPolicy_CS: string;
    fdpFundValidator_AddressMainnet: string;
    fdpFundValidator_AddressTestnet: string;
    fdpFundValidator_Script: object;
    fdpFundValidator_Hash: string;
    fdpFundValidator_Params: object;
    fdpFundHoldingPolicyID_Params: object;
    fdpFundHoldingPolicyID_Script: object;
    fdpFundHoldingPolicyID_CS: string;
    fdpFundHoldingValidator_Params: object;
    fdpFundHoldingValidator_Hash: string;
    fdpFundHoldingValidator_Script: object;
    fdpFundHoldingValidator_AddressTestnet: string;
    fdpFundHoldingValidator_AddressMainnet: string;
    createdAt: Date;
    updatedAt: Date;
    // --- Optional/Datum fields below ---
    fdFundVersion?: number;
    fdFundPolicy_CS?: string;
    fdFundFT_TN_Hex?: string;
    fdFundValidator_Hash?: string;
    fdFundHoldingPolicyID_CS?: string;
    fdFundHoldingValidator_Hash?: string;
    fdInvestUnitValidator_Hash?: string;
    fdAdmins?: string[];
    fdTokenAdminPolicy_CS?: string;
    fdFund_Category_Number?: number;
    fdBeginAt?: string;
    fdDeadline?: string;
    fdClosedAt?: object;
    fdCommission_PerYear_InBPx1e3?: string;
    fdCommissions_Table_Numerator_1e6?: string[];
    fdHoldingsCount?: number;
    fdHoldingsIndex?: number;
    fdMaxDepositAndWithdraw?: string;
    fdTokenGov_AC?: object;
    fdRequiredTokenGov?: string;
    fdMinADA?: string;
}

const schemaDB = {
    protocol_id: { type: Schema.Types.ObjectId, ref: 'protocols', required: true },
    protocolVersion: { type: Number, required: true },
    investUnit_id: { type: Schema.Types.ObjectId, ref: 'investUnits', required: false },
    fundHoldings_ids: { type: [Schema.Types.ObjectId], ref: 'fundHoldings', required: true },
    hasFundHoldings: { type: Boolean, required: false },
    status: { type: String, required: false },
    name: { type: String, required: true },
    total_FT_Minted: { type: String, required: false },
    tokenEmergencyAdmin_CS: { type: String, required: false },
    priceADAx1e6: { type: String, required: false },
    TVLx1e6: { type: String, required: false },
    change24: { type: Number, required: false },
    feeEarned: { type: String, required: false },
    staked: { type: String, required: false },
    showInSite: { type: Boolean, required: false },
    showInHome: { type: Boolean, required: false },
    isOfficial: { type: Boolean, required: false },
    fdpFundVersion: { type: Number, required: true },
    fdpFundPolicy_Params: { type: Object, required: true },
    fdpFundPolicy_Script: { type: Object, required: true },
    fdpFundPolicy_CS: { type: String, required: true },
    fdpFundValidator_AddressMainnet: { type: String, required: true },
    fdpFundValidator_AddressTestnet: { type: String, required: true },
    fdpFundValidator_Script: { type: Object, required: true },
    fdpFundValidator_Hash: { type: String, required: true },
    fdpFundValidator_Params: { type: Object, required: true },
    fdpFundHoldingPolicyID_Params: { type: Object, required: true },
    fdpFundHoldingPolicyID_Script: { type: Object, required: true },
    fdpFundHoldingPolicyID_CS: { type: String, required: true },
    fdpFundHoldingValidator_Params: { type: Object, required: true },
    fdpFundHoldingValidator_Hash: { type: String, required: true },
    fdpFundHoldingValidator_Script: { type: Object, required: true },
    fdpFundHoldingValidator_AddressTestnet: { type: String, required: true },
    fdpFundHoldingValidator_AddressMainnet: { type: String, required: true },
};

const schemaDatum = {
    fdFundVersion: { type: Number, required: false },
    fdFundPolicy_CS: { type: String, required: false },
    fdFundFT_TN_Hex: { type: String, required: false },
    fdFundValidator_Hash: { type: String, required: false },
    fdFundHoldingPolicyID_CS: { type: String, required: false },
    fdFundHoldingValidator_Hash: { type: String, required: false },
    fdInvestUnitValidator_Hash: { type: String, required: false },
    fdAdmins: { type: [String], required: false },
    fdTokenAdminPolicy_CS: { type: String, required: false },
    fdFund_Category_Number: { type: Number, required: false },
    fdBeginAt: { type: String, required: false },
    fdDeadline: { type: String, required: false },
    fdClosedAt: { type: Object, required: false },
    fdCommission_PerYear_InBPx1e3: { type: String, required: false },
    fdCommissions_Table_Numerator_1e6: { type: [String], required: false },
    fdHoldingsCount: { type: Number, required: false },
    fdHoldingsIndex: { type: Number, required: false },
    fdMaxDepositAndWithdraw: { type: String, required: false },
    fdTokenGov_AC: { type: Object, required: false },
    fdRequiredTokenGov: { type: String, required: false },
    fdMinADA: { type: String, required: false },
};

const FundSchema = new Schema<IFund>({
    ...schemaDB,
    ...schemaDatum,
}, { timestamps: true });

export const FundModel = mongoose.models['funds'] || model<IFund>('funds', FundSchema);
