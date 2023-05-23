import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const verifyToken = () => {
  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.header("access-token");
      const authToken: any = token?.split(" ")[1];
      if (!token) {
        res.status(401).json({
          error: true,
          message: "A token is required for authentication",
        });
      } else {
        const decode: any = jwt.verify(
          authToken,
          process.env.AUTH_ACCESS_JWT_SECRET ||
            "wftd3hg5*fd5h6fbvcy6rtg5wftd3hg5*fd5xxx"
        );
        req.body.user = decode;
        next();
      }
    } catch (error: any) {
      console.log(error.message);
      res.status(401).send({ error: true, message: error.message });
    }
  };
};

export default verifyToken;
