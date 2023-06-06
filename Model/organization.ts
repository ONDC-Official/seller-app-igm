import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const OrganizationSchema = new mongoose.Schema(
  {
    //Users who has login ability should go under User schema
    _id: {
      type: String,
      required: true,
      default: () => uuidv4(),
    },
    name: { type: String, required: true },
    address: { type: String },
    contactEmail: { type: String },
    contactMobile: { type: String },
    addressProof: { type: String },
    idProof: { type: String },
    bankDetails: {
      accHolderName: { type: String },
      accNumber: { type: String },
      IFSC: { type: String },
      cancelledCheque: { type: String },
      bankName: { type: String },
      branchName: { type: String },
    },
    PAN: { PAN: { type: String }, proof: { type: String } },
    GSTN: { GSTN: { type: String }, proof: { type: String } },
    FSSAI: { type: String },
    createdAt: {
      type: Number,
      default: Date.now(),
    },
    storeDetails: {
      categories: { type: Object },
      logo: { type: String },
      location: new mongoose.Schema(
        { lat: { type: Number }, long: { type: Number } },
        { _id: true }
      ),
      locationAvailabilityPANIndia: { type: Boolean },
      city: { type: Object },
      defaultCancellable: { type: Boolean },
      defaultReturnable: { type: Boolean },
      address: {
        building: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        area_code: { type: String },
        locality: { type: String },
      },
      supportDetails: {
        email: { type: String },
        mobile: { type: String },
      },
      storeTiming: { type: Object },
    },
    createdBy: { type: String },
  },
  {
    strict: true,
    timestamps: true,
  }
);

OrganizationSchema.index({ name: 1, shortCode: 1 }, { unique: false });
export const Organization = mongoose.model("Organization", OrganizationSchema);
