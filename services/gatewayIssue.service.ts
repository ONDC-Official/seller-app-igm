import Scheduler from "node-schedule";
import DbServices from "../utils/DbServices";
import PostHttpRequest from "../utils/HttpRequest";
import { IOnIssue } from "../interfaces/on.issue";
import { IIssue } from "../interfaces/issue";

const dbServices = new DbServices();
class GatewayIssueService {
  constructor() {
    this.scheduleAJob = this.scheduleAJob.bind(this);
    this.on_issue = this.on_issue.bind(this);
  }

  currentDate = new Date();

  async scheduleAJob({
    created_at,
    transaction_id,
    payload,
  }: {
    created_at: string;
    transaction_id: string;
    payload: IIssue;
  }) {
    Scheduler.scheduleJob(
      this.startProcessingIssueAfter5Minutes(created_at),
      async () => {
        dbServices.addOrUpdateIssueWithKeyValue({
          issueKeyToFind: "context.transaction_id",
          issueValueToFind: transaction_id,
          keyPathForUpdating: "message.issue.issue_actions.respondent_actions",
          issueSchema: {
            respondent_action: "PROCESSING",
            short_desc: "We are investigating your concern.",
            updated_at: this.currentDate,
            updated_by: {
              org: {
                name: "ondc-tech-support-buyer-app.ondc.org::nic2004:52110",
              },
              contact: {
                phone: "6239083807",
                email: "Rishabhnand.singh@ondc.org",
              },
              person: {
                name: "Rishabhnand Singh",
              },
            },
          },
        });

        const response = await this.on_issue(payload);

        return response;
      }
    );
  }

  startProcessingIssueAfter5Minutes(dateString: string) {
    const dateObj = new Date(dateString);

    // Add 5 minutes to the Date object
    dateObj.setTime(dateObj.getTime() + 1 * 60000); // 5 minutes = 5 * 60 seconds * 1000 milliseconds

    // Convert the new Date object back to the ISO 8601 format
    const newDateString = dateObj.toISOString();

    return newDateString;
  }

  async on_issue(onIssueData: IIssue) {
    const onIssuePayload: IOnIssue = {
      context: {
        domain: onIssueData.context.domain,
        country: onIssueData.context.country,
        city: onIssueData.context.city,
        action: "on_issue",
        core_version: "1.0.0",
        bap_id: onIssueData.context.bap_id,
        bap_uri: onIssueData.context.bap_uri,
        bpp_id: onIssueData.context.bpp_id,
        bpp_uri: onIssueData.context.bpp_uri,
        transaction_id: onIssueData.context.transaction_id,
        message_id: onIssueData.context.message_id,
        timestamp: onIssueData.context.timestamp,
      },
      message: {
        issue: {
          id: onIssueData.message.issue.id,
          issue_actions: {
            respondent_actions:
              onIssueData.message.issue.issue_actions.respondent_actions,
          },
          created_at: onIssueData.message.issue.created_at,
          updated_at: this.currentDate.toISOString(),
        },
      },
    };

    const createBug = new PostHttpRequest({
      url: "/on_issue",
      method: "post",
      data: onIssuePayload,
    });

    const response: any = await createBug.send();

    return response;
  }

  async on_issue_status(onIssueStatusData: IIssue) {
    console.log("onIssueStatusData", onIssueStatusData);

    const onIssueStatusPayload = {
      context: {
        domain: onIssueStatusData.context.domain,
        country: "IND",
        city: "std:080",
        action: "on_issue",
        core_version: "1.0.0",
        bap_id: "abc.interfacingapp.com",
        bap_uri: "https://abc.buyerapp.com/ondc",
        bpp_id: "xyz.sellerapp.com",
        bpp_uri: "https://xyz.sellerapp.com/ondc",
        transaction_id: "T1",
        message_id: "M6",
        timestamp: "2023-01-15T10:15:15.932Z",
      },
      message: {
        issue: {
          id: "I2",
          issue_actions: {
            respondent_actions: [
              {
                respondent_action: "PROCESSING",
                short_desc: "Complaint is being processed",
                updated_at: "2023-01-15T10:04:01.812Z",
                updated_by: {
                  org: {
                    name: "xyz.sellerapp.com::ONDC:RET10",
                  },
                  contact: {
                    phone: "9960394039",
                    email: "transactioncounterpartyapp@tcapp.com",
                  },
                  person: {
                    name: "James Doe",
                  },
                },
                cascaded_level: 1,
              },
              {
                respondent_action: "CASCADED",
                short_desc: "Complaint cascaded",
                updated_at: "2023-01-15T10:05:00.267Z",
                updated_by: {
                  org: {
                    name: "xyz.sellerapp.com::nic2004:60232",
                  },
                  contact: {
                    phone: "9960394039",
                    email: "transactioncounterpartyapp@tcapp.com",
                  },
                  person: {
                    name: "James Doe",
                  },
                },
                cascaded_level: 2,
              },
              {
                respondent_action: "PROCESSING",
                short_desc: "Complaint is being processed",
                updated_at: "2023-01-15T10:15:15.932Z",
                updated_by: {
                  org: {
                    name: "lmn.logisticssellerapp.counterpary.com::nic2004:60232",
                  },
                  contact: {
                    phone: "9971394047",
                    email: "cascadedcounterpartyapp@cascadapp.com",
                  },
                  person: {
                    name: "Jimmy Doe",
                  },
                },
                cascaded_level: 2,
              },
            ],
          },
          created_at: "2023-01-15T10:00:00.469Z",
          updated_at: "2023-01-15T10:15:15.932Z",
        },
      },
    };

    const createBug = new PostHttpRequest({
      url: "/on_issue_status",
      method: "post",
      data: onIssueStatusPayload,
    });

    const response: any = await createBug.send();

    return response;
  }
}

export default GatewayIssueService;
