import express from "express";
import IssueController from "../controller/issue.controller";

const issueController = new IssueController();

const router = express.Router();
router.post("/issue", issueController.createIssue);
router.get("/issue", issueController.getAllIssues);
router.get("/getissue", issueController.getIssues);

export default router;
