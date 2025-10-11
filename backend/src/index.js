// backend/src/index.js
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({ logger: true });

// Enable CORS for frontend (localhost:3000)
await app.register(fastifyCors, {
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
});

// Register routes
for (const route of ["datasets"]) {
  const module = await import(`./routes/${route}.js`);
  app.register(module.default, { prefix: `/v1/${route}` });
}

// Health check
app.get("/", async () => ({ message: "Backend API alive 🚀" }));

// Start server — listen on all interfaces for Docker
const port = process.env.PORT || 3001;
const host = "0.0.0.0";

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Backend running on ${address}`);
});

