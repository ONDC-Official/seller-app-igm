import Scheduler from "node-schedule";
import DbServices from "../utils/DbServices";
import PostHttpRequest from "../utils/HttpRequest";
import { IssueRequest, OnIssue } from "../interfaces/BaseInterface";

const dbServices = new DbServices();
class GatewayIssueService {
  constructor() {
    this.scheduleAJob = this.scheduleAJob.bind(this);
    this.on_issue = this.on_issue.bind(this);
    this.on_issue_status = this.on_issue_status.bind(this);
  }

  /**
   * Schedule a job for Processing issue after 5 minute
   * @param {*} created_at    Date and Time when issue created
   * @param {*} transaction_id    issue Transaction ID
   * @param {*} payload   for On_issue Payload Object
   */

  async scheduleAJob({
    created_at,
    transaction_id,
    payload,
  }: {
    created_at: string;
    transaction_id: string;
    payload: IssueRequest;
  }) {
    Scheduler.scheduleJob(
      this.startProcessingIssueAfter5Minutes(created_at),

      async () => {
        const onIssuePayload: OnIssue = {
          context: {
            domain: payload.context.domain,
            country: payload.context.country,
            city: payload.context.city,
            action: "on_issue",
            core_version: "1.0.0",
            bap_id: payload.context.bap_id,
            bap_uri: payload.context.bap_uri,
            bpp_id: payload.context.bpp_id,
            bpp_uri: payload.context.bpp_uri,
            transaction_id: payload.context.transaction_id,
            message_id: payload.context.message_id,
            timestamp: payload.context.timestamp,
          },
          message: {
            issue: {
              id: payload.message.issue.id,
              issue_actions: {
                respondent_actions: [
                  {
                    respondent_action: "PROCESSING",
                    short_desc: "We are investigating your concern.",
                    updated_at: new Date(),
                    updated_by: {
                      org: {
                        name: `${process.env.BPP_URI}}::nic2004:52110`,
                      },
                      contact: {
                        phone: "6239083807",
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
              created_at: payload.message.issue.created_at,
              updated_at: new Date(),
            },
          },
        };

        try {
          dbServices.addOrUpdateIssueWithKeyValue({
            issueKeyToFind: "context.transaction_id",
            issueValueToFind: transaction_id,
            keyPathForUpdating:
              "message.issue.issue_actions.respondent_actions",
            issueSchema: {
              respondent_action: "PROCESSING",
              short_desc: "We are investigating your concern.",
              updated_at: new Date(),
              updated_by: {
                org: {
                  name: `${process.env.BPP_URI}}::nic2004:52110`,
                },
                contact: {
                  phone: "6239083807",
                  email: "Rishabhnand.singh@ondc.org",
                },
                person: {
                  name: "Rishabhnand Singh",
                },
                cascaded_level: 1,
              },
            },
          });

          const response = await this.on_issue({ onIssueData: onIssuePayload });

          return response;
        } catch (error) {
          return error;
        }
      }
    );
  }

  /**
   * Convert ISO formatted date and return new date with added 5 mintue
   * @param {*} dateString    Date and Time "2023-05-28T15:30:30.349Z"
   */

  startProcessingIssueAfter5Minutes(dateString: string) {
    const dateObj = new Date(dateString);

    // Add 5 minutes to the Date object
    dateObj.setTime(dateObj.getTime() + 0.1 * 60000); // 5 minutes = 5 * 60 seconds * 1000 milliseconds

    // Convert the new Date object back to the ISO 8601 format
    const newDateString = dateObj.toISOString();

    return newDateString;
  }

  /**
   * On_issue Api
   * @param {*} onIssueData    payload object
   */

  async on_issue({ onIssueData }: { onIssueData: any }) {
    try {
      const createBug = new PostHttpRequest({
        url: "/on_issue",
        method: "post",
        data: onIssueData,
      });

      const response: any = await createBug.send();

      return response;
    } catch (e) {
      return e;
    }
  }

  /**
   * On_issue_status Api
   * @param {*} onIssueStatusData  payload object
   */
  async on_issue_status(onIssueStatusData: any) {
    const onIssueStatusPayload: OnIssue = {
      context: {
        domain: onIssueStatusData.context.domain,
        country: onIssueStatusData.context.country,
        city: onIssueStatusData.context.city,
        action: "on_issue_status",
        core_version: "1.0.0",
        bap_id: onIssueStatusData.context.bap_id,
        bap_uri: onIssueStatusData.context.bap_uri,
        bpp_id: onIssueStatusData.context.bpp_id,
        bpp_uri: onIssueStatusData.context.bpp_uri,
        transaction_id: onIssueStatusData.context.transaction_id,
        message_id: onIssueStatusData.context.message_id,
        timestamp: onIssueStatusData.context.timestamp,
      },
      message: {
        issue: {
          id: onIssueStatusData.message.issue.id,
          issue_actions: {
            respondent_actions:
              onIssueStatusData.message.issue.issue_actions.respondent_actions,
          },
          created_at: onIssueStatusData.message.issue.created_at,
          updated_at: onIssueStatusData.message.issue.updated_at,
        },
      },
    };

    try {
      const createBug = new PostHttpRequest({
        url: "/on_issue_status",
        method: "post",
        data: onIssueStatusPayload,
      });

      const response: any = await createBug.send();

      return response;
    } catch (error) {
      return error;
    }
  }
}

export default GatewayIssueService;
