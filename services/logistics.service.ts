import { logger } from "../shared/logger";
import HttpRequest from "../utils/request";

class LogisticsService {
  async issue_logistics(payload: any) {
    try {
      const issue_request = new HttpRequest(
        `${process.env.PROTOCOL_BASE_URL}/protocol/logistics/v1`,
        "/issue",
        "post",
        payload
      );
      const reponse = await issue_request.send();

      return reponse;
    } catch (error) {
      logger.error(error);
      return JSON.stringify(error);
    }
  }

  async issue_status_logistics(payload: any) {
    try {
      const issue_request = new HttpRequest(
        `${process.env.PROTOCOL_BASE_URL}/protocol/logistics/v1`,
        "/issue_status",
        "post",
        payload
      );
      const response = await issue_request.send();
      return response;
    } catch (error) {
      logger.error(error);
      return JSON.stringify(error);
    }
  }

  //get all logistics response from protocol layer
  async getLogistics(
    logisticsMessageId: string,
    retailMessageId: string,
    type: string
  ) {
    try {
      logger.info("info", `[Ondc Service] get logistics : param :`, {
        logisticsMessageId,
        retailMessageId,
        type,
      });

      let headers = {};
      let query = "";
      if (type === "issue") {
        query = `logisticsOnIssue=${logisticsMessageId}&issue=${retailMessageId}`;
      } else if (type === "issue_status") {
        query = `logisticsOnIssueStatus=${logisticsMessageId}&issue_status=${retailMessageId}`;
      }
      let httpRequest = new HttpRequest(
        process?.env?.BPP_URI,
        `/protocol/v1/response/network-request-payloads?${query}`,
        "get",
        {},
        headers
      );

      let result = await httpRequest.send();

      logger.info(
        "info",
        `[Ondc Service] get logistics : response :`,
        result?.data
      );

      return result?.data;
    } catch (e) {
      logger.error("error", `[Ondc Service] get logistics : response :`, e);
      return e;
    }
  }
}

export default LogisticsService;
