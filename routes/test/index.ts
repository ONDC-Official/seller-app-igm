import express from "express";
import testController from "../../controller/test";

const router = express.Router();
router.post("/test-feature", testController.testFeature);

export default router;
