import Joi from "joi";
import { IIssueResponse } from "../interfaces/issue_response";

export function ResponseToIssueValidator(issueObject: IIssueResponse) {
  const schema = Joi.object({
    transaction_id: Joi.string().required(),
    refund_amount: Joi.string().required(),
    long_desc: Joi.string().required(),
    respondent_action: Joi.string().required(),
    short_desc: Joi.string().required(),
    updated_at: Joi.string().required(),
    cascaded_level: Joi.required(),
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
  });

  const { error } = schema.validate(issueObject, { abortEarly: false });

  return error;
}
