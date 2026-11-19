import Dashboard from "../components/dashboard";
import { session } from "../lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await session();
  return <Dashboard initialTab="Overview" initialUser={user?.user || null} />;
}
