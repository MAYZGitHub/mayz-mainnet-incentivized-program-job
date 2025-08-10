import mongoose, { Schema, Types, model } from 'mongoose';

// NOTE: This is a local copy of ProtocolEntityMongo from the backend (MayzSmartDB). DO NOT MODIFY unless strictly necessary.
// All code and comments must remain in English.

export interface IProtocol {
    funds_ids: Types.ObjectId[];
    name: string;
    pdpProtocolVersion: number;
    pdpSwapOfferVersion: number;
    pdpBuyOrderVersion: number;
    pdpDelegationVersion: number;
    pdpScriptVersion: number;
    pdpProtocolPolicyID_CS: string;
    pdpProtocolPolicyID_Script: Record<string, any>;
    pdpProtocolPolicyID_Params: Record<string, any>;
    pdpProtocolValidator_AddressMainnet: string;
    pdpProtocolValidator_AddressTestnet: string;
    pdpProtocolValidator_Script: Record<string, any>;
    pdpProtocolValidator_Hash: string;
    pdpProtocolValidator_Params: Record<string, any>;
    pdpScriptPolicyID_CS: string;
    pdpScriptPolicyID_Script: Record<string, any>;
    pdpScriptPolicyID_Params: Record<string, any>;
    pdpScriptValidator_AddressMainnet: string;
    pdpScriptValidator_AddressTestnet: string;
    pdpScriptValidator_Script: Record<string, any>;
    pdpScriptValidator_Hash: string;
    pdpScriptValidator_Params: Record<string, any>;
    pdpSwapOfferPolicyID_CS: string;
    pdpSwapOfferPolicyID_Script: Record<string, any>;
    pdpSwapOfferPolicyID_Params: Record<string, any>;
    pdpSwapOfferValidator_AddressMainnet: string;
    pdpSwapOfferValidator_AddressTestnet: string;
    pdpSwapOfferValidator_Script: Record<string, any>;
    pdpSwapOfferValidator_Hash: string;
    pdpSwapOfferValidator_Params: Record<string, any>;
    pdpBuyOrderPolicyID_CS: string;
    pdpBuyOrderPolicyID_Script: Record<string, any>;
    pdpBuyOrderPolicyID_Params: Record<string, any>;
    pdpBuyOrderValidator_AddressMainnet: string;
    pdpBuyOrderValidator_AddressTestnet: string;
    pdpBuyOrderValidator_Script: Record<string, any>;
    pdpBuyOrderValidator_Hash: string;
    pdpBuyOrderValidator_Params: Record<string, any>;
    pdpDelegationPolicyID_CS: string;
    pdpDelegationPolicyID_Script: Record<string, any>;
    pdpDelegationPolicyID_Params: Record<string, any>;
    pdpDelegationValidator_AddressMainnet: string;
    pdpDelegationValidator_AddressTestnet: string;
    pdpDelegationValidator_Script: Record<string, any>;
    pdpDelegationValidator_Hash: string;
    pdpDelegationValidator_Params: Record<string, any>;
    pdpInvestUnitValidator_AddressMainnet: string;
    pdpInvestUnitValidator_AddressTestnet: string;
    pdpInvestUnitValidator_Script: Record<string, any>;
    pdpInvestUnitValidator_Hash: string;
    pdpInvestUnitValidator_Params: Record<string, any>;
    pdpFundFactories: Record<string, any>[];
    createdAt: Date;
    updatedAt: Date;
    // --- Optional/Datum fields below ---
    pdProtocolVersion?: number;
    pdScriptPolicyID_CS?: string;
    pdScriptValidator_Hash?: string;
    pdOraclePaymentPubKey?: string;
    pdOracleData_Valid_Time?: string;
    pdAdmins?: string[];
    pdDelegatorsAdmins?: string[];
    pdTokenAdminPolicy_CS?: string;
    pdFundCategories?: Record<string, any>[];
    pdFundLifeTime?: Record<string, any>;
    pdTokenGov_AC?: Record<string, any>;
    pdRequiredTokenGovForSwapOffer?: string;
    pdRequiredTokenGovForBuyOrder?: string;
    pdCommissionFund_PerYear_InBPx1e3?: Record<string, any>;
    pdCommissionSwapOffer_InBPx1e3?: Record<string, any>;
    pdCommissionBuyOrder_InBPx1e3?: Record<string, any>;
    pdShare_InBPx1e2_Protocol?: number;
    pdShare_InBPx1e2_Managers?: number;
    pdShare_InBPx1e2_Delegators?: number;
    pdMaxDepositAndWithdraw?: string;
    pdMinADA?: string;
}

