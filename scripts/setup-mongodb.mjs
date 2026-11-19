import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) throw Error("Set MONGODB_URI and MONGODB_DB in .env.local");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);
  await db.command({ ping: 1 });
  await db.collection("branchline_repositories").createIndex({ user_id: 1, repository: 1 }, { unique: true });
  await db.collection("branchline_preferences").createIndex({ user_id: 1 }, { unique: true });
  await db.collection("branchline_runs").createIndex({ user_id: 1, repository: 1, workflow_id: 1 }, { unique: true });
  await db.collection("branchline_runs").createIndex({ user_id: 1, updated_at: -1 });
  console.log("MongoDB connection and workspace indexes verified.");
} finally { await client.close(); }
