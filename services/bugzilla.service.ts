import { logger } from "../shared/logger";

import HttpRequest from "../utils/request";
import { IssueActions } from "../interfaces/BaseInterface";
import { BugzillaIssueProps } from "../interfaces/bugzilla_interfaces";

class BugzillaService {
  constructor() {
    this.createIssueInBugzilla = this.createIssueInBugzilla.bind(this);
    this.updateIssueInBugzilla = this.updateIssueInBugzilla.bind(this);
  }

  async createIssueInBugzilla({
    issue,
    issue_Actions,
  }: {
    issue: BugzillaIssueProps;
    issue_Actions: IssueActions;
  }) {
    try {
      const payload = {
        product: issue?.product,
        summary: issue?.summary,
        alias: issue.transaction_id,
        bpp_id: issue?.bpp_id,
        bpp_name: issue?.bpp_name,
        attachments: issue?.attachments || [],
        action: issue_Actions,
      };

      const apiCall = new HttpRequest(
        process.env.BUGZILLA_SERVICE_URI,
        "/create",
        "POST",
        {
          ...payload,
        }
      );
      const result = await apiCall.send();

      if (result.status === 201) {
        logger.info("Created issue in Bugzilla");
        return result.data;
      }
    } catch (error: any) {
      logger.info("Error in creating issue in Bugzilla ", error?.data?.message);
      return error;
    }
  }

  async updateIssueInBugzilla({
    transaction_id,
    issue_actions,
    resolved = false,
  }: {
    transaction_id: string;
    issue_actions: IssueActions;
    resolved: boolean;
  }) {
    try {
      const apiCall = new HttpRequest(
        process.env.BUGZILLA_SERVICE_URI,
        `/updateBug/${transaction_id}`,
        "PUT",
        {
          status: resolved ? "RESOLVED" : "CONFIRMED",
          action: issue_actions,
        }
      );
      const result = await apiCall.send();
      if (result.status === 200) {
        logger.info("Issue updated in Bugzilla");
      }
    } catch (error) {
      logger.info("Error in updating issue in Bugzilla", error);
      return error;
    }
  }
}

export default BugzillaService;
