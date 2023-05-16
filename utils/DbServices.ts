import { Issue } from "../Model/issueSchema";

class DbServices {
  /**
   * @param {String} transactionId
   * @param {Object} issueSchema
   */
  addOrUpdateIssueWithtransactionId = async (
    transactionId: string | any,
    issueSchema: object = {}
  ) => {
    return await Issue.findOneAndUpdate(
      {
        "context.transaction_id": transactionId,
      },
      {
        ...issueSchema,
      },
      { upsert: true }
    );
  };

  getIssueByTransactionId = async (transactionId: string) => {
    const issue: any = await Issue.find({
      "context.transaction_id": transactionId,
    });

    if (!(issue || issue?.length)) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    } else return issue?.[0];
  };
}
export default DbServices;
