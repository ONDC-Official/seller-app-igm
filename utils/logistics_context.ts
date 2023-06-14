import {
  IssueRequestLogistics,
  OmittedProviderNameFromItems,
} from "../interfaces/BaseInterface";

class LogisticsContext {
  issuePayload(issue: any) {
    const omittedArray: OmittedProviderNameFromItems =
      issue?.message?.issue?.order_details?.items.map(
        ({ product_name, ...rest }: any) => rest
      );

    const payload: IssueRequestLogistics = {
      context: {
        ...issue.context,
        bap_uri: `${process.env.BPP_URI}`,
        bap_id: `${process.env.BPP_ID}`,
      },
      message: {
        issue: {
          ...issue.message.issue,
          complainant_info: {
            ...issue.message.issue.complainant_info,
            person: {
              name: issue.message.issue.complainant_info.person.name,
            },
          },
          order_details: {
            ...issue.message.issue.order_details,
            fulfillments: issue.message.issue.order_details.fulfillments,
            id: issue.message.issue.order_details.id,
            items: omittedArray,
          },
        },
      },
    };

    return payload;
  }
}

export default LogisticsContext;