const schemaDB = {
    funds_ids: { type: [Schema.Types.ObjectId], ref: 'funds', required: true },
    name: { type: String, required: true },
    pdpProtocolVersion: { type: Number, required: true },
    pdpSwapOfferVersion: { type: Number, required: true },
    pdpBuyOrderVersion: { type: Number, required: true },
    pdpDelegationVersion: { type: Number, required: true },
    pdpScriptVersion: { type: Number, required: true },
    pdpProtocolPolicyID_CS: { type: String, required: true },
    pdpProtocolPolicyID_Script: { type: Object, required: true },
    pdpProtocolPolicyID_Params: { type: Object, required: true },
    pdpProtocolValidator_AddressMainnet: { type: String, required: true },
    pdpProtocolValidator_AddressTestnet: { type: String, required: true },
    pdpProtocolValidator_Script: { type: Object, required: true },
    pdpProtocolValidator_Hash: { type: String, required: true },
    pdpProtocolValidator_Params: { type: Object, required: true },
    pdpScriptPolicyID_CS: { type: String, required: true },
    pdpScriptPolicyID_Script: { type: Object, required: true },
    pdpScriptPolicyID_Params: { type: Object, required: true },
    pdpScriptValidator_AddressMainnet: { type: String, required: true },
    pdpScriptValidator_AddressTestnet: { type: String, required: true },
    pdpScriptValidator_Script: { type: Object, required: true },
    pdpScriptValidator_Hash: { type: String, required: true },
    pdpScriptValidator_Params: { type: Object, required: true },
    pdpSwapOfferPolicyID_CS: { type: String, required: true },
    pdpSwapOfferPolicyID_Script: { type: Object, required: true },
    pdpSwapOfferPolicyID_Params: { type: Object, required: true },
    pdpSwapOfferValidator_AddressMainnet: { type: String, required: true },
    pdpSwapOfferValidator_AddressTestnet: { type: String, required: true },
    pdpSwapOfferValidator_Script: { type: Object, required: true },
    pdpSwapOfferValidator_Hash: { type: String, required: true },
    pdpSwapOfferValidator_Params: { type: Object, required: true },
    pdpBuyOrderPolicyID_CS: { type: String, required: true },
    pdpBuyOrderPolicyID_Script: { type: Object, required: true },
    pdpBuyOrderPolicyID_Params: { type: Object, required: true },
    pdpBuyOrderValidator_AddressMainnet: { type: String, required: true },
    pdpBuyOrderValidator_AddressTestnet: { type: String, required: true },
    pdpBuyOrderValidator_Script: { type: Object, required: true },
    pdpBuyOrderValidator_Hash: { type: String, required: true },
    pdpBuyOrderValidator_Params: { type: Object, required: true },
    pdpDelegationPolicyID_CS: { type: String, required: true },
    pdpDelegationPolicyID_Script: { type: Object, required: true },
    pdpDelegationPolicyID_Params: { type: Object, required: true },
    pdpDelegationValidator_AddressMainnet: { type: String, required: true },
    pdpDelegationValidator_AddressTestnet: { type: String, required: true },
    pdpDelegationValidator_Script: { type: Object, required: true },
    pdpDelegationValidator_Hash: { type: String, required: true },
    pdpDelegationValidator_Params: { type: Object, required: true },
    pdpInvestUnitValidator_AddressMainnet: { type: String, required: true },
    pdpInvestUnitValidator_AddressTestnet: { type: String, required: true },
    pdpInvestUnitValidator_Script: { type: Object, required: true },
    pdpInvestUnitValidator_Hash: { type: String, required: true },
    pdpInvestUnitValidator_Params: { type: Object, required: true },
    pdpFundFactories: { type: [Object], required: true },
};

const schemaDatum = {
    pdProtocolVersion: { type: Number, required: false },
    pdScriptPolicyID_CS: { type: String, required: false },
    pdScriptValidator_Hash: { type: String, required: false },
    pdOraclePaymentPubKey: { type: String, required: false },
    pdOracleData_Valid_Time: { type: String, required: false },
    pdAdmins: { type: [String], required: false },
    pdDelegatorsAdmins: { type: [String], required: false },
    pdTokenAdminPolicy_CS: { type: String, required: false },
    pdFundCategories: { type: [Object], required: false },
    pdFundLifeTime: { type: Object, required: false },
    pdTokenGov_AC: { type: Object, required: false },
    pdRequiredTokenGovForSwapOffer: { type: String, required: false },
    pdRequiredTokenGovForBuyOrder: { type: String, required: false },
    pdCommissionFund_PerYear_InBPx1e3: { type: Object, required: false },
    pdCommissionSwapOffer_InBPx1e3: { type: Object, required: false },
    pdCommissionBuyOrder_InBPx1e3: { type: Object, required: false },
    pdShare_InBPx1e2_Protocol: { type: Number, required: false },
    pdShare_InBPx1e2_Managers: { type: Number, required: false },
    pdShare_InBPx1e2_Delegators: { type: Number, required: false },
    pdMaxDepositAndWithdraw: { type: String, required: false },
    pdMinADA: { type: String, required: false },
};

const ProtocolSchema = new Schema<IProtocol>({
    ...schemaDB,
    ...schemaDatum,
}, { timestamps: true });

export const ProtocolModel = mongoose.models['protocols'] || model<IProtocol>('protocols', ProtocolSchema);
