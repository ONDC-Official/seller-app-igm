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

      console.log(
        "🚀 ~ file: logistics.service.ts:14 ~ LogisticsService ~ issue_logistics ~ reponse:",
        reponse
      );
      return reponse;
    } catch (error) {
      logger.error(error);
      return JSON.stringify(error);
    }
  }
}

export default LogisticsService;
