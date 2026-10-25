import type { Metadata } from "next";
import { BillingSettings } from "@/components/account/billing-settings";
import { requireCustomer } from "@/server/admin-session";
import { getBillingSummary, getPortfolioInsights } from "@/server/billing";

export const metadata: Metadata = { title: "Billing & plans", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const customer = await requireCustomer();
  const billing = await getBillingSummary(customer.userId);
  const insights = billing.portfolioProActive
    ? await getPortfolioInsights(customer.userId)
    : null;
  return <BillingSettings billing={billing} insights={insights} />;
}
