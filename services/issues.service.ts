import { Request, Response } from "express";
import { logger } from "../shared/logger";
import { Issue } from "../Model/issue";
import DbServices from "../utils/DbServices";
import Scheduler from "node-schedule";
import { IIssueResponse } from "../interfaces/issue_response";

import { v4 as uuid } from "uuid";

import GatewayIssueService from "./gatewayIssue.service";
import {
  IBaseIssue,
  IssueRequest,
  Item,
  OnIssue,
  OnIssueStatusResoloved,
} from "../interfaces/BaseInterface";
import BugzillaService from "./bugzilla.service";
import { ComplainantAction } from "../interfaces/BaseInterface";
import LogisticsContext from "../utils/logistics_context";
import LogisticsService from "./logistics.service";

const dbServices = new DbServices();

const bugzillaService = new BugzillaService();

const gatewayIssueService = new GatewayIssueService();

const logisticsContext = new LogisticsContext();

const logisticsService = new LogisticsService();

class IssueService {
  scheduleJob: boolean = true;

  constructor() {
    this.createIssue = this.createIssue.bind(this);
  }

  // checking if closed complainant action exist
  hasClosedAction(array: any) {
    return array.some(
      (item: ComplainantAction) => item.complainant_action === "CLOSED"
    );
  }

