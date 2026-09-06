import "dotenv/config";
import connectDB from "./db/index.js";
import app from "./app.js";

const PORT =
  process.env.NODE_ENV === "development" ? 3000 : Number(process.env.PORT);
connectDB()
  .then(() => {
    app.on("error", (err) => {
      throw err;
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`App running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("DATABASE CONNECTION ERROR:: ", err);
  });

// ### Elastic Beanstalk fix

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
