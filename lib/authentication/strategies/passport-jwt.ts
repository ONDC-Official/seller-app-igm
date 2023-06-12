import passportJWT from "passport-jwt";
// import UnauthenticatedError from "../../errors/unauthenticated.error";
// import MESSAGES from "../../../utils/messages";

const JwtStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

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
