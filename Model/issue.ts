import mongoose, { Schema } from "mongoose";

const issueSchema = new Schema({
  buyerContext: {
    // domain: { type: String },
    country: { type: String },
    city: { type: String },
    action: { type: String },
    // core_version: { type: String },
    bap_id: { type: String },
    bap_uri: { type: String },
    // bpp_id: { type: String },
    // bpp_uri: { type: String },
    transaction_id: { type: String },
    message_id: { type: String },
    timestamp: { type: Date },
    ttl: { type: String },
  },
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
    order_created: { type: Date },
    order_modified_on: { type: Date },
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
      respondent_actions: [
        {
          respondent_action: {
            type: String,
            enum: ["PROCESSING", "CASCADED", "RESOLVED", "NEED-MORE-INFO"],
          },
          short_desc: { type: String },
          updated_at: { type: Date },
          updated_by: {
            org: {
              name: { type: String },
            },
            contact: {
              phone: { type: Number },
              email: { type: String },
            },
            person: {
              name: { type: String },
            },
          },
          cascaded_level: { type: Number },
        },
      ],
    },
    payment: {
      base_price: { type: String },
      total_taxes: { type: String },
      delivery_fee: { type: String },
      total_price: { type: Number },
    },

    created_at: { type: Date },
    updated_at: { type: Date },
  },
});

export const Issue = mongoose.model("Issue", issueSchema);