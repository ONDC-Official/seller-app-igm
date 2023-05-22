import jwt from "jsonwebtoken";

class JsonWebToken {
  /**
   *
   * @param {*} options JWT options
   */
  options: any;
  constructor(options: any) {
    this.options = options;
  }

  /**
   * Sign JWT token
   * @param {*} token Instance of Token class
   */
  sign(token: any) {
    return new Promise((resolve, reject) => {
      jwt.sign(
        token.payload,
        this.options.secret,
        { expiresIn: token.exp },
        function (err, token) {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  /**
   * Verify JWT token
   * @param {} jwtToken JWT token in String format
   */
  verify(jwtToken: any) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        jwtToken,
        this.options.secret,
        function (err: any, decoded: any) {
          if (err) {
            reject(err);
          } else {
            resolve(decoded);
          }
        }
      );
    });
  }
}

export default JsonWebToken;
