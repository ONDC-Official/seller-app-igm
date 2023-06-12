import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
const OrderSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      default: () => uuid(),
    },
    billing: {
      type: Object,
    },
    items: {
      type: Object,
    },
    transactionId: {
      type: String,
    },
    quote: {
      type: Object,
    },
    fulfillments: {
      type: Object,
    },
    payment: {
      type: Object,
    },
    state: {
      type: Object,
    },
    orderId: {
      type: String,
    },
    cancellation_reason_id: {
      type: String,
    },
    organization: { type: String, ref: "Organization" },
    createdBy: { type: String },
  },
  {
    strict: true,
    timestamps: true,
  }
);

// productSchema.index({name:1}, {unique: false});
export const Order = mongoose.model("Order", OrderSchema);
