import DashboardShellClient from "./dashboard-shell-client";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShellClient>{children}</DashboardShellClient>;
}
