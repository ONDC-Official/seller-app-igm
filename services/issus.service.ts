import { Request, Response } from "express";
import { logger } from "../shared/logger";
import { CreateIssueSchemaValidator } from "../utils/validator";
import { Issue } from "../Model/issueSchema";
import DbServices from "../utils/DbServices";

const dbServices = new DbServices();

class IssueService {
  constructor() {
    this.createIssue = this.createIssue.bind(this);
  }

  async createIssue(req: Request, res: Response) {
    try {
      //   const validValue = CreateIssueSchemaValidator(req.body);
      //   if (validValue) {
      //     return res.status(400).send({ error: validValue.message });
      //   }

    const resonse = {
        context: {
          domain: "ONDC:RET10",
          country: "IND",
          city: "std:080",
          action: "on_issue",
          core_version: "1.0.0",
          bap_id: "buyerapp.com",
          bap_uri: "https://buyerapp.com/ondc",
          bpp_id: "sellerapp.com",
          bpp_uri: "https://sellerapp.com/ondc",
          transaction_id: "T1",
          message_id: "M1",
          timestamp: "2023-01-15T10:10:00.142Z",
        },
        message: {
          issue: {
            id: "I1",
            issue_actions: {
              respondent_actions: [
                {
                  respondent_action: "PROCESSING",
                  short_desc: "Complaint is being processed",
                  updated_at: "2023-01-15T10:10:00.142Z",
                  updated_by: {
                    org: {
                      name: "https://sellerapp.com/ondc::ONDC:RET10",
                    },
                    contact: {
                      phone: "9450394140",
                      email: "respondentapp@respond.com",
                    },
                    person: {
                      name: "Jane Doe",
                    },
                  },
                  cascaded_level: 1,
                },
              ],
            },
            created_at: "2023-01-15T10:00:00.469Z",
            updated_at: "2023-01-15T10:10:00.142Z",
          },
        },
      };

      const result = await Issue.find({
        "context.transaction_id": req.body.context.transaction_id,
      });

      if (result?.length === 0) {
        await Issue.create(req.body);
        return res.status(201).send({ message: "Issue has been created" });
      }

      const findAndUpdate = await dbServices.addOrUpdateIssueWithtransactionId(
        req.body.context.transaction_id,
        req.body
      );

      console.log(
        "🚀 ~ file: issus.service.ts:34 ~ IssueService ~ createIssue ~ findAndUpdate:",
        findAndUpdate
      );

      logger.info("pushed into database");
    } catch (error: any) {
      logger.error(error);
      return error;
    }
  }

  async getAllIssues(req: Request) {
    let { bap_id } = req.body;

    const result = await Issue.find({ "context.bap_id": bap_id });

    return { Issues: result };
  }

  async findIssue(req: Request) {
    let { transaction_id } = req.body;

    const result = await dbServices.getIssueByTransactionId(transaction_id);
    console.log(
      "🚀 ~ file: issus.service.ts:53 ~ IssueService ~ findIssue ~ result:",
      result
    );

    return { Issues: result };
  }

  async getIssueStatus() {}
}

export default IssueService;
