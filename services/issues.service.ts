import { Request, Response } from "express";
import { logger } from "../shared/logger";
import { Issue } from "../Model/issue";
import DbServices from "../utils/DbServices";

import { IIssueResponse } from "../interfaces/issue_response";

import GatewayIssueService from "./gatewayIssue.service";
import {
  IBaseIssue,
  InitialIssue,
  IssueRequest,
  OnIssue,
  OnIssueStatusResoloved,
} from "../interfaces/BaseInterface";

const gatewayIssueService = new GatewayIssueService();

const dbServices = new DbServices();

class IssueService {
  scheduleJob: boolean = true;

  constructor() {
    this.createIssue = this.createIssue.bind(this);
  }

  /**
   * createIssue and hit on_issue api
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async createIssue(req: Request, res: Response) {
    const issuePayload: IssueRequest = req.body;

    try {
      // check if issues already exist
      const issue = await dbServices.findIssueWithPathAndValue({
        key: "context.transaction_id",
        value: issuePayload.context.transaction_id,
      });

      // create new issue if issues does not exist
      if (issue?.status === 404) {
        const createIssuePayload: InitialIssue = {
          context: {
            ...issuePayload.context,
            timestamp: new Date(),
            action: "on_issue",
            core_version: "1.0.0",
          },
          message: {
            issue: {
              ...issuePayload.message.issue,
              issue_actions: {
                complainant_actions:
                  issuePayload.message.issue.issue_actions.complainant_actions,
                respondent_actions: [],
              },
            },
          },
        };
        //creating issue
        await Issue.create(createIssuePayload);

        try {
          //schedule a job for sending respondant action processing after 5 min if Provider has not initiated

          await gatewayIssueService.scheduleAJob({
            transaction_id: issuePayload.context.transaction_id,
            created_at: issuePayload.message.issue.created_at,
            payload: issuePayload,
            scheduleJob: this.scheduleJob,
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

      // hit on_issue if any issue complainent action contains ESCALTED

      if (
        issuePayload.message?.issue.issue_actions.complainant_actions.length !==
        0
      ) {
        for (const complaint of issuePayload.message?.issue.issue_actions
          .complainant_actions) {
          if (
            complaint?.complainant_action === "ESCALATE" &&
            issuePayload.message.issue.status !== "CLOSED"
          ) {
            const on_issue_payload: OnIssue = {
              context: {
                ...issuePayload.context,
              },
              message: {
                issue: {
                  ...issue.message.issue,
                  issue_actions: {
                    respondent_actions: [
                      ...issue.message.issue.issue_actions.respondent_actions,
                      {
                        respondent_action: "PROCESSING",
                        short_desc: "We are looking into your concern.",
                        updated_at: new Date(),
                        updated_by: {
                          org: {
                            name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                          },
                          contact: {
                            phone: "9876543210",
                            email: "Rishabhnand.singh@ondc.org",
                          },
                          person: {
                            name: "Rishabhnand Singh",
                          },
                        },
                        cascaded_level: 1,
                      },
                    ],
                  },
                },
              },
            };
            const response: any = await gatewayIssueService.on_issue(
              on_issue_payload
            );

            if (response?.data.message?.ack?.status === "ACK") {
              await dbServices.addOrUpdateIssueWithKeyValue({
                issueKeyToFind: "context.transaction_id",
                issueValueToFind: issuePayload.context.transaction_id,
                keyPathForUpdating: "message.issue",
                issueSchema: {
                  ...issue?.message?.issue,
                  issue_actions: {
                    ...issue.message.issue.issue_actions,
                    respondent_actions:
                      on_issue_payload.message.issue.issue_actions
                        .respondent_actions,
                  },
                },
              });
              return res.status(200).send({
                context: null,
                message: {
                  ack: {
                    status: "ACK",
                  },
                },
              });
            }
          }
        }
      }

      // hit on_issue if any issue complainent action contains GRIEVANCE

      if (
        issuePayload.message.issue.issue_type === "GRIEVANCE" &&
        issuePayload.message.issue.status !== "CLOSED"
      ) {
        const on_issue_payload: OnIssue = {
          context: {
            ...issuePayload.context,
            action: "on_issue",
            core_version: "1.0.0",
          },
          message: {
            issue: {
              ...issuePayload.message.issue,
              issue_actions: {
                respondent_actions: [
                  ...issuePayload.message.issue.issue_actions
                    .respondent_actions,
                  {
                    respondent_action: "PROCESSING",
                    short_desc: "We are looking into your concern.",
                    updated_at: new Date(),
                    updated_by: {
                      org: {
                        name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                      },
                      contact: {
                        phone: "9876543210",
                        email: "Rishabhnand.singh@ondc.org",
                      },
                      person: {
                        name: "Rishabhnand Singh",
                      },
                    },
                    cascaded_level: 1,
                  },
                ],
              },
            },
          },
        };

        const response: any = await gatewayIssueService.on_issue(
          on_issue_payload
        );

        if (response?.data.message?.ack?.status === "ACK") {
          await dbServices.addOrUpdateIssueWithKeyValue({
            issueKeyToFind: "context.transaction_id",
            issueValueToFind: issuePayload.context.transaction_id,
            keyPathForUpdating: "message.issue",
            issueSchema: {
              ...issue?.message?.issue,
              issue_actions: {
                ...issue.message.issue.issue_actions,
                respondent_actions:
                  on_issue_payload.message.issue.issue_actions
                    .respondent_actions,
              },
            },
          });

          await dbServices.addOrUpdateIssueWithKeyValue({
            issueKeyToFind: "context.transaction_id",
            issueValueToFind: issuePayload.context.transaction_id,
            keyPathForUpdating: "message.issue",
            issueSchema: {
              ...issue?.message?.issue,
              issue_actions: {
                ...issuePayload.message.issue.issue_actions,
                respondent_actions:
                  on_issue_payload.message.issue.issue_actions
                    .respondent_actions,
              },
            },
          });
          return res.status(200).send({
            context: null,
            message: {
              ack: {
                status: "ACK",
              },
            },
          });
        }
      }

      // keep updating issue with new complainent actions
      await dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: issuePayload.context.transaction_id,
        keyPathForUpdating: "message.issue",
        issueSchema: {
          ...issue?.message?.issue,
          issue_type: issuePayload.message.issue.issue_type,
          status: issuePayload.message.issue.status,
          issue_actions: {
            ...issue.message.issue.issue_actions,
            complainant_actions:
              issuePayload.message.issue.issue_actions.complainant_actions,
          },
          rating: issuePayload.message.issue.rating,
        },
      });

      logger.info("pushed into database");

      return res.status(200).send({
        context: null,
        message: {
          ack: {
            status: "ACK",
          },
        },
      });
    } catch (error: any) {
      logger.error(error);
      return res
        .status(500)
        .json({ error: true, message: error || "Something went wrong" });
    }
  }

  /**
   * getAllIssue Endpoint
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async getAllIssues(req: Request, res: Response) {
    try {
      const offset: string = req.query.offset?.toString() ?? "0";
      const limit: string = req.query.limit?.toString() ?? "10";

      const query: { offset: number; limit: number } = {
        offset: parseInt(offset, 10),
        limit: parseInt(limit, 10),
      };

      // if organization ID exist in token return specific providers complaints only
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

        return res.status(200).send({
          success: true,
          issues: specificProviderIssue,
          count: specificProviderIssue?.length,
        });
      }

      // return all issues is Super Admin
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

        return res
          .status(200)
          .send({
            success: true,
            issues: allIssues,
            count: allIssues?.length,
          });
      }

      return res.status(200).send({ success: true, issues: [] });
    } catch (err) {
      return res.status(400).json({
        error: true,
        message: JSON.stringify(err) || "Something went wrong",
      });
    }
  }

  /**
   * Issue_Response Endpoint for Responding to the issue
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async issue_response(req: Request, res: Response) {
    let payloadForResolvedissue: OnIssueStatusResoloved;
    try {
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
            name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
          },
          contact: {
            phone: req.body.updated_by.contact.phone,
            email: req.body.updated_by.contact.email,
          },
          person: {
            name: req?.body?.updated_by?.person?.name,
          },
        },
        action_triggered: req.body.action_triggered,
        cascaded_level: 1,
      };

      // responding with Different status by Provider

      if (payload.respondent_action === "PROCESSING") {
        this.scheduleJob = false;

        payloadForResolvedissue = {
          context: {
            ...fetchedIssueFromDataBase.context,
            action: "on_issue_status",
            core_version: "1.0.0",
            timestamp: new Date(),
          },
          message: {
            issue: {
              ...fetchedIssueFromDataBase.message.issue,
              issue_actions: {
                respondent_actions: [
                  ...fetchedIssueFromDataBase.message.issue.issue_actions
                    .respondent_actions,
                  {
                    cascaded_level: 1,
                    respondent_action: payload.respondent_action,
                    short_desc: payload.short_desc,
                    updated_at: new Date(),
                    updated_by: {
                      contact: {
                        email: payload.updated_by.contact.email,
                        phone: payload.updated_by.contact.phone,
                      },
                      org: {
                        name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                      },
                      person: { name: payload.updated_by.person.name },
                    },
                  },
                ],
              },
              updated_at: new Date(),
            },
          },
        };
      } else if (payload?.action_triggered === "REFUND") {
        payloadForResolvedissue = {
          context: {
            ...fetchedIssueFromDataBase.context,
            action: "on_issue_status",
            core_version: "1.0.0",
            timestamp: new Date(),
          },
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
                    updated_at: new Date(),
                    updated_by: {
                      contact: {
                        email: payload.updated_by.contact.email,
                        phone: payload.updated_by.contact.phone,
                      },
                      org: {
                        name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                      },
                      person: { name: payload.updated_by.person.name },
                    },
                  },
                ],
              },
              resolution: {
                action_triggered: "REFUND",
                long_desc: payload.long_desc,
                refund_amount: payload.refund_amount,
                short_desc: payload.short_desc,
              },
              resolution_provider: {
                respondent_info: {
                  type: "TRANSACTION-COUNTERPARTY-NP",
                  organization: {
                    org: {
                      name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                    },
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    person: { name: payload.updated_by.person.name },
                  },
                  resolution_support: {
                    chat_link: "http://chat-link/respondent",
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    gros: [
                      {
                        person: { name: payload.updated_by.person.name },
                        contact: {
                          email: payload.updated_by.contact.email,
                          phone: payload.updated_by.contact.phone,
                        },
                        gro_type: "TRANSACTION-COUNTERPARTY-NP-GRO",
                      },
                    ],
                  },
                },
              },
              updated_at: new Date(),
            },
          },
        };
      } else {
        payloadForResolvedissue = {
          context: {
            ...fetchedIssueFromDataBase.context,
            action: "on_issue_status",
            core_version: "1.0.0",
            timestamp: new Date(),
          },
          message: {
            issue: {
              ...fetchedIssueFromDataBase.message.issue,
              issue_actions: {
                respondent_actions: [
                  ...fetchedIssueFromDataBase.message.issue.issue_actions
                    .respondent_actions,
                  {
                    cascaded_level: 1,
                    respondent_action: payload.respondent_action,
                    short_desc: payload.short_desc,
                    updated_at: new Date(),
                    updated_by: {
                      contact: {
                        email: payload.updated_by.contact.email,
                        phone: payload.updated_by.contact.phone,
                      },
                      org: {
                        name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                      },
                      person: { name: payload.updated_by.person.name },
                    },
                  },
                ],
              },
              resolution: {
                action_triggered: payload.action_triggered,
                long_desc: payload.long_desc,
                short_desc: payload.short_desc,
              },
              resolution_provider: {
                respondent_info: {
                  type: "TRANSACTION-COUNTERPARTY-NP",
                  organization: {
                    org: {
                      name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                    },
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    person: { name: payload.updated_by.person.name },
                  },
                  resolution_support: {
                    chat_link: "http://chat-link/respondent",
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    gros: [
                      {
                        person: { name: payload.updated_by.person.name },
                        contact: {
                          email: payload.updated_by.contact.email,
                          phone: payload.updated_by.contact.phone,
                        },
                        gro_type: "TRANSACTION-COUNTERPARTY-NP-GRO",
                      },
                    ],
                  },
                },
              },
              updated_at: new Date(),
            },
          },
        };
      }

      const response = await gatewayIssueService.on_issue_status({
        data: payloadForResolvedissue,
        message_id: payloadForResolvedissue.context.message_id,
      });

      if (response?.data.message?.ack?.status === "ACK") {
        this.scheduleJob = true;
        await dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "context.transaction_id",
          issueValueToFind: payload.transaction_id,
          keyPathForUpdating: "message.issue",
          issueSchema: {
            ...fetchedIssueFromDataBase?.message?.issue,
            issue_actions: {
              ...fetchedIssueFromDataBase.message.issue.issue_actions,
              respondent_actions:
                payloadForResolvedissue.message.issue.issue_actions
                  .respondent_actions,
            },
            resolution: {
              action_triggered: payload.action_triggered,
              long_desc: payload.long_desc,
              refund_amount: payload.refund_amount,
              short_desc: payload.short_desc,
            },
            resolution_provider: {
              respondent_info: {
                type: "TRANSACTION-COUNTERPARTY-NP",
                organization: {
                  org: {
                    name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
                  },
                  contact: {
                    email: payload.updated_by.contact.email,
                    phone: payload.updated_by.contact.phone,
                  },
                  person: { name: payload.updated_by.person.name },
                },
                resolution_support: {
                  chat_link: "http://chat-link/respondent",
                  contact: {
                    email: payload.updated_by.contact.email,
                    phone: payload.updated_by.contact.phone,
                  },
                  gros: [
                    {
                      person: { name: payload.updated_by.person.name },
                      contact: {
                        email: payload.updated_by.contact.email,
                        phone: payload.updated_by.contact.phone,
                      },
                      gro_type: "TRANSACTION-COUNTERPARTY-NP-GRO",
                    },
                  ],
                },
              },
            },
            updated_at: new Date(),
          },
        });

        return res.status(200).send({
          context: null,
          message: {
            ack: {
              status: "ACK",
            },
          },
        });
      }

      // updating the database with latest issue_actions

      return res.status(400).json({
        error: true,
        message: response?.data || "Something went wrong",
      });
    } catch (err) {
      return res.status(400).json({
        error: true,
        message: JSON.stringify(err) || "Something went wrong",
      });
    }
  }

  /**
   * getIssue Endpoint to a issue with issue ID
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async getSingleIssue(req: Request, res: Response) {
    const { issueId } = req.params;

    const result = await dbServices.findIssueWithPathAndValue({
      key: "message.issue.id",
      value: issueId,
    });

    if (result.status === 404) {
      return res.status(200).send({ message: "There is no issue", issue: [] });
    }

    return res.status(200).send({ success: true, issue: result });
  }

  /**
   * Issue_Status and on_issue_status Endpoint for updates
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async issueStatus(req: Request, res: Response) {
    try {
      if (!req?.body?.message) return;

      const issue_id = req.body.message.issue_id;

      const result = await dbServices.findIssueWithPathAndValue({
        key: "message.issue.id",
        value: issue_id,
      });

      if (result.status === 404) {
        return res.status(404).json({
          error: true,
          message: result.message || "Something went wrong",
        });
      }

      const response = await gatewayIssueService.on_issue_status({
        data: result,
        message_id: req.body.context.message_id,
      });

      return res.status(200).json({ success: true, data: response });
    } catch (e) {
      return res.status(500).json({
        error: true,
        message: JSON.stringify(e) || "Something went wrong",
      });
    }
  }
}

export default IssueService;
