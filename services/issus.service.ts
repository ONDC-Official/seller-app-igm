import { Request, Response } from "express";
import { logger } from "../shared/logger";
import { Issue } from "../Model/issue";
import DbServices from "../utils/DbServices";

import { IIssueResponse } from "../interfaces/issue_response";

import { GatewayIssueService } from "./index.service";

const gatewayIssueService = new GatewayIssueService();

const dbServices = new DbServices();

class IssueService {
  constructor() {
    this.createIssue = this.createIssue.bind(this);
  }

  async createIssue(req: Request, res: Response) {
    try {
      const issue = await dbServices.findIssueWithPathAndValue({
        key: "context.transaction_id",
        value: req.body.context.transaction_id,
      });

      if (issue?.status === 404) {
        await Issue.create(req.body);

        try {
          await gatewayIssueService.scheduleAJob({
            transaction_id: req.body.context.transaction_id,
            created_at: req.body.message.issue.created_at,
            payload: issue,
          });
          return res.status(201).send({
            status: 201,
            success: true,
            message: "Issue has been created",
          });
        } catch (e) {
          return res.status(500).send({
            success: false,
            message: e || "Something went wrong",
          });
        }
      }

      await dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: req.body.context.transaction_id,
        keyPathForUpdating: "message.issue",
        issueSchema: {
          ...issue?.message?.issue,
          issue_type: req.body.message.issue_type,
          status: req.body.message.issue.status,
          issue_actions: {
            complainant_actions:
              req.body.message.issue.issue_actions.complainant_actions,
          },
          rating: req.body.message.issue.rating,
        },
      });

      logger.info("pushed into database");

      return res.status(200).send({
        status: 200,
        success: true,
        message: "Issue has been updated",
      });
    } catch (error: any) {
      logger.error(error);
      return res
        .status(500)
        .json({ error: true, message: error || "Something went wrong" });
    }
  }

  async getAllIssues(req: Request, res: Response) {
    if (req.body.user) {
      const issueResults = await dbServices.findIssueWithPathAndValue({
        key: "message.issue.order_details.provider_id",
        value: req.params.providerId,
      });

      if (issueResults?.issues.length === 0) {
        res.status(200).send({ message: "There is no issue", issues: [] });
      }

      return res.status(200).send({ success: true, issueResults });
    }

    const allIssues = await Issue.find();

    if (allIssues.length === 0) {
      return res.status(200).send({ message: "There is no issue", issues: [] });
    }

    return res.status(200).send({ success: true, allIssues });
  }

  async issue_response({ req, res }: { req: IIssueResponse; res: Response }) {
    try {
      const data = await dbServices.findIssueWithPathAndValue({
        key: "context.transaction_id",
        value: req.transaction_id,
      });

      if (data.status === 404) {
        return { message: "There is no issue", issues: [] };
      }

      const payload: IIssueResponse = {
        transaction_id: req.transaction_id,
        refund_amount: req.refund_amount,
        long_desc: req.long_desc,
        respondent_action: req.respondent_action,
        short_desc: req.short_desc,
        updated_at: new Date(),
        updated_by: {
          org: {
            name: `${data.context.bpp_id + process.env.DOMAIN}`,
          },
          contact: {
            phone: req.updated_by.contact.phone,
            email: req.updated_by.contact.email,
          },
          person: {
            name: req.updated_by.person.name,
          },
        },
        cascaded_level: 1,
      };

      await Issue.updateOne(
        {
          "context.transaction_id": payload.transaction_id,
        },
        {
          $set: {
            "message.issue.issue_actions.respondent_actions": [
              ...data.message.issue.issue_actions.respondent_actions,
              {
                respondent_action: payload.respondent_action,
                short_desc: payload.short_desc,
                updated_by: payload.updated_by,
              },
            ],
          },
        },

        { upsert: true }
      );

      gatewayIssueService.on_issue(data);

      const updatedData = await dbServices.getIssueByTransactionId(
        req.transaction_id
      );

      return updatedData;
    } catch (err) {
      return res
        .status(500)
        .json({ error: true, message: err || "Something went wrong" });
    }
  }

  async getSingleIssue(req: Request, res: Response) {
    const { transactionId } = req.params;

    const result = await dbServices.findIssueWithPathAndValue({
      key: "context.transaction_id",
      value: transactionId,
    });
    console.log(
      "🚀 ~ file: issus.service.ts:182 ~ IssueService ~ getSingleIssue ~ result:",
      result
    );

    if (result.status === 404) {
      res.status(200).send({ message: "There is no issue", issues: [] });
    }

    res.status(200).send({ success: true, result });

    return { issue: result };
  }

  async issueStatus(req: Request, res: Response) {
    const issue_id = req.body.message.issue_id;

    const result = await dbServices.getIssueByIssueId(issue_id);

    // this.on_issue_status(result);

    return res.status(200).send({ issue: result });
  }
}

export default IssueService;
