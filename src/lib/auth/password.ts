import "server-only";
import bcrypt from "bcryptjs";

/** Cost 12 — a deliberate balance of resistance and serverless cold-start cost. */
const ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
