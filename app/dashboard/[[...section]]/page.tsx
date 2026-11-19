import { notFound } from "next/navigation";
import Dashboard from "../../../components/dashboard";
import { session } from "../../../lib/session";

export const dynamic = "force-dynamic";

const sections = {
  overview: "Overview",
  repository: "Repository",
  services: "Services",
  deployments: "Deployments",
  settings: "Settings",
} as const;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const route = await params;
  const segment = route.section?.[0] || "overview";
  if (!(segment in sections) || (route.section?.length || 0) > 1) notFound();

  const user = await session();

  return (
    <Dashboard
      initialTab={sections[segment as keyof typeof sections]}
      initialUser={user?.user || null}
    />
  );
}
