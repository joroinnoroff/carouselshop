import { CheckoutForm } from "@/components/CheckoutForm";
import { getPickupOptions, OPENING_HOURS_LABEL } from "@/lib/pickup";
import { stripeConfigured } from "@/lib/stripe";
import { vippsConfigured } from "@/lib/vipps";

// The pickup options are generated from the current time.
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { cancelled } = await searchParams;

  return (
    <CheckoutForm
      pickupOptions={getPickupOptions()}
      openingHours={OPENING_HOURS_LABEL}
      cancelled={cancelled === "1"}
      payments={{ stripe: stripeConfigured(), vipps: vippsConfigured() }}
    />
  );
}
