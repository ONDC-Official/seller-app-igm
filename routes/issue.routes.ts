import express from "express";
import IssueController from "../controller/issue.controller";
import { default as authentication } from "../middleware/authentication";
const issueController = new IssueController();

const router = express.Router();
router.post("/issue", issueController.createIssue);
router.get("/all-issue/", authentication(), issueController.getAllIssues);

router.get(
  "/all-issue/:providerId",
  authentication(),
  issueController.getAllIssues
);
router.get(
  "/getissue/:issueId",
  authentication(),
  issueController.getSingleIssue
);
router.post(
  "/issue_response",
  // authentication(),
  issueController.issue_response
);
router.post("/issue_status", issueController.issue_status);

router.post("/on_issue_status", issueController.onIssueStatus);

export default router;
