import { MongoClient } from "mongodb";

let client: MongoClient | undefined;
export function mongoClient() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  return client ??= new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000,
  });
}
export function mongoDatabase() {
  if (!process.env.MONGODB_DB) throw new Error("MONGODB_DB is required");
  return mongoClient().db(process.env.MONGODB_DB);
}
