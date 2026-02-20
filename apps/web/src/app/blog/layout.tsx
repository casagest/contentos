import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Blog — ContentOS",
    template: "%s | Blog ContentOS",
  },
  description:
    "Ghiduri, strategii și tips de content marketing pentru piața românească. Social media, AI, algoritmi și creștere organică.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
