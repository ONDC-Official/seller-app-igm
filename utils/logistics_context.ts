import { v4 as uuid } from "uuid";
import {
  IssueRequestLogistics,
  IssueRequestLogisticsResolved,
  OmittedProviderNameFromItems,
  RespondentAction,
} from "../interfaces/BaseInterface";
import LogisticsSelectedRequest from "../model/SelectedLogistics";

class LogisticsContext {
  hasResolvedAction(array: any[]) {
    return array?.some(
      (item: RespondentAction) => item.respondent_action === "RESOLVED"
    );
  }

  hasKey(obj: object, key: string): boolean {
    return key in obj;
  }

  async issuePayload(
    issue: any,
    created_at: string,
    _logisticsTransactionID?: string
  ) {
    const omittedArray: OmittedProviderNameFromItems =
      issue?.message?.issue?.order_details?.items?.map(
        ({ product_name, ...rest }: any) => rest
      );

    let selectRequest;

    selectRequest = await LogisticsSelectedRequest.findOne({
      where: {
        transactionId: issue?.context?.transaction_id,
        providerId: issue.message.issue.order_details.provider_id,
      },
      order: [["createdAt", "DESC"]],
    });

    const logistics_TransactionID =
      selectRequest?.getDataValue("selectedLogistics")?.context?.transaction_id;
    console.log(
      "🚀 ~ file: logistics_context.ts:42 ~ LogisticsContext ~ logistics_TransactionID:",
      logistics_TransactionID
    );

    if (
      this.hasResolvedAction(
        issue?.message?.issue?.issue_actions?.respondent_actions
      ) &&
      this.hasKey(issue?.message?.issue, "resolution_provider")
    ) {
      const issuePayload: IssueRequestLogisticsResolved = {
        context: {
          domain:
            selectRequest?.getDataValue("selectedLogistics")?.context?.domain,
          country: issue?.context?.country,
          city: issue?.context?.city,
          action: "issue",
          core_version: issue?.context?.core_version,
          bap_uri: `${process.env.BPP_URI}`,
          bap_id: `${process.env.BPP_ID}`,
          bpp_uri:
            selectRequest?.getDataValue("selectedLogistics")?.context?.bpp_uri,
          bpp_id:
            selectRequest?.getDataValue("selectedLogistics")?.context?.bpp_id,
          transaction_id: logistics_TransactionID,
          timestamp: new Date().toISOString(),
          message_id: uuid(),
          ttl: issue?.context.ttl,
        },
        message: {
          issue: {
            id: issue?.message?.issue?.id,
            category: issue?.message?.issue?.category,
            sub_category: issue?.message?.issue?.sub_category,
            complainant_info: {
              person: {
                name: issue?.message?.issue?.complainant_info.person.name,
              },
              contact: {
                phone: issue?.message?.issue?.complainant_info.contact.phone,
                email: issue?.message?.issue?.complainant_info.contact.email,
              },
            },
            order_details: {
              id: issue?.message?.issue?.order_details.id,
              state: issue?.message?.issue?.order_details?.state,
              items: omittedArray,
              fulfillments: issue?.message?.issue?.order_details?.fulfillments,
              provider_id: issue?.message?.issue?.order_details?.provider_id,
              merchant_order_id:
                issue?.message?.issue?.order_details?.merchant_order_id || "",
            },
            description: {
              short_desc: issue?.message?.issue?.description?.short_desc,
              long_desc: issue?.message?.issue?.description?.long_desc,
              additional_desc: {
                url: issue?.message?.issue?.description?.additional_desc?.url,
                content_type:
                  issue?.message?.issue?.description?.additional_desc
                    ?.content_type,
              },
              images: issue?.message?.issue?.description?.images,
            },
            source: {
              network_participant_id:
                issue?.message?.issue?.source?.network_participant_id,
              type: "SELLER",
            },
            expected_response_time: {
              duration: issue?.message?.issue?.expected_response_time.duration,
            },
            expected_resolution_time: {
              duration:
                issue?.message?.issue?.expected_resolution_time.duration,
            },
            resolution: issue.message.issue.resolution,
            resolution_provider: issue.message.issue.resolution_provider,
            status: issue?.message?.issue?.status,
            issue_type: issue?.message?.issue?.issue_type,
            issue_actions: {
              complainant_actions:
                issue?.message?.issue?.issue_actions.complainant_actions,
              respondent_actions:
                issue?.message?.issue?.issue_actions.respondent_actions,
            },
            created_at: created_at,
            updated_at: new Date().toISOString(),
          },
        },
      };

      return issuePayload;
    } else {
      const issuePayload: IssueRequestLogistics = {
        context: {
          domain:
            selectRequest?.getDataValue("selectedLogistics")?.context?.domain,
          country: issue?.context?.country,
          city: issue?.context?.city,
          action: "issue",
          core_version: issue?.context?.core_version,
          bap_uri: `${process.env.BPP_URI}`,
          bap_id: `${process.env.BPP_ID}`,
          bpp_uri:
            selectRequest?.getDataValue("selectedLogistics")?.context.bpp_uri,
          bpp_id:
            selectRequest?.getDataValue("selectedLogistics")?.context.bpp_id,
          transaction_id: logistics_TransactionID,
          timestamp: new Date().toISOString(),
          message_id: uuid(),
          ttl: issue?.context.ttl,
        },
        message: {
          issue: {
            id: issue?.message?.issue?.id,
            category: issue?.message?.issue?.category,
            sub_category: issue?.message?.issue?.sub_category,
            complainant_info: {
              person: {
                name: issue?.message?.issue?.complainant_info.person.name,
              },
              contact: {
                phone: issue?.message?.issue?.complainant_info.contact.phone,
                email: issue?.message?.issue?.complainant_info.contact.email,
              },
            },
            order_details: {
              id: issue?.message?.issue?.order_details.id,
              state: issue?.message?.issue?.order_details?.state,
              items: omittedArray,
              fulfillments: issue?.message?.issue?.order_details?.fulfillments,
              provider_id: issue?.message?.issue?.order_details?.provider_id,
              merchant_order_id:
                issue?.message?.issue?.order_details?.merchant_order_id || "",
            },
            description: {
              short_desc: issue?.message?.issue?.description?.short_desc,
              long_desc: issue?.message?.issue?.description?.long_desc,
              additional_desc: {
                url: issue?.message?.issue?.description?.additional_desc?.url,
                content_type:
                  issue?.message?.issue?.description?.additional_desc
                    ?.content_type,
              },
              images: issue?.message?.issue?.description?.images,
            },
            source: {
              network_participant_id:
                issue?.message?.issue?.source?.network_participant_id,
              type: "SELLER",
            },
            expected_response_time: {
              duration: issue?.message?.issue?.expected_response_time.duration,
            },
            expected_resolution_time: {
              duration:
                issue?.message?.issue?.expected_resolution_time.duration,
            },
            status: issue?.message?.issue?.status,
            issue_type: issue?.message?.issue?.issue_type,
            issue_actions: {
              complainant_actions:
                issue?.message?.issue?.issue_actions.complainant_actions,
              respondent_actions:
                issue?.message?.issue?.issue_actions.respondent_actions,
            },
            created_at: created_at,
            updated_at: new Date().toISOString(),
          },
        },
      };
      console.log(
        "🚀 ~ file: logistics_context.ts:240 ~ LogisticsContext ~ issuePayload:",
        issuePayload
      );

      return issuePayload;
    }
  }
}

export default LogisticsContext;
