import * as dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import issueRoutes from "./routes/issue.routes";
// import path from "path";

dotenv.config();

const createServer = (): express.Application => {
  const app: Application = express();

  // Body parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/client", issueRoutes);

  // app.get("/*", (_req, res) => {
  //   res.sendFile(path.join(__dirname, "/../", "build", "index.html"));
  // });
  // eslint-disable-next-line no-unused-vars
  app.get("/", async (_req: Request, res: Response): Promise<Response> => {
    return res.status(200).send({
      success: true,
      message: "The server is running",
    });
  });

  return app;
};

export default createServer;
