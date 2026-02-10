import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard — ContentOS",
};

export default function DashboardPage() {
  redirect("/dashboard/business");
}
