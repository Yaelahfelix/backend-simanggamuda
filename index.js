import express from "express";
import route from "./routes.js";
import serverless from "serverless-http";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Backend Simanggamuda",
  });
});
app.use("/api/v1", route);

app.listen(3000);
