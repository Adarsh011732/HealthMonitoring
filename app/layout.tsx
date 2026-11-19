import type { Metadata } from "next";
import "./globals.css";
import "../components/login.css";
import "../components/workspace.css";
import "./monochrome.css";
import "./typography.css";
import "./production.css";
import "./refined-theme.css";
import "./restored-dashboard.css";
export const metadata: Metadata = {
  title: "Branchline · Smart Deployment Health Monitor",
  description:
    "Follow every branch. Understand every deployment. A repository and service health workspace.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
