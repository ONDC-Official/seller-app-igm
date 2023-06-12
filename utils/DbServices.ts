import { Organization } from "../Model/organization";
import { Issue } from "../Model/issue";
import { Product } from "../Model/product";
import { Order } from "../Model/order";

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

  findOrganizationWithId = async ({
    organizationId,
  }: {
    organizationId: string;
  }) => {
    const organization: any = await Organization.findOne({
      _id: organizationId,
    });

    if (!organization) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    }
    return organization;
  };

  findProductWithItemId = async ({ itemIds }: { itemIds: string[] }) => {
    const products: any = await Product.find({ _id: { $in: itemIds } });

    if (!products) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    }
    return products;
  };

  findOrderWithIdFromIssueRequest = async ({
    orderIdFromIssue,
  }: {
    orderIdFromIssue: string;
  }) => {
    const order: any = await Order.findOne({
      orderId: orderIdFromIssue,
    });

    if (!order) {
      return {
        status: 404,
        name: "NO_RECORD_FOUND_ERROR",
        message: "Record not found",
      };
    }
    return order;
  };
}
export default DbServices;
