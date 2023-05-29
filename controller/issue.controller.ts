import { Response, Request, NextFunction } from "express";
import { logger } from "../shared/logger";
import IssueService from "../services/issues.service";

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
      await issueService.createIssue(req, res);
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
      await issueService.getAllIssues(req, res);
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

  async issue_response(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      await issueService.issue_response(req, res);
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

  async issue_status(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      await issueService.issueStatus(req, res);
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

  async getSingleIssue(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(req);

      await issueService.getSingleIssue(req, res);
    } catch (err) {
      next(err);
    }
  }
}

export default IssueController;