  /**
   * createIssue and hit on_issue api
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */
  async createIssue(req: Request, res: Response) {
    const issuePayload: IssueRequest = req.body;

    const item_subcategories = ["FLM01", "FLM02", "FLM03"];

    try {
      // check if issues already exist
      const issue = await dbServices.findIssueWithPathAndValue({
        key: "context.transaction_id",
        value: issuePayload.context.transaction_id,
      });

      if (
        item_subcategories.includes(issuePayload.message.issue.sub_category) &&
        !issue.status
      ) {
        const payloadForLogistics = logisticsContext.issuePayload(issue);

        await logisticsService.issue_logistics(payloadForLogistics);
      }

      // create new issue if issues does not exist
      if (issue?.status === 404) {
        // fetching the organization details from the DB
        const organizationDetails = await dbServices.findOrganizationWithId({
          organizationId:
            issuePayload?.message?.issue?.order_details?.provider_id,
        });

        const itemIds = issuePayload?.message?.issue?.order_details.items.map(
          (item: Item) => item?.id
        );

        // fetching the products details

        const productsDetails = await dbServices.findProductWithItemId({
          itemIds: itemIds,
        });

        // adding and mapping the product name in the final payload
        const finalpayloadForItems =
          issuePayload?.message?.issue?.order_details?.items.map(
            (item: Item) => {
              const matchingItem = productsDetails?.find(
                (prodcut: any) => prodcut?.id === item?.id
              );

              if (matchingItem) {
                item.product_name = matchingItem?.productName;
              }
              return item;
            }
          );

        // fetching the order details

        const orderDetail = await dbServices.findOrderWithIdFromIssueRequest({
          orderIdFromIssue: issuePayload?.message?.issue?.order_details?.id,
        });

        const createIssuePayload: IssueRequest = {
          context: {
            ...issuePayload.context,
            timestamp: new Date(),
            action: "on_issue",
            core_version: "1.0.0",
          },
          message: {
            issue: {
              ...issuePayload.message.issue,

              order_details: {
                ...issuePayload.message.issue.order_details,
                provider_name: organizationDetails.name,
                items: finalpayloadForItems,
                orderDetailsId: orderDetail["_id"],
              },

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

        // checking and sending to logisitics if issue is related to
        if (
          item_subcategories.includes(issuePayload.message.issue.sub_category)
        ) {
          const payloadForLogistics =
            logisticsContext.issuePayload(createIssuePayload);

          await logisticsService.issue_logistics(payloadForLogistics);
        }

        try {
          const updatedIssueForBugzilla: IBaseIssue =
            await dbServices.findIssueWithPathAndValue({
              key: "context.transaction_id",
              value: issuePayload.context.transaction_id,
            });

          //creating bug in bugzilla

          await bugzillaService.createIssueInBugzilla({
            issue: {
              transaction_id: updatedIssueForBugzilla?.context?.transaction_id,
              summary:
                updatedIssueForBugzilla?.message?.issue?.description?.long_desc,
              bpp_id: updatedIssueForBugzilla?.context?.bap_id,
              bpp_name: updatedIssueForBugzilla.context.bap_uri,
              attachments:
                updatedIssueForBugzilla?.message?.issue?.description?.images,
              alias: updatedIssueForBugzilla?.context?.transaction_id,
              product:
                updatedIssueForBugzilla?.message?.issue?.order_details?.items[0]
                  ?.product_name,
            },
            issue_Actions:
              updatedIssueForBugzilla?.message?.issue?.issue_actions,
          });

          //schedule a job for sending respondant action processing after 5 min if Provider has not initiated

          Scheduler.scheduleJob(
            gatewayIssueService.startProcessingIssueAfter5Minutes(
              issuePayload.message.issue.created_at
            ),

            async () => {
              gatewayIssueService.scheduleAJob({
                payload: issuePayload,
                transaction_id: issuePayload.context.transaction_id,
              });
            }
          );

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

      const complaintActionLength =
        issuePayload.message?.issue.issue_actions.complainant_actions.length;

      // hit on_issue if any issue complainent action contains ESCALTED

      if (complaintActionLength !== 0) {
        for (const complaint of issuePayload?.message?.issue?.issue_actions
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
                  ...issue?.message?.issue,
                  issue_actions: {
                    respondent_actions: [
                      ...issue?.message?.issue?.issue_actions
                        ?.respondent_actions,
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
                issueValueToFind: issuePayload?.context?.transaction_id,
                keyPathForUpdating: "message.issue",
                issueSchema: {
                  ...issue?.message?.issue,
                  issue_actions: {
                    complainant_actions:
                      issuePayload?.message?.issue?.issue_actions
                        ?.complainant_actions,
                    respondent_actions:
                      on_issue_payload?.message?.issue?.issue_actions
                        ?.respondent_actions,
                  },
                },
              });

              bugzillaService.updateIssueInBugzilla({
                resolved: false,
                transaction_id: issue?.context?.transaction_id,
                issue_actions: {
                  ...issue?.message?.issue?.issue_actions,
                  ...issuePayload?.message?.issue?.issue_actions,
                  ...on_issue_payload?.message?.issue?.issue_actions,
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

      if (this.hasClosedAction(issuePayload?.message?.issue.issue_actions)) {
        bugzillaService.updateIssueInBugzilla({
          resolved: true,
          transaction_id: issue?.context?.transaction_id,
          issue_actions: {
            ...issue.message?.issue?.issue_actions,
            ...issuePayload?.message?.issue?.issue_actions,
          },
        });
      }

      if (process.env.BUGZILLA_API_KEY) {
        bugzillaService.updateIssueInBugzilla({
          resolved: false,
          transaction_id: issue?.context?.transaction_id,
          issue_actions: {
            ...issue?.message?.issue?.issue_actions,
            ...issuePayload?.message?.issue?.issue_actions,
          },
        });
      }

      // keep updating issue with new complainent actions
      await dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: issuePayload?.context?.transaction_id,
        keyPathForUpdating: "message.issue",
        issueSchema: {
          ...issue?.message?.issue,
          issue_type: issuePayload?.message?.issue?.issue_type,
          status: issuePayload?.message?.issue?.status,
          issue_actions: {
            ...issue.message?.issue?.issue_actions,
            complainant_actions:
              issuePayload?.message?.issue?.issue_actions?.complainant_actions,
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

        return res.status(200).send({
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
      payloadForResolvedissue = this.respondingToIssueByProvider({
        payload,
        fetchedIssueFromDataBase,
      });

      const response = await gatewayIssueService.on_issue_status({
        data: payloadForResolvedissue,
        message_id: payloadForResolvedissue.context.message_id,
      });

      if (response?.data.message?.ack?.status === "ACK") {
        const schemaPayloadForDatabase =
          this.storingCurrentIssueResponseIntoDatabase({
            fetchedIssueFromDataBase,
            payload,
            payloadForResolvedissue,
          });
        await dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "context.transaction_id",
          issueValueToFind: payload.transaction_id,
          keyPathForUpdating: "message.issue",
          issueSchema: schemaPayloadForDatabase,
        });

        await Scheduler.gracefulShutdown();

        await bugzillaService.updateIssueInBugzilla({
          issue_actions: {
            ...fetchedIssueFromDataBase.message.issue.issue_actions,
            respondent_actions:
              payloadForResolvedissue.message.issue.issue_actions
                .respondent_actions,
          },
          resolved: false,
          transaction_id: fetchedIssueFromDataBase.context.transaction_id,
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

      const issue_id = req.body.message.issue.id;

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
        message_id: uuid(),
      });

      return res.status(200).json({ success: true, data: response });
    } catch (e) {
      return res.status(500).json({
        error: true,
        message: JSON.stringify(e) || "Something went wrong",
      });
    }
  }

  /**
   * Issue_Status and on_issue_status Endpoint  for Logistics
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */

  async on_issue(req: Request, res: Response) {
    try {
      if (!req?.body?.message) return;

      const requested: IBaseIssue = req.body;

      const issue_id = req.body.message.issue.id;

      const result = await dbServices.findIssueWithPathAndValue({
        key: "message.issue.id",
        value: issue_id,
      });

      if (result?.status === 404) {
        return res.status(404).json({
          error: true,
          message: result.message || "Something went wrong",
        });
      }

      const mergedIssueWithLogistics: IBaseIssue = {
        context: {
          ...result.context,
          timestamp: req?.body?.context?.timestamp,
        },
        message: {
          issue: {
            ...result.message.issue,
            ...req.body.message.issue,
            updated_at: req.body.message.issue.updated_at,
            issue_actions: {
              ...result.message.issue.issue_actions,
              respondent_actions: {
                ...result?.message?.issue?.issue_actions?.respondent_actions,
                ...requested.message?.issue?.issue_actions?.respondent_actions,
              },
            },
            resolution_provider: {
              respondent_info: {
                ...requested.message?.issue?.resolution_provider
                  ?.respondent_info,
                resolution_support: {
                  ...requested.message?.issue?.resolution_provider
                    .respondent_info?.resolution_support,
                  gros: [
                    ...requested.message?.issue?.resolution_provider
                      .respondent_info?.resolution_support?.gros,
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

      const transaction_id = req?.body?.context?.transaction_id;

      await dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: transaction_id,
        keyPathForUpdating: "",
        issueSchema: mergedIssueWithLogistics,
      });

      await gatewayIssueService.on_issue_status({
        data: mergedIssueWithLogistics,
        message_id: uuid(),
      });

      return res.status(200).send({
        context: null,
        message: {
          ack: {
            status: "ACK",
          },
        },
      });
    } catch (e) {
      return res.status(500).json({
        error: true,
        message: JSON.stringify(e) || "Something went wrong",
      });
    }
  }

  /**
   * Issue_Status and on_issue_status Endpoint for Logistics
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */

  async on_issue_status(req: Request, res: Response) {
    try {
      if (!req?.body?.message) return;

      const requested: IBaseIssue = req.body;

      const issue_id = req.body.message.issue.id;

      const result = await dbServices.findIssueWithPathAndValue({
        key: "message.issue.id",
        value: issue_id,
      });

      if (result?.status === 404) {
        return res.status(404).json({
          error: true,
          message: result.message || "Something went wrong",
        });
      }

      const mergedIssueWithLogistics: IBaseIssue = {
        context: {
          ...result.context,
          timestamp: req?.body?.context?.timestamp,
        },
        message: {
          issue: {
            ...result.message.issue,
            ...req.body.message.issue,
            updated_at: req.body.message.issue.updated_at,
            issue_actions: {
              ...result.message.issue.issue_actions,
              respondent_actions: {
                ...result?.message?.issue?.issue_actions?.respondent_actions,
                ...requested.message?.issue?.issue_actions?.respondent_actions,
              },
            },
            resolution_provider: {
              respondent_info: {
                ...requested.message?.issue?.resolution_provider
                  ?.respondent_info,
                resolution_support: {
                  ...requested.message?.issue?.resolution_provider
                    .respondent_info?.resolution_support,
                  gros: [
                    ...requested.message?.issue?.resolution_provider
                      .respondent_info?.resolution_support?.gros,
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

      const transaction_id = req?.body?.context?.transaction_id;

      await dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: transaction_id,
        keyPathForUpdating: "",
        issueSchema: mergedIssueWithLogistics,
      });

      await gatewayIssueService.on_issue_status({
        data: mergedIssueWithLogistics,
        message_id: uuid(),
      });

      return res.status(200).send({
        context: null,
        message: {
          ack: {
            status: "ACK",
          },
        },
      });
    } catch (e) {
      return res.status(500).json({
        error: true,
        message: JSON.stringify(e) || "Something went wrong",
      });
    }
  }

  /// Utility Function for Issue Service

  //  creating payload for on_issue_status_status for "PROCESSING","REFUND" and other Cases

  respondingToIssueByProvider({
    fetchedIssueFromDataBase,
    payload,
  }: {
    fetchedIssueFromDataBase: IBaseIssue;
    payload: IIssueResponse;
  }) {
    let payloadForResolvedissue: OnIssueStatusResoloved;
    if (payload.respondent_action === "PROCESSING") {
      this.scheduleJob = false;

      payloadForResolvedissue = {
        context: {
          ...fetchedIssueFromDataBase.context,
          action: "on_issue_status",
          core_version: "1.0.0",
          timestamp: new Date(),
          message_id: uuid(),
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
          message_id: uuid(),
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
          message_id: uuid(),
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

    return payloadForResolvedissue;
  }

  // storing the latest responses from Seller Provider into db
  storingCurrentIssueResponseIntoDatabase({
    fetchedIssueFromDataBase,
    payload,
    payloadForResolvedissue,
  }: {
    fetchedIssueFromDataBase: IBaseIssue;
    payload: IIssueResponse;
    payloadForResolvedissue: OnIssueStatusResoloved;
  }) {
    return {
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
    };
  }
}

export default IssueService;
