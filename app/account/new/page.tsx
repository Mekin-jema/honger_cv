import type { Metadata } from "next";
import { CreateCv } from "@/components/account/create-cv";

export const metadata: Metadata = { title: "Create a CV", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CreateCvPage() {
  return <CreateCv />;
}
