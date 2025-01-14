import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import { z } from "zod";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(helmet());
const PORT = process.env.PORT || 5000;

app.use("/", require("./routes/indexRoute"));
app.use("/api/login", require("./routes/loginRoute"));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
