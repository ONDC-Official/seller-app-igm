import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { passportJwtStrategy } from "../authentication";
import UnauthenticatedError from "../../lib/errors/unauthenticated.error";
import MESSAGES from "../../utils/messages";

passport.use(passportJwtStrategy);

const authentication =
  () => (req: Request, res: Response, next: NextFunction) => {
    console.log("🚀 ~ file: authentication.ts:11 ~ req:", req.body);
    console.log("authentication check---");
    passport.authenticate(
      "jwt",
      {
        session: false,
      },
      (err: any, user: any) => {
        console.log("err---->", err);
        console.log("user---->", user);
        if (user) { 
          req.user = user;
          next();
        } else if (err) {
          // console.log("error",err,"ahsan")
          next(err);
        } else {
          console.log("unauthenticated","ahsan")
          next(
            new UnauthenticatedError(
              MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID
            )
          );
        }
      }
    )(req, res, next);
  };

export default authentication;
