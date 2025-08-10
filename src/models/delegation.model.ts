import mongoose, { Schema, model, models, Document } from 'mongoose';

// Faithful copy based on DelegationDatum and DelegationEntityMongo from MayzSmartDB
// All code and comments must remain in English.

export interface IDelegation extends Document {
    ddVersion: number;
    ddDelegationPolicyID_CS: string; // CS
    ddFundPolicy_CS: string; // CS
    ddDelegatorPaymentPKH: string; // PaymentKeyHash
    ddDelegatorStakePKH: string | null; // Maybe<StakeCredentialPubKeyHash>
    ddTokenGov_AC: {
        policy: string;
        name: string;
    }; // AssetClass
    ddStaked: string; // as string for bigints
    ddMinADA: string; // as string for bigints
    createdAt?: Date;
    updatedAt?: Date;
}

const DelegationSchema = new Schema<IDelegation>({
    ddVersion: { type: Number, required: true },
    ddDelegationPolicyID_CS: { type: String, required: true },
    ddFundPolicy_CS: { type: String, required: true },
    ddDelegatorPaymentPKH: { type: String, required: true },
    ddDelegatorStakePKH: { type: String, required: false },
    ddTokenGov_AC: { type: Object, required: true },
    ddStaked: { type: String, required: true },
    ddMinADA: { type: String, required: true },
}, { timestamps: true, collection: 'delegations' });

export const DelegationModel = mongoose.models['delegations'] || model<IDelegation>('delegations', DelegationSchema);
