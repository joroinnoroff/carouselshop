# Carousel Oslo — shop

A small pickup-only webshop for [Carousel](https://www.carouseloslo.no/), the
flower, antiques and art shop in Grünersgate 14A. Four bouquets from 300 to
600 kr, a pickup time, an optional message, and payment by card (Stripe) or
Vipps.

Colours and type are taken from the original site: the `#fcf7c6` paper ground,
black ink, and the same `"STK Bureau Sans", sans-serif` stack. No rules or
borders anywhere — separation comes from space and soft fills.

## Running it

```bash
npm install
cp .env.example .env   # then fill in the keys
npm run dev            # http://localhost:3210
```

The shop browses and validates fine without any keys — only the final redirect
to a payment provider needs them.

## Keys

Everything lives in `.env` (see `.env.example`):

| Variable | Where it comes from |
| --- | --- |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --forward-to localhost:3210/api/webhooks/stripe` |
| `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MERCHANT_SERIAL_NUMBER` | portal.vipps.no (test credentials in the test portal) |
| `VIPPS_API_BASE` | `https://apitest.vipps.no` for test, `https://api.vipps.no` live |
| `NEXT_PUBLIC_SITE_URL` | Public origin — used to build the payment return URLs |

Until a provider's keys are present, its option on the checkout page is marked
"keys missing" and picking it returns a clear error rather than failing quietly.

## How it fits together

```
lib/products.ts   the four bouquets, prices in øre
lib/pickup.ts     opening hours → "pick up now" + the next three windows
lib/checkout.ts   validates an incoming order; prices are always re-derived here
lib/orders.ts     order storage (JSON file for now — see below)
lib/stripe.ts     lazily constructed Stripe client
lib/vipps.ts      small typed client for the Vipps ePayment REST API

app/                        home (bouquets) → /checkout → provider → /order/[ref]
app/api/checkout            creates the order, then a Stripe session or Vipps payment
app/api/webhooks/stripe     marks orders paid; signature-verified
```

Once an order is paid, `/order/[reference]` shows a countdown to collection:
a segmented bar that fills from grey to black as the pickup window approaches,
with the stages of making the bouquet turning black as they pass.

Payment is confirmed twice over: the Stripe webhook settles it in the
background, and `/order/[reference]` asks the provider directly when the
customer lands there, in case they beat the webhook. Vipps has no webhook
registered yet, so it relies on that return-page check — worth adding
(`/epayment/v1/webhooks`) before going live.

## Pickup times

Opening hours are Wed–Sat 12–17, encoded in `OPENING_HOURS` in `lib/pickup.ts`.
Customers get:

- **Pick up now** — only while the shop is open and there are at least
  `PREP_MINUTES` (20) left before closing.
- **Three windows** — 12:00–13:30, 13:30–15:00, 15:00–17:00, rolling forward
  into the next open days when today's are gone.

The chosen slot id is re-validated on the server at checkout, so a stale browser
tab cannot book a window that has passed.

## Before the admin panel

Three things are deliberately parked, and each is isolated to one module:

- **Catalogue** — `lib/products.ts` is a hard-coded array (photos live in
  `/public`). Point it at the database and the rest of the app is unchanged.
- **Opening hours and slots** — the three consts at the top of `lib/pickup.ts`.
- **Orders** — `lib/orders.ts` writes to `.data/orders.json`. It already exposes
  the async interface a real store needs (`saveOrder`, `getOrder`,
  `updateOrder`, `listOrders`), so only those four bodies change. `listOrders`
  is there for the admin order list and is not used by the shop yet.

There is no authentication anywhere yet — add it with the admin routes.
