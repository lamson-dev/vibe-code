import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { EnvVars } from "../types/index.js";

export function initializePlaidClient(env: EnvVars): PlaidApi {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
        "PLAID-SECRET": env.PLAID_SECRET,
      },
    },
  });

  return new PlaidApi(configuration);
}
