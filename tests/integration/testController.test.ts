import request from "supertest";

import createServer from "../../app";

let server: any;
beforeAll(async () => {
  server = createServer();
});

describe("POST /test", () => {
  it("should return 200 & valid response", async () => {
    const response = await request(server).post(`/test/test-feature`);
    expect(response.status).toBe(200);
    console.log(response.body);
    expect(response.body).toStrictEqual({ success: true });
  });
});
