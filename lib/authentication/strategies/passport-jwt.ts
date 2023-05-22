import passportJWT from "passport-jwt";
// import UnauthenticatedError from "../../errors/unauthenticated.error";
// import MESSAGES from "../../../utils/messages";

const JwtStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

// const tokenExtractor = function (req: any) {
//   let token = null;
//   let tokenArray = [];

//   if (req) {
//     token = req.get("access-token");

//     if (!token) {
//       throw new UnauthenticatedError(
//         MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID
//       );
//     }

//     tokenArray = token.split(" ");
//   }

//   console.log("token--------->", tokenArray);
//   return tokenArray[1];
// };

const opts = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(), //ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "ZZXk0l5HOE3gzvacyaYe1g==",
  passReqToCallback: true,
};

const passportJwtStrategy = new JwtStrategy(opts, function (jwtPayload, done) {
  console.log("jwtPayload", jwtPayload);
  console.log("done", done);
});

export default passportJwtStrategy;

// async (req: any, jwtPayload: any, done: any) => {
//   console.log("wits");
//   // console.log("🚀 ~ file: passport-jwt.ts:36 ~ jwtPayload:", jwtPayload,"ahsan");
//   try {
//     console.log("wits");
//     let user: any = {};

//     // if jwt payload contains user obj then its an inter service communication call
//     if (jwtPayload.user) {
//       user = jwtPayload.user;
//       // console.log("🚀 ~ file: passport-jwt.ts:44 ~ user:", user);

//       user.userToken = tokenExtractor(req);
//       // let cachedToken = myCache.get(`${user.id}-${user.userToken}`);

//       // if(!cachedToken){
//       //     throw new UnauthenticatedError(
//       //         MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID
//       //     );
//       // }
//     } else if (jwtPayload.userId) {
//       if (!user) {
//         throw new UnauthenticatedError(
//           MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID
//         );
//       } else if (user.enabled === false) {
//         throw new UnauthenticatedError(
//           MESSAGES.LOGIN_ERROR_USER_ACCOUNT_DEACTIVATED
//         );
//       }

//       user = user.toJSON();
//       user.userToken = tokenExtractor(req);
//       // let cachedToken = myCache.get(`${user.id}-${user.userToken}`);

//       // if (!cachedToken) {
//       //   throw new UnauthenticatedError(
//       //     MESSAGES.LOGIN_ERROR_USER_ACCESS_TOKEN_INVALID
//       //   );
//       // }
//     }
//     return done(null, user);
//   } catch (err) {
//     // logger.log('error', err);
//     return done(err, null);
//   }
// }
