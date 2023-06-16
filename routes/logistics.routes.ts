import express from "express";
import IssueController from "../controller/issue.controller";

const router = express.Router();

const issueController = new IssueController();

router.post("/on_issue", issueController.on_issue_logistics);
router.post("/on_issue_status", issueController.on_issue_status_logistics);

export default router;
