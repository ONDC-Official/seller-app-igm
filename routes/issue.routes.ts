import express from "express";
import IssueController from "../controller/issue.controller";
// import { default as authentication } from "../middleware/authentication";
const issueController = new IssueController();

const router = express.Router();
router.post("/issue", issueController.createIssue);
router.get("/all-issue/", issueController.getAllIssues);
router.get("/all-issue/:providerId", issueController.getAllIssues);
router.get("/getissue/:transactionId", issueController.getSingleIssue);
router.post("/issue_response", issueController.issue_response);
router.post("/issue_status", issueController.issue_status);

export default router;
