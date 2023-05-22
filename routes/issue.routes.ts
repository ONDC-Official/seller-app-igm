import express from "express";
import IssueController from "../controller/issue.controller";
import { default as authentication } from "../middleware/authentication";
const issueController = new IssueController();

const router = express.Router();
router.post("/issue", authentication(), issueController.createIssue);
router.get("/issue", issueController.getAllIssues);
router.get("/getissue", issueController.getIssues);

export default router;
