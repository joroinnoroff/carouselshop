import { CheckoutForm } from "@/components/CheckoutForm";
import { listClosedDays } from "@/lib/closed-days-store";
import { OPENING_HOURS_LABEL } from "@/lib/pickup";
import { stripeConfigured, stripePublishableKey } from "@/lib/stripe";
import { vippsConfigured } from "@/lib/vipps";

// The pickup options are generated from the current time.
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;
  const closedDays = await listClosedDays();

  return (
    <CheckoutForm
      nowIso={new Date().toISOString()}
      closedDays={closedDays}
      openingHours={OPENING_HOURS_LABEL}
      cancelled={cancelled === "1"}
      payments={{ stripe: stripeConfigured(), vipps: vippsConfigured() }}
      stripePublishableKey={stripePublishableKey()}
    />
  );
}
