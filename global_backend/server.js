
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables");
}

const app = express();

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
          },
          credentials: true,
        }
      : undefined
  )
);

app.use(express.json({ limit: "1mb" }));

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
  });
});

// ==========================================
// DATABASE CONNECTION MIDDLEWARE
// ==========================================

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();

    console.log(
      "MongoDB connection state:",
      require("mongoose").connection.readyState
    );

    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(503).json({
      error: "Database connection unavailable",
    });
  }
});

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/water-sources", require("./routes/waterSourceRoutes"));

app.use("/api/hardware", require("./routes/hardwareRoutes"));

app.use("/api/gallery", require("./routes/galleryRoutes"));

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || "Server error",
  });
});

// ==========================================
// LOCAL DEVELOPMENT SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Server startup failed:", error);
      process.exit(1);
    });
}

// ==========================================
// VERCEL SERVERLESS EXPORT
// ==========================================

module.exports = app;
