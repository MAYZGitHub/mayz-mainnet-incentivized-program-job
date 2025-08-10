import mongoose, { Schema, Document, model } from 'mongoose';

export interface ITransaction extends Document {
  hash: string;
  paymentPKH?: string;
  date: Date;
  type: string;
  status: string;
  error?: object;
  parse_info?: string;
  ids?: Record<string, string | undefined>;
  redeemers?: Record<string, any>;
  datums?: Record<string, any>;
  consuming_UTxOs?: object[];
  reading_UTxOs?: object[];
  valid_from?: number;
  valid_until?: number;
  unit_mem?: number;
  unit_steps?: number;
  fee?: number;
  size?: number;
  CBORHex?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  hash: { type: String, required: false, index: true },
  paymentPKH: { type: String, required: false, index: true },
  date: { type: Date, required: true, index: -1 },
  type: { type: String, required: true, index: true },
  status: { type: String, required: true, index: true },
  error: { type: Object, required: false },
  parse_info: { type: String, required: false },
  ids: { type: Object, required: false },
  redeemers: { type: Object, required: false },
  datums: { type: Object, required: false },
  consuming_UTxOs: { type: [Object], required: false },
  reading_UTxOs: { type: [Object], required: false },
  valid_from: { type: Number, required: false },
  valid_until: { type: Number, required: false },
  unit_mem: { type: Number, required: false },
  unit_steps: { type: Number, required: false },
  fee: { type: Number, required: false },
  size: { type: Number, required: false },
  CBORHex: { type: String, required: false },
}, { timestamps: true, collection: 'transactions' });

// Compound indexes
TransactionSchema.index({ 'ids.fund_id': 1, date: -1 });
TransactionSchema.index({ paymentPKH: 1, date: -1 });
TransactionSchema.index({ type: 1, date: -1 });
TransactionSchema.index({ status: 1, date: -1 });
TransactionSchema.index({ hash: 1, date: -1 });

export const TransactionModel = mongoose.models['transactions'] || model<ITransaction>('transactions', TransactionSchema);
