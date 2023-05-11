import * as dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import testRoutes from "./routes/test";

dotenv.config();

const createServer = (): express.Application => {
  const app: Application = express();


  

  // Body parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/test", testRoutes);

  // eslint-disable-next-line no-unused-vars
  app.get("/", async (_req: Request, res: Response): Promise<Response> => {
    return res.status(200).send({
      success: true,
      message: "The server is running",
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.get(
    "/health",
    async (_req: Request, res: Response): Promise<Response> => {
      return res.status(200).send({
        success: true,
        message: "The server is running",
      });
    }
  );

  return app;
};

export default createServer;
