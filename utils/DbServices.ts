import { Issue } from "../Model/issue";

interface IUpdateIssueWithDynamicID {
  issueKeyToFind?: "context.transaction_id";
  issueValueToFind: string | any;
  keyPathForUpdating: string | any;
  issueSchema: any;
}

class DbServices {
  /**
   * @param {String} transactionId
   * @param {Object} issueSchema
   */
  addOrUpdateIssueWithtransactionId = async (
    transactionId: string | any,
    issueSchema: object = {}
  ) => {
    return await Issue.updateOne(
      {
        "context.transaction_id": transactionId,
      },
      {
        $set: {
          "message.issue.issue_actions.complainant_actions": issueSchema,
        },
      },

      { upsert: true }
    );
  };

  addOrUpdateIssueWithKeyValue = async ({
    issueKeyToFind,
    issueValueToFind,
    keyPathForUpdating,
    issueSchema,
  }: IUpdateIssueWithDynamicID) => {
    return await Issue.updateOne(
      {
        [`${issueKeyToFind}`]: issueValueToFind,
      },
      {
        $set: {
          [`${keyPathForUpdating}`]: issueSchema,
        },
      },

      { upsert: true }
    );
  };

  findIssueWithPathAndValue = async ({
    value,
    key,
  }: {
    value: string;
    key: string;
  }) => {
    const issue: any = await Issue.findOne({
      [`${key}`]: value,
    });

    if (!issue) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    }
    return issue;
  };

  getIssueByTransactionId = async (transactionId: string) => {
    const issue: any = await Issue.findOne({
      "context.transaction_id": transactionId,
    });

    if (!issue) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    } else return issue;
  };
  getIssueByIssueId = async (issue_id: string) => {
    const issue: any = await Issue.findOne({
      "message.issue.id": issue_id,
    });

    if (!issue) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    } else return issue;
  };
}
export default DbServices;