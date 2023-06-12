import express from "express";
import IssueController from "../controller/issue.controller";
import { default as authentication } from "../middleware/authentication";

const router = express.Router();

const issueController = new IssueController();

router.post("/issue", issueController.createIssue);

router.get("/all-issue/", authentication(), issueController.getAllIssues);

router.get(
  "/getissue/:issueId",
  authentication(),
  issueController.getSingleIssue
);
router.post(
  "/issue_response",
  authentication(),
  issueController.issue_response
);
router.post("/issue_status", issueController.issue_status);


router.post("/on_issue", issueController.on_issue_logistics);
router.post("/on_issue_status", issueController.on_issue_status_logistics);

export default router;
