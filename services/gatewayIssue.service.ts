import DbServices from "../utils/DbServices";
import PostHttpRequest from "../utils/HttpRequest";
import {
  IssueRequest,
  OnIssue,
  OnIssueStatusResoloved,
  RespondentAction,
} from "../interfaces/BaseInterface";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../shared/logger";

const dbServices = new DbServices();
class GatewayIssueService {
  constructor() {
    this.on_issue = this.on_issue.bind(this);
    this.on_issue_status = this.on_issue_status.bind(this);
  }

  /**
   * Schedule a job for Processing issue after 5 minute
   * @param {*} created_at Date and Time when issue created
   */
  async scheduleAJob({
    transaction_id,
    payload,
  }: {
    transaction_id: string;
    payload: IssueRequest;
  }) {
    const onIssuePayload: OnIssue = {
      context: {
        domain: payload.context.domain,
        country: payload.context.country,
        city: payload.context.city,
        action: "on_issue_status",
        core_version: "1.0.0",
        bap_id: payload.context.bap_id,
        bap_uri: payload.context.bap_uri,
        bpp_id: payload.context.bpp_id,
        bpp_uri: payload.context.bpp_uri,
        transaction_id: payload.context.transaction_id,
        message_id: payload.context.message_id,
        timestamp: new Date().toISOString(),
      },
      message: {
        issue: {
          id: payload.message.issue.id,
          issue_actions: {
            respondent_actions: [
              {
                respondent_action: "PROCESSING",
                short_desc: "We are investigating your concern.",
                updated_at: new Date().toISOString(),
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
          created_at: payload.message.issue.created_at,
          updated_at: new Date().toISOString(),
        },
      },
    };

    try {
      dbServices.addOrUpdateIssueWithKeyValue({
        issueKeyToFind: "context.transaction_id",
        issueValueToFind: transaction_id,
        keyPathForUpdating: "message.issue.issue_actions.respondent_actions",
        issueSchema: [
          {
            respondent_action: "PROCESSING",
            short_desc: "We are investigating your concern.",
            updated_at: new Date(),
            updated_by: {
              org: {
                name: `${process.env.BPP_URI}::${process.env.DOMAIN}`,
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
      });

      const response = await this.on_issue(onIssuePayload);

      return response;
    } catch (error) {
      return error;
    }
  }

  /**
   * Convert ISO formatted date and return new date with added 5 mintue
   * @param {*} dateString    Date and Time "2023-05-28T15:30:30.349Z"
   */

  startProcessingBeforeExpectedTime(
    initialDateTime: string,
    duration: string
  ): string | null {
    const initialDate = new Date(initialDateTime);

    const durationPattern = /PT(\d+)H/;
    const match = duration.match(durationPattern);

    if (match) {
      const hours = parseInt(match[1]);
      const updatedDate = new Date(initialDate);
      updatedDate.setHours(updatedDate.getHours() + hours);

      // Subtract 1 minute
      updatedDate.setMinutes(updatedDate.getMinutes() - 1);

      return updatedDate.toISOString();
    } else {
      return null;
    }
  }

  /**
   * On_issue Api
   * @param {*} payload    payload object
   */

  async on_issue(payload: any) {
    const on_issue_payload: OnIssue = {
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
            respondent_actions:
              payload.message.issue.issue_actions.respondent_actions,
          },
          created_at: payload.message.issue.created_at,
          updated_at: new Date().toISOString(),
        },
      },
    };

    try {
      const createBug = new PostHttpRequest({
        url: "/on_issue",
        method: "post",
        data: on_issue_payload,
      });

      const response = await createBug.send();

      return response;
    } catch (e) {
      return e;
    }
  }

  hasResolvedAction(actions: RespondentAction[]) {
    return actions?.some(
      (item: RespondentAction) => item.respondent_action === "RESOLVED"
    );
  }

  /**
   * On_issue_status Api
   * @param {*} onIssueStatusData  payload object
   */
  async on_issue_status({
    data,
    message_id = uuidv4(),
  }: {
    data: any;
    message_id: string;
  }) {
    try {
      let onIssueStatusPayload: OnIssue | OnIssueStatusResoloved;

      if (
        this.hasResolvedAction(
          data?.message?.issue?.issue_actions?.respondent_actions
        )
      ) {
        onIssueStatusPayload = {
          context: {
            domain: data?.context?.domain,
            country: data?.context?.country,
            city: data?.context?.city,
            action: "on_issue_status",
            core_version: "1.0.0",
            bap_id: data?.context?.bap_id,
            bap_uri: data?.context?.bap_uri,
            bpp_id: data?.context?.bpp_id,
            bpp_uri: data?.context?.bpp_uri,
            transaction_id: data?.context?.transaction_id,
            message_id: message_id,
            timestamp: new Date().toISOString(),
          },
          message: {
            issue: {
              id: data?.message?.issue?.id,
              issue_actions: {
                respondent_actions:
                  data?.message?.issue?.issue_actions?.respondent_actions,
              },
              resolution: data?.message?.issue?.resolution,
              resolution_provider: data?.message?.issue?.resolution_provider,
              created_at: data?.message?.issue?.created_at,
              updated_at: data?.message?.issue?.updated_at,
            },
          },
        };
      } else {
        onIssueStatusPayload = {
          context: {
            domain: data?.context?.domain,
            country: data?.context?.country,
            city: data?.context?.city,
            action: "on_issue_status",
            core_version: "1.0.0",
            bap_id: data?.context?.bap_id,
            bap_uri: data?.context?.bap_uri,
            bpp_id: data?.context?.bpp_id,
            bpp_uri: data?.context?.bpp_uri,
            transaction_id: data?.context?.transaction_id,
            message_id: message_id,
            timestamp: new Date().toISOString(),
          },
          message: {
            issue: {
              id: data?.message?.issue?.id,
              issue_actions: {
                respondent_actions:
                  data?.message?.issue?.issue_actions?.respondent_actions,
              },
              created_at: data?.message?.issue?.created_at,
              updated_at: data?.message?.issue?.updated_at,
            },
          },
        };
      }

      const createBug = new PostHttpRequest({
        url: "/on_issue_status",
        method: "post",
        data: onIssueStatusPayload,
      });

      const response: any = await createBug.send();

      return response;
    } catch (error) {
      logger.error(error);
      return error;
    }
  }
}

export default GatewayIssueService;
