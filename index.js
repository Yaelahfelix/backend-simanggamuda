import express from "express";
import route from "./routes.js";

const app = express();

app.use(express.json());

app.use("/api/v1", route);

app.listen(3000);
