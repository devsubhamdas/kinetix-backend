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
