 // backend/tests/health.test.js
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";

describe("Backend health check", () => {
  let app;

  beforeAll(async () => {
    app = Fastify();
    await app.register(fastifyCors);
    app.get("/", async () => ({ message: "Backend API alive 🚀" }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test("GET / should return 200 and correct message", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Backend API alive 🚀" });
  });
});
