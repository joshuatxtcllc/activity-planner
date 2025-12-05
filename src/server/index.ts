import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readdirSync } from "fs";
import logger from "./utils/logger";
import routes from "./routes";
import { startScheduler } from "./scheduler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "production") {
  const publicPath = join(__dirname, "public");
  logger.info(`Static files directory: ${publicPath}`);

  // Check if public directory exists and log contents
  if (!existsSync(publicPath)) {
    logger.error(`❌ Public directory does not exist at: ${publicPath}`);
  } else {
    logger.info(`✅ Public directory exists`);
    try {
      const files = readdirSync(publicPath);
      logger.info(`Files in public: ${files.join(", ")}`);
    } catch (err) {
      logger.error(`Error reading public directory: ${err}`);
    }
  }

  // Serve static files with logging
  app.use(express.static(publicPath, {
    maxAge: "1d",
    setHeaders: (_res, filePath) => {
      logger.info(`Serving: ${filePath}`);
    }
  }));

  // SPA fallback - serve index.html for all other routes
  app.get("*", (req, res) => {
    const indexPath = join(publicPath, "index.html");
    logger.info(`Fallback route for ${req.path} -> ${indexPath}`);

    if (!existsSync(indexPath)) {
      logger.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(404).send("Application not found. Build may have failed.");
    }

    res.sendFile(indexPath);
  });
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error("Unhandled error", { error: err.message, stack: err.stack });
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
);

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  if (process.env.NODE_ENV === "production" || process.env.ENABLE_SCHEDULER === "true") {
    startScheduler();
  } else {
    logger.info("Scheduler disabled in development (set ENABLE_SCHEDULER=true to enable)");
  }
});

export default app;
