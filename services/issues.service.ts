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
import LogisticsSelectedRequest from "../Model/SelectedLogistics";
import { RespondentAction } from "../interfaces/BaseInterface";

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
    return array?.some(
      (item: ComplainantAction) => item.complainant_action === "CLOSED"
    );
  }
  hasCascadedAction(array: any) {
    return array?.some(
      (item: RespondentAction) => item?.respondent_action === "CASCADED"
    );
  }

  hasKey(obj: object, key: string): boolean {
    return key in obj;
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
        item_subcategories.includes(issue?.message?.issue?.sub_category) &&
        !this.hasKey(issue, "status")
      ) {
        const selectRequest = await LogisticsSelectedRequest.findOne({
          where: {
            transactionId: issue.context?.transaction_id,
            providerId: issue.message.issue.order_details?.provider_id,
          },
          order: [["createdAt", "DESC"]],
        });

        const transaction_id =
          selectRequest?.getDataValue("selectedLogistics")?.context
            .transaction_id;

        const payloadForLogistics = await logisticsContext.issuePayload(
          {
            context: issue.context,
            message: {
              issue: {
                ...issue.message.issue,
                ...issuePayload.message.issue,
                issue_actions: {
                  ...issue.message.issue.issue_actions,
                  complainant_actions: [
                    issuePayload?.message?.issue.issue_actions
                      ?.complainant_actions,
                  ],
                },
              },
            },
          },
          transaction_id,
          issue.message.issue.created_at
        );

        console.log(
          "🚀 ~ file: issues.service.ts:111 ~ IssueService ~ createIssue ~ payloadForLogistics:",
          payloadForLogistics
        );

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

        // checking and sending to logisitics if issue is related to
        const selectRequest = await LogisticsSelectedRequest.findOne({
          where: {
            transactionId: req?.body?.context?.transaction_id,
            providerId: req?.body.message.issue.order_details.provider_id,
          },
          order: [["createdAt", "DESC"]],
        });

        const transaction_id =
          selectRequest?.getDataValue("selectedLogistics")?.context
            ?.transaction_id;
        if (
          item_subcategories.includes(issuePayload.message.issue.sub_category)
        ) {
          const issuePayloadLogisticsAndOn_issue = {
            ...issuePayload,
            message: {
              issue: {
                ...issuePayload?.message?.issue,
                issue_actions: {
                  ...issuePayload?.message?.issue?.issue_actions,
                  respondent_actions: [
                    {
                      respondent_action: "PROCESSING",
                      short_desc: "We are investigating your concern.",
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
                    {
                      respondent_action: "CASCADED",
                      short_desc: "We have sent your request to logistics.",
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
                      cascaded_level: 2,
                    },
                  ],
                },
              },
            },
          };

          const payloadForLogistics = await logisticsContext.issuePayload(
            issuePayloadLogisticsAndOn_issue,
            transaction_id,
            new Date().toISOString()
          );

          const response: any = await gatewayIssueService.on_issue(
            issuePayloadLogisticsAndOn_issue
          );

          if (response?.data.message?.ack?.status === "ACK") {
            await logisticsService.issue_logistics(payloadForLogistics);

            await Scheduler.gracefulShutdown();
          }
        }

        const createIssuePayload: IssueRequest = {
          context: {
            ...issuePayload.context,
            timestamp: new Date(),
            action: "on_issue_status",
            core_version: "1.0.0",
            ttl: issuePayload.context.ttl,
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
          logisticsTransactionId: transaction_id,
        };

        //creating issue
        await Issue.create(createIssuePayload);

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
        const allIssues = await Issue.find({
          "message.issue.order_details.provider_id":
            req.body?.user?.user?.organization,
        })
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
    console.log(
      "🚀 ~ file: issues.service.ts:676 ~ IssueService ~ issueStatus ~ req:",
      req.body
    );
    try {
      console.log("first");
      if (!req?.body?.message) return Error("Issue is not found");

      const issue_id = req.body.message.issue_id;
      console.log(
        "🚀 ~ file: issues.service.ts:681 ~ IssueService ~ issueStatus ~ issue_id:",
        issue_id
      );

      const { message_id } = req.body.context;
      console.log(
        "🚀 ~ file: issues.service.ts:683 ~ IssueService ~ issueStatus ~ message_id:",
        message_id
      );

      const result = await dbServices.findIssueWithPathAndValue({
        key: "message.issue.id",
        value: issue_id,
      });
      console.log(
        "🚀 ~ file: issues.service.ts:692 ~ IssueService ~ issueStatus ~ result:",
        result
      );

      if (result.status === 404) {
        return res.status(404).json({
          error: true,
          message: result.message || "Something went wrong",
        });
      }

      const selectRequest = await LogisticsSelectedRequest.findOne({
        where: {
          transactionId: result?.context?.transaction_id,
          providerId: result?.message?.issue?.order_details.provider_id,
        },
        order: [["createdAt", "DESC"]],
      });
      console.log(
        "🚀 ~ file: issues.service.ts:707 ~ IssueService ~ issueStatus ~ selectRequest:",
        selectRequest
      );

      const { transaction_id, bpp_id, bpp_uri } =
        selectRequest?.getDataValue("selectedLogistics")?.context;

      const payloadForLogistic = {
        context: {
          domain: "nic2004:60232",
          city: "std:080",
          country: "IND",
          action: "issue_status",
          core_version: "1.0.0",
          bap_uri: `${process.env.BPP_URI}`,
          bap_id: `${process.env.BPP_ID}`,
          bpp_id: bpp_id,
          bpp_uri: bpp_uri,
          transaction_id: transaction_id,
          message_id: message_id,
          timestamp: new Date(),
        },
        message: {
          issue_id: issue_id,
        },
      };
      console.log(
        "🚀 ~ file: issues.service.ts:730 ~ IssueService ~ issueStatus ~ payloadForLogistic:",
        payloadForLogistic
      );

      if (
        this.hasCascadedAction(
          result?.message?.issue?.issue_actions?.respondent_actions
        )
      ) {
        console.log("0000001111");
        await dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "message.issue.id",
          issueValueToFind: issue_id,
          keyPathForUpdating: "context.message_id",
          issueSchema: message_id,
        });

        await logisticsService.issue_status_logistics(payloadForLogistic);
      } else {
        console.log("dw");
        await gatewayIssueService.on_issue_status({
          data: {
            context: {
              ...result?.context,
              message_id: req.body.context.message_id,
            },
            message: {
              issue: {
                ...result?.message?.issue,
                issue_actions: {
                  ...result?.message?.issue?.issue_actions,
                  respondent_actions: [
                    ...result?.message?.issue.issue_actions.respondent_actions,
                  ],
                },
                updated_at: result?.message?.issue.updated_at,
              },
            },
          },
          message_id: message_id,
        });
      }

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
   * Issue_Status and on_issue_status Endpoint  for Logistics
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   */

  async on_issue_logistics(req: Request, res: Response) {
    try {
      const {
        messageId: logisticsMessageId,
        transactionId: logisticsTransactionId,
      } = req?.body;

      const issueRequest: any = await Issue.findOne({
        logisticsTransactionId: logisticsTransactionId,
      });

      const retailMessageId = issueRequest?.context?.message_id;

      const logisticsResponse: any = await logisticsService?.getLogistics(
        logisticsMessageId,
        retailMessageId,
        "issue"
      );

      const retail_issue = logisticsResponse?.retail_issue;
      const logistics_on_issue = logisticsResponse?.logistics_on_issue;

      const mergedIssueWithLogistics: OnIssue = {
        context: {
          message_id: uuid(),
          timestamp: req?.body?.context?.timestamp,
          domain: "nic2004:52110",
          country: retail_issue?.[0]?.context?.country,
          city: retail_issue?.[0]?.context?.city,
          action: "on_issue_status",
          core_version: retail_issue?.[0].context.core_version,
          bap_uri: retail_issue?.[0].context.bap_uri,
          bap_id: retail_issue?.[0]?.context?.bap_id,
          bpp_id: `${process.env.BPP_ID}`,
          bpp_uri: `${process.env.BPP_URI}`,
          transaction_id: retail_issue?.[0]?.context?.transaction_id,
        },
        message: {
          issue: {
            ...retail_issue?.[0].message.issue,
            issue_actions: {
              respondent_actions: [
                ...logistics_on_issue?.[0]?.message?.issue?.issue_actions
                  ?.respondent_actions,
              ],
            },
          },
        },
      };

      const transaction_id = retail_issue?.[0]?.context?.transaction_id;

      const data = {
        // ...issueRequest,
        context: {
          ...mergedIssueWithLogistics.context,
          ttl: issueRequest.context.ttl,
        },
        message: {
          issue: {
            ...mergedIssueWithLogistics.message.issue,
            issue_actions: {
              ...mergedIssueWithLogistics.message.issue.issue_actions,
              complainant_actions:
                issueRequest.message.issue.issue_actions.complainant_actions,
            },
          },
        },
      };

      console.log(
        "🚀 ~ file: issues.service.ts:844 ~ IssueService ~ on_issue_logistics ~ data:",
        JSON.stringify(data)
      );

      await dbServices.findAndUpdateWholeDocument({
        transaction_id,
        data,
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

  async on_issue_status_logistics(req: Request, res: Response) {
    try {
      let mergedIssueWithLogisticsRespondentAction: any;
      const {
        messageId: logisiticsMessageId,
        transactionId: logisticsTransactionId,
      } = req?.body;
      console.log(
        "🚀 ~ file: issues.service.ts:926 ~ IssueService ~ on_issue_status_logistics ~ logisticsTransactionId:",
        logisticsTransactionId
      );

      const issueRequest: any = await Issue.findOne({
        logisticsTransactionId: logisticsTransactionId,
      });

      console.log(
        "🚀 ~ file: issues.service.ts:930 ~ IssueService ~ on_issue_status_logistics ~ issueRequest:",
        issueRequest
      );

      const retailMessageId = issueRequest?.context?.message_id;

      const logisticsResponse: any = await logisticsService?.getLogistics(
        logisiticsMessageId,
        retailMessageId,
        "issue_status"
      );

      const retail_issue_status = logisticsResponse?.retail_issue_status;

      const logistics_on_issue_status =
        logisticsResponse?.logistics_on_issue_status;

      mergedIssueWithLogisticsRespondentAction = {
        context: {
          message_id: retailMessageId,
          timestamp: req?.body?.context?.timestamp,
          domain: "nic2004:52110",
          country: retail_issue_status?.[0]?.context?.country,
          city: retail_issue_status?.[0]?.context?.city,
          action: "on_issue_status",
          core_version: retail_issue_status?.[0].context.core_version,
          bap_uri: retail_issue_status?.[0].context.bap_uri,
          bap_id: retail_issue_status?.[0]?.context?.bap_id,
          bpp_id: `${process.env.BPP_ID}`,
          bpp_uri: `${process.env.BPP_URI}`,
          transaction_id: retail_issue_status?.[0]?.context?.transaction_id,
        },
        message: {
          issue: {
            ...retail_issue_status?.[0].message.issue,
            ...logistics_on_issue_status?.[0].message.issue,
            issue_actions: {
              respondent_actions: [
                ...logistics_on_issue_status?.[0]?.message?.issue?.issue_actions
                  ?.respondent_actions,
              ],
            },
          },
        },
      };

      await gatewayIssueService.on_issue_status({
        data: mergedIssueWithLogisticsRespondentAction,
        message_id: retailMessageId,
      });

      const issueSchema = {
        ...issueRequest,
        context: issueRequest.context,
        message: {
          issue: {
            ...issueRequest.message.issue,
            ...logistics_on_issue_status?.[0].message.issue,
            issue_actions: {
              ...issueRequest.message.issue.issue_actions,
              complainant_actions:
                issueRequest.message.issue.issue_actions.complainant_actions,
              respondent_actions: [
                ...logistics_on_issue_status?.[0]?.message?.issue?.issue_actions
                  ?.respondent_actions,
              ],
            },
          },
        },
      };
      console.log(
        "🚀 ~ file: issues.service.ts:995 ~ IssueService ~ on_issue_status_logistics ~ issueSchema:",
        issueSchema
      );

      // await dbServices.addOrUpdateIssueWithKeyValue({
      //   issueValueToFind: issueRequest.context.transaction_id,
      //   issueKeyToFind: "context.transaction_id",
      //   keyPathForUpdating: "message.issue",
      //   issueSchema,
      // });

      await dbServices.addOrUpdateIssueWithtransactionId(
        issueRequest.context.transaction_id,
        issueSchema
      );

      // await dbServices.findAndUpdateWholeDocument({
      //   transaction_id: issueRequest.context.transaction_id,
      //   data: {
      //     ...issueRequest,
      //     context: {
      //       ...issueRequest.context,
      //       ttl: issueRequest.context.ttl,
      //     },
      //     message: {
      //       issue: {
      //         ...issueRequest.message.issue,
      //         ...logistics_on_issue_status?.[0].message.issue,
      //         issue_actions: {
      //           ...issueRequest.message.issue.issue_actions,
      //           complainant_actions:
      //             issueRequest.message.issue.issue_actions.complainant_actions,
      //           respondent_actions: [
      //             ...logistics_on_issue_status?.[0]?.message?.issue
      //               ?.issue_actions?.respondent_actions,
      //           ],
      //         },
      //       },
      //     },
      //   },
      // });

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
