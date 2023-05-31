import mongoose, { Schema } from "mongoose";
const issueSchema = new Schema({
  context: {
    domain: { type: String },
    country: { type: String },
    city: { type: String },
    action: { type: String },
    core_version: { type: String },
    bap_id: { type: String },
    bap_uri: { type: String },
    transaction_id: { type: String },
    message_id: { type: String },
    timestamp: { type: String },
    bpp_id: { type: String },
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
          email: { type: String },
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
        images: [],
      },
      source: {
        network_participant_id: { type: String },
        issue_source_type: { type: String },
      },
      expected_response_time: {
        duration: { type: String },
      },
      expected_resolution_time: {
        duration: { type: String },
      },
      status: {
        type: String,
        enum: ["OPEN", "CLOSE", "ESCALATE"],
      },
      issue_type: { type: String, enum: ["ISSUE", "GRIEVANCE", "DISPUTE"] },
      issue_actions: Object,
      rating: {
        type: String,
        enum: ["THUMBS-UP", "THUMBS-DOWN"],
      },
      resolution_provider: {
        respondent_info: {
          type: {
            type: String,
            enum: [
              "TRANSACTION-COUNTERPARTY-NP-GRO",
              "INTERFACING-NP-GRO",
              "CASCADED-COUNTERPARTY-NP-GRO",
            ],
          },
          organization: {
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
          resolution_support: {
            chat_link: { type: String },
            contact: {
              phone: { type: String },
              email: { type: String },
            },
            gros: [
              {
                person: {
                  name: { type: String },
                },
                contact: {
                  phone: { type: String },
                  email: { type: String },
                },
                gro_type: {
                  type: String,
                  enum: [
                    "TRANSACTION-COUNTERPARTY-NP-GRO",
                    "INTERFACING-NP-GRO",
                    "CASCADED-COUNTERPARTY-NP-GRO",
                  ],
                },
              },
            ],
          },
        },
      },
      resolution: {
        short_desc: { type: String },
        long_desc: { type: String },
        action_triggered: {
          type: String,
          enum: ["RESOLVED", "REFUND", "REPLACEMENT", "CASCADED", "NO-ACTION"],
        },
        refund_amount: { type: String },
      },
      created_at: { type: Date },
      updated_at: { type: Date },
    },
  },
});
export const Issue = mongoose.model("Issue", issueSchema);
