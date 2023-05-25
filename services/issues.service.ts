import { Request, Response } from "express";
import { logger } from "../shared/logger";
import { Issue } from "../Model/issue";
import DbServices from "../utils/DbServices";

import { IIssueResponse } from "../interfaces/issue_response";

import { GatewayIssueService } from "./index.service";
import {
  IBaseIssue,
  _On_Issue_Status_Resoloved,
} from "interfaces/BaseInterface";

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
            payload: req.body,
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

      if (req.body.message.issue_type === "GRIEVANCE") {
        const issueWithGrivance = await dbServices.findIssueWithPathAndValue({
          key: "context.transaction_id",
          value: req.body.context.transaction_id,
        });

        gatewayIssueService.on_issue({ onIssueData: issueWithGrivance });
      }

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
    const offset: string = req.query.offset?.toString() ?? "0";
    const limit: string = req.query.limit?.toString() ?? "10";

    const query: { offset: number; limit: number } = {
      offset: parseInt(offset, 10),
      limit: parseInt(limit, 10),
    };

    console.log(
      "req.body?.user?.user?.organization",
      req.body?.user?.user?.organization
    );
    if (req.body?.user?.user?.organization) {
      const specificProviderIssue = await Issue.find({
        "message.issue.order_details.provider_id":
          req.body?.user?.user?.organization,
      })
        .sort({ "message.issue.created_at": -1 })
        .skip(query.offset * query.limit)
        .limit(query.limit);

      if (specificProviderIssue?.length === 0) {
        return res
          .status(200)
          .send({ message: "There is no issue", issues: [] });
      }

      return res
        .status(200)
        .send({ success: true, issues: specificProviderIssue });
    }

    console.log(
      "req.body?.user?.user?.role?.name",
      req.body?.user?.user?.organization
    );

    if (req.body?.user?.user?.role?.name === "Super Admin") {
      const allIssues = await Issue.find()
        .sort({ "message.issue.created_at": -1 })
        .skip(query.offset * query.limit)
        .limit(query.limit)
        .lean();

      if (allIssues?.length === 0) {
        return res
          .status(200)
          .send({ message: "There is no issue", issues: [] });
      }

      return res.status(200).send({ success: true, allIssues });
    }

    return res.status(200).send({ success: true, data: [] });
  }

  async issue_response(req: Request, res: Response) {
    let on_issue;
    let payloadForResolvedissue: _On_Issue_Status_Resoloved;
    try {
      //TODO: check this & or |
      const fetchedIssueFromDataBase: IBaseIssue & {
        status: number;
        name: string;
        message: string;
      } = await dbServices.findIssueWithPathAndValue({
        key: "context.transaction_id",
        value: req.body.transaction_id,
      });

      if (fetchedIssueFromDataBase.status === 404) {
        return res
          .status(200)
          .send({ message: "There is no issue", issues: [] });
      }

      const payload: IIssueResponse = {
        transaction_id: req.body.transaction_id,
        refund_amount: req.body.refund_amount,
        long_desc: req.body.long_desc,
        respondent_action: req.body.respondent_action,
        short_desc: req.body.short_desc,
        updated_at: new Date(),
        updated_by: {
          org: {
            name: `${
              fetchedIssueFromDataBase.context.bpp_id + process.env.DOMAIN
            }`,
          },
          contact: {
            phone: req.body.updated_by.contact.phone,
            email: req.body.updated_by.contact.email,
          },
          person: {
            name: req.body.updated_by.person.name,
          },
        },
        cascaded_level: 1,
      };

      if (payload.respondent_action === "RESOLVED") {
        payloadForResolvedissue = {
          context: fetchedIssueFromDataBase.context,
          message: {
            issue: {
              ...fetchedIssueFromDataBase.message.issue,
              issue_actions: {
                respondent_actions: [
                  ...fetchedIssueFromDataBase.message.issue.issue_actions
                    .respondent_actions,
                  {
                    cascaded_level: 1,
                    respondent_action: "RESOLVED",
                    short_desc: payload.short_desc,
                    updated_at: new Date().toDateString(),
                    updated_by: {
                      contact: { email: "", phone: "" },
                      org: { name: "" },
                      person: { name: "" },
                    },
                  },
                ],
              },
              resolution: {
                action_triggered: "RESOLVED",
                long_desc: payload.long_desc,
                refund_amount: payload.refund_amount,
                short_desc: payload.short_desc,
              },
              resolution_provider: {
                respondent_info: {
                  type: "TRANSACTION-COUNTERPARTY-NP",
                  organization: {
                    org: {
                      name: "sellerapp.com::ONDC:RET10",
                    },
                    contact: {
                      phone: "9059304940",
                      email: "email@resolutionproviderorg.com",
                    },
                    person: {
                      name: "resolution provider org contact person name",
                    },
                  },
                  resolution_support: {
                    chat_link: "http://chat-link/respondent",
                    contact: {
                      phone: "9949595059",
                      email: "respondantemail@resolutionprovider.com",
                    },
                    gros: [
                      {
                        person: {
                          name: "Sam D",
                        },
                        contact: {
                          phone: "9605960796",
                          email: "email@gro.com",
                        },
                        gro_type: "TRANSACTION-COUNTERPARTY-NP-GRO",
                      },
                    ],
                  },
                },
              },
            },
          },
        };

        on_issue = await gatewayIssueService.on_issue_status(
          payloadForResolvedissue
        );

        //TODO: return here
        return on_issue;
      }

      if (
        fetchedIssueFromDataBase?.message?.issue.status === "OPEN" ||
        fetchedIssueFromDataBase?.message?.issue.status === "ESCALATE"
      ) {
        on_issue = await gatewayIssueService.on_issue_status(
          fetchedIssueFromDataBase
        );
      }

      // TODO - return send() with on_issue data

      await dbServices.getIssueByTransactionId(req.body.transaction_id);
      dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: payload.transaction_id,
        keyPathForUpdating: "message.issue.issue_actions.respondent_actions",
        issueSchema: [
          ...fetchedIssueFromDataBase.message.issue.issue_actions
            .respondent_actions,
          {
            respondent_action: payload.respondent_action,
            short_desc: payload.short_desc,
            updated_by: payload.updated_by,
          },
        ],
      });

      // TODO - change on_issue according to the response you will get

      return res
        .status(500)
        .json({ error: true, message: on_issue || "Something went wrong" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: true, message: err || "Something went wrong" });
    }
  }

  async getSingleIssue(req: Request, res: Response) {
    const { issueId } = req.params;

    const result = await dbServices.findIssueWithPathAndValue({
      key: "message.issue.id",
      value: issueId,
    });

    if (result.status === 404) {
      return res.status(200).send({ message: "There is no issue", issues: [] });
    }

    return res.status(200).send({ success: true, result });
  }

  async issueStatus(req: Request, res: Response) {
    try {
      if (!req?.body?.message) return;

      const issue_id = req.body.message.issue_id;

      const result = await dbServices.getIssueByIssueId(issue_id);

      const response = await gatewayIssueService.on_issue_status(result);

      //TODO: check response and act according now not tested yet
      if (response) {
        return res.status(200).json({ success: true, data: response });
      }

      return res
        .status(500)
        .json({ error: true, message: "Something went wrong" });
    } catch (e) {
      return res
        .status(500)
        .json({ error: true, message: e || "Something went wrong" });
    }
  }
}

export default IssueService;
