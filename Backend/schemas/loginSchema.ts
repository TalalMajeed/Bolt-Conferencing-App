import { z } from "zod";

const Schema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(8)
        .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/),
});

export default Schema;
