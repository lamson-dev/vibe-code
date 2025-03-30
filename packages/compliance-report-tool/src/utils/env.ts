import { EnvVars } from "../types/index.js";

export function validateEnv(): EnvVars {
  const requiredVars: (keyof EnvVars)[] = [
    "PLAID_CLIENT_ID",
    "PLAID_SECRET",
    "PLAID_ENV",
  ];

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `Missing required environment variable: ${String(envVar)}`
      );
    }
  }

  if (
    !["sandbox", "development", "production"].includes(
      process.env.PLAID_ENV || ""
    )
  ) {
    throw new Error(
      "PLAID_ENV must be one of: sandbox, development, production"
    );
  }

  return {
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
    PLAID_SECRET: process.env.PLAID_SECRET!,
    PLAID_ENV: process.env.PLAID_ENV as EnvVars["PLAID_ENV"],
  };
}
