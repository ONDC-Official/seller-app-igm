import mongoose, { Schema } from "mongoose";

const issueSchema = new Schema({
  context: {
    domain: {
      type: String,
      required: true,
      enum: ["nic2004:52110", "nic2004:60232"],
    },
    country: { type: String, required: true },
    city: { type: String, required: true },
    action: { type: String, required: true },
    core_version: { type: String, required: true },
    bap_id: { type: String, required: true },
    bap_uri: { type: String, required: true },
    bpp_id: { type: String },
    bpp_uri: { type: String },
    transaction_id: { type: String, required: true },
    message_id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    ttl: { type: String },
  },
  message: {
    issue: {
      id: { type: String },
      category: { type: String },
      sub_category: { type: String },
      complainant_info: {
        person: {
          name: { type: String },
          email: { type: String },
        },
        contact: {
          phone: { type: String },
        },
      },
    },
    order_details: {
      id: { type: String },
      state: { type: String },
      items: [
        {
          id: { type: String },
          quantity: { type: Number },
        },
      ],
      fulfillments: [
        {
          id: { type: String },
          state: { type: String },
        },
      ],
      provider_id: { type: String },
    },
    description: {
      short_desc: { type: String },
      long_desc: { type: String },
      additional_desc: {
        url: { type: String },
        content_type: { type: String },
      },
      images: [{ type: String }],
      source: {
        network_participant_id: { type: String },
        type: { type: String },
      },
      expected_response_time: {
        duration: { type: String },
      },
      expected_resolution_time: {
        duration: { type: String },
      },
      status: { type: String },
      issue_type: { type: String },
      issue_actions: {
        complainant_actions: [
          {
            complainant_action: { type: String },
            short_desc: { type: String },
            updated_at: { type: Date },
            updated_by: {
              org: {
                name: { type: String },
              },
              contact: {
                phone: { type: String },
                email: { type: String },
              },
              person: {
                name: { type: String },
              },
            },
          },
        ],
      },
      created_at: { type: Date },
      updated_at: { type: Date },
    },
  },
});

export const Issue = mongoose.model("Issue", issueSchema);
