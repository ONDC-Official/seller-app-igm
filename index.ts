import { logger } from "./shared/logger";
import createServer from "./app";
import dbConnect from "./database/mongooesConnector";

const port = process.env.PORT || 8000;

const app = createServer();

try {
  dbConnect()
    .then(() => {
      logger.info("Database connection successful");

      app.listen(port, (): void => {
        logger.info(`Connected successfully on port ${port}`);
      });
    })
    .catch((error: any) => {
      logger.info("Error connecting to the database", error);
      return;
    });
} catch (error) {
  logger.error(`Error occured: ${(error as any).message}`);
}
