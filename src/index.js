import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
.then(() => {
  app.on("error", (err) => {
    throw err;
  });
  app.listen(process.env.PORT || 3000, () => {
    console.log("App running on port: ", process.env.PORT);
  })
})
.catch((err) => {
  console.log("DATABASE CONNECTION ERROR:: ", err)
});
