import { Response, Request, NextFunction } from "express";
import { logger } from "../shared/logger";
import IssueService from "../services/issus.service";

const issueService = new IssueService();

class IssueController {
  /**
   * issue_status
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   * @param {*} next   Callback argument to the middleware function
   */
  async createIssue(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      const data = await issueService.createIssue(req, res);

      res.status(201).send({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * issue_status
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   * @param {*} next   Callback argument to the middleware function
   */

  async getAllIssues(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      const data = await issueService.getAllIssues(req);

      if (data?.Issues.length === 0) {
        res.status(200).send({ message: "There is no issue", Issues: [] });
      }

      res.status(200).send({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * issue_status
   * @param {*} req    HTTP request object
   * @param {*} res    HTTP response object
   * @param {*} next   Callback argument to the middleware function
   */

  async getIssues(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      const data = await issueService.findIssue(req);

      if (data?.Issues.length === 0) {
        res.status(200).send({ message: "There is no issue", Issues: [] });
      }

      res.status(200).send({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default IssueController;
