/**
 * Minimal Vipps ePayment client.
 *
 * Vipps has no official Node SDK, so this is a small typed wrapper over the
 * two REST calls we need: fetch an access token, then create a payment that we
 * redirect the customer to.
 *
 * Docs: https://developer.vippsmobilepay.com/docs/APIs/epayment-api/
 */

export type VippsConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
};

export function vippsConfigured(): boolean {
  return Boolean(
    process.env.VIPPS_CLIENT_ID &&
      process.env.VIPPS_CLIENT_SECRET &&
      process.env.VIPPS_SUBSCRIPTION_KEY &&
      process.env.VIPPS_MERCHANT_SERIAL_NUMBER,
  );
}

function getConfig(): VippsConfig {
  const config = {
    baseUrl: process.env.VIPPS_API_BASE || "https://apitest.vipps.no",
    clientId: process.env.VIPPS_CLIENT_ID ?? "",
    clientSecret: process.env.VIPPS_CLIENT_SECRET ?? "",
    subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY ?? "",
    merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER ?? "",
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(
      `Vipps is not configured — missing ${missing.join(", ")}. See .env.example.`,
    );
  }

  return config;
}

/** Identifies us to Vipps in support tickets; required by their guidelines. */
function systemHeaders(): Record<string, string> {
  return {
    "Vipps-System-Name": "carousel-oslo-shop",
    "Vipps-System-Version": "0.1.0",
    "Vipps-System-Plugin-Name": "carousel-oslo-shop",
    "Vipps-System-Plugin-Version": "0.1.0",
  };
}

type TokenResponse = { access_token: string; expires_in: string };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: VippsConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${config.baseUrl}/accesstoken/get`, {
    method: "POST",
    headers: {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      "Merchant-Serial-Number": config.merchantSerialNumber,
      ...systemHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(
      `Vipps token request failed (${res.status}): ${await res.text()}`,
    );
  }

  const body = (await res.json()) as TokenResponse;
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in ?? 3000) * 1000,
  };
  return cachedToken.token;
}

export type CreatePaymentInput = {
  /** Our order reference — Vipps requires 8-64 chars, letters/digits/dashes. */
  reference: string;
  amountOre: number;
  /** Shown to the customer in the Vipps app. Max 100 chars. */
  description: string;
  returnUrl: string;
  /** Prefills the app; Norwegian MSISDN, e.g. "4712345678". */
  phoneNumber?: string;
};

export type CreatePaymentResult = {
  reference: string;
  redirectUrl: string;
};

export async function createVippsPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const config = getConfig();
  const token = await getAccessToken(config);

  const res = await fetch(`${config.baseUrl}/epayment/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      "Merchant-Serial-Number": config.merchantSerialNumber,
      // Makes the call safely retryable on Vipps' side.
      "Idempotency-Key": input.reference,
      ...systemHeaders(),
    },
    body: JSON.stringify({
      amount: { currency: "NOK", value: input.amountOre },
      paymentMethod: { type: "WALLET" },
      customer: input.phoneNumber ? { phoneNumber: input.phoneNumber } : undefined,
      reference: input.reference,
      returnUrl: input.returnUrl,
      userFlow: "WEB_REDIRECT",
      paymentDescription: input.description.slice(0, 100),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Vipps payment creation failed (${res.status}): ${await res.text()}`,
    );
  }

  return (await res.json()) as CreatePaymentResult;
}

export type VippsPaymentState =
  | "CREATED"
  | "ABORTED"
  | "EXPIRED"
  | "AUTHORIZED"
  | "TERMINATED";

/** Used when the customer comes back from the app, to confirm what happened. */
export async function getVippsPayment(reference: string): Promise<{
  reference: string;
  state: VippsPaymentState;
  amount: { value: number; currency: string };
}> {
  const config = getConfig();
  const token = await getAccessToken(config);

  const res = await fetch(
    `${config.baseUrl}/epayment/v1/payments/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        ...systemHeaders(),
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `Vipps payment lookup failed (${res.status}): ${await res.text()}`,
    );
  }

  return res.json();
}
