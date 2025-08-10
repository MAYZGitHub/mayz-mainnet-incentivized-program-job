import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    walletName?: string;
    walletValidatedWithSignedToken?: boolean;
    paymentPKH: string;
    stakePKH?: string;
    name?: string;
    email?: string;
    isCoreTeam?: boolean;
    testnet_address?: string;
    mainnet_address?: string;
    createdBy?: string;
    lastConnection?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const WalletSchema = new Schema<IWallet>({
    walletName: { type: String, required: false },
    walletValidatedWithSignedToken: { type: Boolean, required: false },
    paymentPKH: { type: String, required: true },
    stakePKH: { type: String, required: false },
    name: { type: String, required: false },
    email: { type: String, required: false },
    isCoreTeam: { type: Boolean, required: false },
    testnet_address: { type: String, required: false },
    mainnet_address: { type: String, required: false },
    createdBy: { type: String, required: false },
    lastConnection: { type: Date, required: false },
}, { timestamps: true, collection: 'wallets' });

export const WalletModel = mongoose.models['wallets'] || mongoose.model<IWallet>('wallets', WalletSchema);
