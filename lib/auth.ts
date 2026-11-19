import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { mongoClient, mongoDatabase } from "./mongodb";

let instance: ReturnType<typeof createAuth> | undefined;
export function authReady() {
  return Boolean(
    process.env.MONGODB_URI && process.env.MONGODB_DB &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.BETTER_AUTH_SECRET.length >= 32 &&
    ((process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ||
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)),
  );
}
export function getAuth() {
  if (!authReady()) throw new Error("Authentication is not configured");
  return (instance ??= createAuth());
}
function createAuth() {
  return betterAuth({
    database: mongodbAdapter(mongoDatabase(), { client: mongoClient() }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    socialProviders: {
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            github: {
              clientId: process.env.GITHUB_CLIENT_ID,
              clientSecret: process.env.GITHUB_CLIENT_SECRET,
            },
          }
        : {}),
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    rateLimit: { enabled: true, storage: "database" },
    plugins: [nextCookies()],
  });
}
