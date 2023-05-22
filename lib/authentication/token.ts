class Token {
  /**
   *
   * @param {*} payload token payload
   * @param {*} exp     token expiry
   */
  payload: any;
  exp: any;

  constructor(payload: any, exp: any) {
    this.payload = payload;
    this.exp = exp;
  }

  setPayload(payload: any) {
    this.payload = payload;
  }

  getPayload() {
    return this.payload;
  }

  setExp(exp: any) {
    this.exp = exp;
  }

  getExp() {
    return this.exp;
  }
}

export default Token;
