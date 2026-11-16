import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import app from "./app.js";

const PORT = Number(process.env.PORT) ?? 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let isShuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  // Force exit if cleanup hangs (e.g. keep-alive connections)
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server) {
      // Stop accepting new connections; resolves when in-flight requests finish
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        // Node 18.2+: drop idle keep-alive connections so close() isn't blocked
        server.closeIdleConnections?.();
      });
      console.log("HTTP server closed.");
    }

    await mongoose.connection.close();
    console.log("Database connection closed.");

    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

connectDB()
  .then(() => {
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`App running on port: ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("SERVER ERROR:: ", err);
      shutdown("server error", 1);
    });
  })
  .catch((err) => {
    console.error("DATABASE CONNECTION ERROR:: ", err);
    process.exit(1);
  });

process.on("SIGTERM", () => shutdown("SIGTERM")); // Docker, Render, Beanstalk, k8s
process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:: ", reason);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:: ", err);
  shutdown("uncaughtException", 1);
});

/* simple server spinup */
// import "dotenv/config";
// import connectDB from "./db/index.js";
// import app from "./app.js";

// const PORT =
//   process.env.NODE_ENV === "development" ? 3000 : Number(process.env.PORT);
// connectDB()
//   .then(() => {
//     app.on("error", (err) => {
//       throw err;
//     });
//     app.listen(PORT, "0.0.0.0", () => {
//       console.log(`App running on port: ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.log("DATABASE CONNECTION ERROR:: ", err);
//   });

/* ### Elastic Beanstalk fix */

// import "dotenv/config";
// import connectDB from "./db/index.js";
// import app from "./app.js";

// const PORT = process.env.PORT || 5000;

// // 1. Start server FIRST (must be immediate)
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`App running on port ${PORT}`);
// });

// // 2. Connect DB WITHOUT blocking startup
// connectDB()
//   .then(() => console.log("Database connected"))
//   .catch((err) => {
//     console.error("Database connection error:", err);
//   });

// // 3. Optional: log errors, don't crash EB
// app.on("error", (err) => {
//   console.error("Server error:", err);
// });
