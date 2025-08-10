import mongoose, { Schema, Types, model } from 'mongoose';

// NOTE: This is a local copy of SwapOfferEntityMongo from the backend (MayzSmartDB). DO NOT MODIFY unless strictly necessary.
// All code and comments must remain in English.

export interface ISwapOffer extends Document {
  sodVersion?: number;
  sodSwapOfferPolicyID_CS?: string;
  sodFundPolicy_CS?: string;
  sodSellerPaymentPKH?: string;
  sodSellerStakePKH?: object;
  sodAskedCommission_InBPx1e3?: string;
  sodAmount_FT_Available?: string;
  sodAmount_ADA_Available?: string;
  sodTotal_FT_Earned?: string;
  sodTotal_ADA_Earned?: string;
  sodAllowSellFT?: number;
  sodAllowSellADA?: number;
  sodSwapStatus?: number;
  sodTokenGov_AC?: object;
  sodRequiredTokenGov?: string;
  sodMinADA?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SwapOfferSchema = new Schema<ISwapOffer>({
  sodVersion: { type: Number, required: false },
  sodSwapOfferPolicyID_CS: { type: String, required: false },
  sodFundPolicy_CS: { type: String, required: false },
  sodSellerPaymentPKH: { type: String, required: false },
  sodSellerStakePKH: { type: Object, required: false },
  sodAskedCommission_InBPx1e3: { type: String, required: false },
  sodAmount_FT_Available: { type: String, required: false },
  sodAmount_ADA_Available: { type: String, required: false },
  sodTotal_FT_Earned: { type: String, required: false },
  sodTotal_ADA_Earned: { type: String, required: false },
  sodAllowSellFT: { type: Number, required: false },
  sodAllowSellADA: { type: Number, required: false },
  sodSwapStatus: { type: Number, required: false },
  sodTokenGov_AC: { type: Object, required: false },
  sodRequiredTokenGov: { type: String, required: false },
  sodMinADA: { type: String, required: false },
}, { timestamps: true, collection: 'swap offers' });

export const SwapOfferModel = mongoose.models['swap offers'] || model<ISwapOffer>('swap offers', SwapOfferSchema);
