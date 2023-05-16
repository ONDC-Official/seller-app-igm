import Joi from "joi";
import { Issue } from "../interfaces/issue";

export function CreateIssueSchemaValidator(issueObject: Issue) {
  const schema = Joi.object({
    context: {
      domain: Joi.string().required(),
      country: Joi.string().required(),
      city: Joi.string().required(),
      action: Joi.string().required(),
      core_version: Joi.string().required(),
      bap_id: Joi.string().required(),
      bap_uri: Joi.string().required(),
      bpp_id: Joi.string().required(),
      bpp_uri: Joi.string().required(),
      transaction_id: Joi.string().required(),
      message_id: Joi.string().required(),
      timestamp: Joi.date().required(),
      ttl: Joi.string(),
    },
    message: {
      issue: {
        id: Joi.string().required(),
        category: Joi.string().required(),
        sub_category: Joi.string().required(),
        complainant_info: {
          person: {
            name: Joi.string().required(),
            email: Joi.string().required(),
          },
          contact: {
            phone: Joi.string().required(),
          },
        },
      },
      order_details: {
        id: Joi.string().required(),
        state: Joi.string().required(),
        items: [
          {
            id: Joi.string().required(),
            quantity: Joi.number().required(),
          },
        ],
        fulfillments: [
          {
            id: Joi.string().required(),
            state: Joi.string().required(),
          },
        ],
        provider_id: Joi.string().required(),
      },
      description: {
        short_desc: Joi.string().required(),
        long_desc: Joi.string().required(),
        additional_desc: {
          url: Joi.string().required(),
          content_type: Joi.string().required(),
        },
        images: [Joi.string().required()],
        source: {
          network_participant_id: Joi.string().required(),
          type: Joi.string().required(),
        },
        expected_response_time: {
          duration: Joi.string().required(),
        },
        expected_resolution_time: {
          duration: Joi.string().required(),
        },
        status: Joi.string().required(),
        issue_type: Joi.string().required(),
        issue_actions: {
          complainant_actions: [
            {
              complainant_action: Joi.string().required(),
              short_desc: Joi.string().required(),
              updated_at: Joi.date().required(),
              updated_by: {
                org: {
                  name: Joi.string().required(),
                },
                contact: {
                  phone: Joi.string().required(),
                  email: Joi.string().required(),
                },
                person: {
                  name: Joi.string().required(),
                },
              },
            },
          ],
        },
        created_at: Joi.date().required(),
        updated_at: Joi.date().required(),
      },
    },
  });

  const { error } = schema.validate(issueObject, { abortEarly: false });

  return error;
}
