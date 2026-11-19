import Login from "../../components/login";
import { authReady } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <Login
      configured={authReady()}
      github={Boolean(
        authReady() &&
        process.env.BETTER_AUTH_SECRET &&
        process.env.GITHUB_CLIENT_ID &&
        process.env.GITHUB_CLIENT_SECRET,
      )}
      google={Boolean(
        authReady() &&
        process.env.BETTER_AUTH_SECRET &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET,
      )}
    />
  );
}
