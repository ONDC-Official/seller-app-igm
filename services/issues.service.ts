import { Request, Response } from "express";
import axios from "axios";
import { logger } from "../shared/logger";
import { Issue } from "../model/issue";
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
import LogisticsSelectedRequest from "../model/SelectedLogistics";
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
  hasClosedAction(array: any[]) {
    return array?.some(
      (item: ComplainantAction) => item.complainant_action === "CLOSED"
    );
  }
  hasCascadedAction(array: any[]) {
    return array?.some(
      (item: RespondentAction) => item?.respondent_action === "CASCADED"
    );
  }
  async getItemDetails(items: Item[]) {
    const itemData = items?.map(async (item: Item) => {
      const res = await axios.get(
        `${process.env.SELLER_SERVER_URL}/api/v1/products/${item.id}/ondcGet`
      );
      return res.data;
    });
    const data = await Promise.all(itemData);
    return data;
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
    logger.info(issuePayload);

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
          issue.message.issue.created_at
        );

        await logisticsService.issue_logistics(payloadForLogistics);
      }

      let organizationDetails;
      if (issue?.status === 404) {
        // fetching the organization details from the DB
        const fetchedOrgDetails = await axios.get(
          `${process.env.SELLER_SERVER_URL}/api/v1/organizations/${issuePayload?.message?.issue?.order_details?.provider_id}/ondcGet`
        );

        organizationDetails = fetchedOrgDetails?.data?.providerDetail;
      }

      // create new issue if issues does not exist
      if (issue?.status === 404) {
        // fetching the products details
        const finalDatabasePayload: any = await this.getItemDetails(
          issuePayload?.message?.issue?.order_details.items
        );

        // adding and mapping the product name in the final payload
        const finalpayloadForItems =
          issuePayload?.message?.issue?.order_details?.items.map(
            (item: Item) => {
              const matchingItem = finalDatabasePayload?.find(
                (product: any) => product?._id === item?.id
              );

              if (matchingItem) {
                item.product_name = matchingItem?.productName;
              }
              return item;
            }
          );

        let orderDetail;
        // fetching the order details

        const orderDetails: any = await axios.get(
          `${process.env.SELLER_SERVER_URL}/api/v1/orders/${issuePayload?.message?.issue?.order_details?.id}/ondcGet`
        );

        orderDetail = orderDetails?.data;

        //schedule a job for sending respondant action processing after 5 min if Provider has not initiated
        Scheduler.scheduleJob(
          gatewayIssueService.startProcessingBeforeExpectedTime(
            issuePayload.message.issue.created_at,
            issuePayload.message.issue.expected_response_time.duration
          ),

          async () => {
            gatewayIssueService.scheduleAJob({
              payload: issuePayload,
              transaction_id: issuePayload.context.transaction_id,
            });
          }
        );

        let createIssuePayload: IssueRequest | undefined;
        if (
          item_subcategories.includes(issuePayload.message.issue.sub_category)
        ) {
          const issuePayloadLogisticsAndOn_issue: IssueRequest = {
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
                      updated_at: new Date().toISOString(),
                      updated_by: {
                        org: {
                          name: `${process.env.BPP_ID}::${issuePayload.context.domain}`,
                        },
                        contact: {
                          phone: organizationDetails.contactMobile,
                          email: organizationDetails.contactEmail,
                        },
                        person: {
                          name: organizationDetails.name,
                        },
                      },
                      cascaded_level: 1,
                    },
                    {
                      respondent_action: "CASCADED",
                      short_desc: "We have sent your request to logistics.",
                      updated_at: new Date().toISOString(),
                      updated_by: {
                        org: {
                          name: `${process.env.BPP_ID}::${issuePayload.context.domain}`,
                        },
                        contact: {
                          phone: organizationDetails.contactMobile,
                          email: organizationDetails.contactEmail,
                        },
                        person: {
                          name: organizationDetails.name,
                        },
                      },
                      cascaded_level: 2,
                    },
                  ],
                },
              },
            },
          };

          createIssuePayload = issuePayloadLogisticsAndOn_issue;

          const payloadForLogistics = await logisticsContext.issuePayload(
            issuePayloadLogisticsAndOn_issue,
            issuePayload.message.issue.created_at
          );

          createIssuePayload.logisticsTransactionId =
            payloadForLogistics.context.transaction_id;

          const response: any = await gatewayIssueService.on_issue(
            issuePayloadLogisticsAndOn_issue
          );

          console.log("this is the retail on_issue for logistics");

          if (response?.data.message?.ack?.status === "ACK") {
            await logisticsService.issue_logistics(payloadForLogistics);
            await Scheduler.gracefulShutdown();
          }
        } else {
          const selectRequest = await LogisticsSelectedRequest.findOne({
            where: {
              transactionId: issuePayload?.context?.transaction_id,
              providerId: issuePayload.message.issue.order_details.provider_id,
            },
            order: [["createdAt", "DESC"]],
          });

          const logisticsTransactionId =
            selectRequest?.getDataValue("selectedLogistics")?.context
              ?.transaction_id;

          createIssuePayload = {
            context: {
              ...issuePayload.context,
              timestamp: new Date().toISOString(),
              action: "on_issue",
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
                    issuePayload.message.issue.issue_actions
                      .complainant_actions,
                  respondent_actions: [
                    {
                      respondent_action: "PROCESSING",
                      short_desc: "We are investigating your concern.",
                      updated_at: new Date().toISOString(),
                      updated_by: {
                        org: {
                          name: `${process.env.BPP_ID}::${issuePayload.context.domain}`,
                        },
                        contact: {
                          phone: organizationDetails.contactMobile,
                          email: organizationDetails.contactEmail,
                        },
                        person: {
                          name: organizationDetails.name,
                        },
                      },
                      cascaded_level: 0,
                    },
                  ],
                },
              },
            },
            logisticsTransactionId: logisticsTransactionId,
            orgEmail: organizationDetails.contactEmail,
            orgName: organizationDetails.name,
            orgMobile: organizationDetails.contactMobile,
          };

          const response: any = await gatewayIssueService.on_issue(
            createIssuePayload
          );

          console.log("this is the on_issue for non-logistics");

          if (response?.data.message?.ack?.status === "ACK") {
            await Scheduler.gracefulShutdown();
          } else {
            logger.info("No ACK recived for on_issue", response.data);
          }
        }

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

          if (issuePayload.message.issue.status === "CLOSED") {
            await bugzillaService.updateIssueInBugzilla({
              resolved: true,
              transaction_id: issue?.context?.transaction_id,
              issue_actions: {
                ...issue?.message?.issue?.issue_actions,
                ...issuePayload?.message?.issue?.issue_actions,
              },
            });
          }
        } catch (e) {
          logger.info(e);
        }
        return res.status(200).send({
          status: 200,
          success: true,
          message: { ack: { status: "ACK" } }, // WARN: This should be a ack builder
        });
      }

      const complaintActionLength =
        issuePayload.message?.issue.issue_actions.complainant_actions.length;

      // hit on_issue if any issue complainent action contains ESCALTED

      if (complaintActionLength !== 0) {
        console.log(
          'complaint?.complainant_action === "ESCALATE" &&',
          issuePayload.message.issue.status !== "CLOSED"
        );
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
                  issue_type: "GRIEVANCE",
                  issue_actions: {
                    respondent_actions: [
                      ...issue?.message?.issue?.issue_actions
                        ?.respondent_actions,
                      {
                        respondent_action: "PROCESSING",
                        short_desc: "We are looking into your concern.",
                        updated_at: new Date().toISOString(),
                        updated_by: {
                          org: {
                            name: `${process.env.BPP_ID}::${issuePayload.context.domain}`,
                          },
                          contact: {
                            phone: issue.orgMobile,
                            email: issue.orgEmail,
                          },
                          person: {
                            name: issue.orgName,
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
                  updated_at: issuePayload.message.issue.updated_at,
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

      if (
        this.hasClosedAction(
          issuePayload?.message?.issue.issue_actions.complainant_actions
        )
      ) {
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

      const dbQuery = {
        "message.issue.order_details.provider_id":
          req.body?.user?.user?.organization,
      };

      // if organization ID exist in token return specific providers complaints only
      if (req.body?.user?.user?.organization) {
        const specificProviderIssue = await Issue.find(dbQuery)
          .sort({ "message.issue.created_at": -1 })
          .skip(query.offset * query.limit)
          .limit(query.limit);

        const count = await Issue.find(dbQuery).count();

        if (specificProviderIssue?.length === 0) {
          return res
            .status(200)
            .send({ message: "There is no issue", issues: [] });
        }

        return res.status(200).send({
          success: true,
          issues: specificProviderIssue,
          count,
        });
      }

      // return all issues is Super Admin
      if (req.body?.user?.user?.role?.name === "Super Admin") {
        const allIssues = await Issue.find()
          .sort({ "message.issue.created_at": -1 })
          .skip(query.offset * query.limit)
          .limit(query.limit)
          .lean();

        const count = await Issue.find().count();

        if (allIssues?.length === 0) {
          return res
            .status(200)
            .send({ message: "There is no issue", issues: [] });
        }

        return res.status(200).send({
          success: true,
          issues: allIssues,
          count,
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
    let response;
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
        updated_at: new Date().toISOString(),
        updated_by: {
          org: {
            name: `${process.env.BPP_ID}::${req.body.domain}`,
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

      if (
        fetchedIssueFromDataBase.message.issue.issue_actions.respondent_actions
          .length === 0
      ) {
        response = await gatewayIssueService.on_issue(payloadForResolvedissue);
      } else {
        response = await gatewayIssueService.on_issue_status({
          data: payloadForResolvedissue,
          message_id: uuid(),
        });
      }

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

        if (payload.respondent_action === "CASCADED") {
          this.issueResponseCasecaded({
            issuePayload: fetchedIssueFromDataBase,
          });
        }

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
      if (!req?.body?.message) return Error("Issue is not found");

      const issue_id = req.body.message.issue_id;

      const { message_id } = req.body.context;

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
      if (
        this.hasCascadedAction(
          result?.message?.issue?.issue_actions?.respondent_actions
        )
      ) {
      const selectRequest = await LogisticsSelectedRequest.findOne({
        where: {
          transactionId: result?.context?.transaction_id,
          providerId: result?.message?.issue?.order_details.provider_id,
        },
        order: [["createdAt", "DESC"]],
      });

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
          timestamp: new Date().toISOString(),
        },
        message: {
          issue_id: issue_id,
        },
      };


        await dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "message.issue.id",
          issueValueToFind: issue_id,
          keyPathForUpdating: "context.message_id",
          issueSchema: message_id,
        });

        await logisticsService.issue_status_logistics(payloadForLogistic);
      } else {
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
        message_id: logisticsMessageId,
        transaction_id: logisticsTransactionId,
      } = req?.body.context;

      const issueRequest: any = await Issue.findOne({
        logisticsTransactionId: logisticsTransactionId,
      });

      const retailMessageId = issueRequest?.context?.message_id;

      const logisticsResponse: any = await logisticsService?.getLogistics(
        logisticsMessageId,
        retailMessageId,
        "issue"
      );

      console.log(
        "on_issue_logistics recieved from logistics =====>",
        req.body
      );

      const retail_issue = logisticsResponse?.retail_issue;
      const logistics_on_issue = logisticsResponse?.logistics_on_issue;

      const mergedIssueWithLogistics: OnIssue = {
        context: {
          message_id: uuid(),
          timestamp: req?.body?.context?.timestamp,
          domain: issueRequest?.context?.domain,
          country: retail_issue?.[0]?.context?.country,
          city: retail_issue?.[0]?.context?.city,
          action: "on_issue",
          core_version: retail_issue?.[0].context.core_version,
          bap_uri: retail_issue?.[0].context.bap_uri,
          bap_id: retail_issue?.[0]?.context?.bap_id,
          bpp_id: `${process.env.BPP_ID}`,
          bpp_uri: `${process.env.BPP_URI}`,
          transaction_id: retail_issue?.[0]?.context?.transaction_id,
        },
        message: {
          issue: {
            ...issueRequest.message.issue,
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
        context: {
          ...mergedIssueWithLogistics.context,
          ttl: issueRequest.context.ttl,
        },
        message: {
          issue: {
            ...mergedIssueWithLogistics.message.issue,
            order_details: issueRequest.message.issue.order_details,
            issue_actions: {
              ...mergedIssueWithLogistics.message.issue.issue_actions,
              complainant_actions:
                issueRequest.message.issue.issue_actions.complainant_actions,
            },
          },
        },
        logisticsTransactionId: issueRequest.logisticsTransactionId,
      };

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
      console.log(e);
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
        message_id: logisiticsMessageId,
        transaction_id: logisticsTransactionId,
      } = req?.body.context;

      const issueRequest: any = await Issue.findOne({
        logisticsTransactionId: logisticsTransactionId,
      });

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
          domain: issueRequest?.context?.domain,
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

      await dbServices.addOrUpdateIssueWithtransactionId(
        issueRequest.context.transaction_id,
        issueSchema
      );

      return res.status(200).send({
        context: null,
        message: {
          ack: {
            status: "ACK",
          },
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        error: true,
        message: JSON.stringify(e) || "Something went wrong",
      });
    }
  }

  /// Utility Function for Issue Service

  //  creating payload for on_issue_status for "PROCESSING","REFUND" and other Cases

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
          action: "on_issue",
          bpp_uri: process.env.BPP_URI || "",
          core_version: "1.0.0",
          timestamp: new Date().toISOString(),
          message_id: fetchedIssueFromDataBase.context.message_id,
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
                  updated_at: new Date().toISOString(),
                  updated_by: {
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    org: {
                      name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
                    },
                    person: { name: payload.updated_by.person.name },
                  },
                },
              ],
            },
            updated_at: new Date().toISOString(),
          },
        },
      };
    } else if (payload?.action_triggered === "REFUND") {
      payloadForResolvedissue = {
        context: {
          ...fetchedIssueFromDataBase.context,
          action: "on_issue_status",
          core_version: "1.0.0",
          timestamp: new Date().toISOString(),
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
                  updated_at: new Date().toISOString(),
                  updated_by: {
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    org: {
                      name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
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
                    name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
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
            updated_at: new Date().toISOString(),
          },
        },
      };
    } else {
      payloadForResolvedissue = {
        context: {
          ...fetchedIssueFromDataBase.context,
          action: "on_issue_status",
          core_version: "1.0.0",
          timestamp: new Date().toISOString(),
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
                  updated_at: new Date().toISOString(),
                  updated_by: {
                    contact: {
                      email: payload.updated_by.contact.email,
                      phone: payload.updated_by.contact.phone,
                    },
                    org: {
                      name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
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
                    name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
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
            updated_at: new Date().toISOString(),
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
              name: `${process.env.BPP_ID}::${fetchedIssueFromDataBase.context.domain}`,
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
      updated_at: new Date().toISOString(),
    };
  }

  async issueResponseCasecaded({ issuePayload }: { issuePayload: any }) {
    try {
      // fetching the organization details from the DB
      const fetchedOrgDetails = await axios.get(
        `${process.env.SELLER_SERVER_URL}/api/v1/organizations/${issuePayload?.message?.issue?.order_details?.provider_id}/ondcGet`
      );

      const organizationDetails = fetchedOrgDetails?.data?.providerDetail;

      console.log(
        "🚀 ~ file: issues.service.ts:130 ~ IssueService ~ createIssue ~ organizationDetails:",
        JSON.stringify(organizationDetails)
      );

      const issuePayloadLogisticsAndOn_issue = {
        context: { ...issuePayload.context },
        message: {
          issue: {
            ...issuePayload?.message?.issue,
            issue_actions: {
              ...issuePayload?.message?.issue?.issue_actions,
              respondent_actions: [
                ...issuePayload?.message?.issue?.issue_actions
                  .respondent_actions,
                {
                  respondent_action: "CASCADED",
                  short_desc: "We have sent your request to logistics.",
                  updated_at: new Date().toISOString(),
                  updated_by: {
                    org: {
                      name: `${process.env.BPP_ID}::${issuePayload.context.domain}`,
                    },
                    contact: {
                      phone: organizationDetails.contactMobile,
                      email: organizationDetails.contactEmail,
                    },
                    person: {
                      name: organizationDetails.name,
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
        issuePayload.message.issue.created_at
      );

      const response: any = await logisticsService.issue_logistics(
        payloadForLogistics
      );

      if (response?.data?.message?.ack?.status === "ACK") {
        await dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "context.transaction_id",
          issueValueToFind: issuePayload.context.transaction_id,
          keyPathForUpdating: "message.issue.issue_actions.respondent_actions",
          issueSchema:
            payloadForLogistics.message.issue.issue_actions.respondent_actions,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
}

export default IssueService;
