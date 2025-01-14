import express, { Request, Response } from "express";
import loginSchema from "../schemas/loginSchema";
const router = express.Router();

router.post("/", (req: Request, res: Response) => {
    try {
        loginSchema.parse(req.body);
    } catch (e) {
        res.status(400).send(
            JSON.stringify({ message: "Invalid Data!", error: e })
        );
    }
    res.status(200).send(JSON.stringify({ message: "Data Recieved!" }));
});

module.exports = router;
