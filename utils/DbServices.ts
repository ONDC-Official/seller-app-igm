import { Issue } from "../Model/issue";

interface IUpdateIssueWithDynamicID {
  issueKeyToFind?: "context.transaction_id";
  issueValueToFind: string | any;
  keyPathForUpdating: string | any;
  issueSchema: any;
}

class DbServices {
  /**
   * issue_status
   * @param {*} issueKeyToFind    key is required for searching
   * @param {*} issueValueToFind    value for the above key that will help
   * @param {*} keyPathForUpdating   defining a key where data needs to be added
   * @param {*} issueSchema   data that need to be added
   */
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

  /**
   * issue_status
   * @param {*} key  key is required for searching
   * @param {*} value    value for the above key that will help
   */

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
}
export default DbServices;
