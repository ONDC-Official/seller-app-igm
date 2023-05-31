import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { passportJwtStrategy } from "../authentication";
import UnauthenticatedError from "../../lib/errors/unauthenticated.error";
import MESSAGES from "../../utils/messages";

passport.use(passportJwtStrategy);

const authentication =
  () => (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "jwt",
      {
        session: false,
      },
      (err: any, user: any) => {
        if (user) {
          req.user = user;
          next();
        } else if (err) {
          next(err);
        } else {
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
