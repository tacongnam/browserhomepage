/**
 * /api/emails
 *
 * Fetches the last 30 primary-inbox messages, enriches each with:
 *  - OTP code (if found in subject/snippet)
 *  - Magic link (if found in snippet)
 *  - isVerification flag
 *
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 */

import { NextResponse } from "next/server";
import { extractEmailVerificationData } from "@/lib/utils";

const GOOGLE_API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function getGoogleAccessToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth environment variables.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Google token error: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

export async function GET() {
  try {
    const accessToken = await getGoogleAccessToken();

    // Only fetch emails from the last 7 days to save API quota.
    // Verification/OTP emails are always recent so nothing useful is lost.
    const params = new URLSearchParams({
      maxResults: "20",
      labelIds: "INBOX",
      q: "category:primary -in:spam -in:trash newer_than:7d",
    });

    const listRes = await fetch(`${GOOGLE_API}/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!listRes.ok) throw new Error(`Gmail list error: ${await listRes.text()}`);

    const { messages = [] } = await listRes.json() as { messages?: Array<{ id: string }> };

    const emails = await Promise.all(
      messages.map(async ({ id }) => {
        try {
          // Fetch metadata + snippet
          const detailRes = await fetch(
            `${GOOGLE_API}/messages/${id}?format=metadata` +
            `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
          );
          if (!detailRes.ok) return null;

          const message = await detailRes.json() as {
            id: string;
            snippet?: string;
            payload?: { headers?: Array<{ name: string; value: string }> };
          };

          const headers = message.payload?.headers ?? [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

          const subject = getHeader("Subject") || "(Không có tiêu đề)";
          const sender  = getHeader("From");
          const snippet = message.snippet ?? "";

          // ── OTP / Verification enrichment ────────────────────────────────
          const verification = extractEmailVerificationData(subject, snippet);

          return {
            id: message.id,
            sender,
            subject,
            time: getHeader("Date"),
            type: "gmail",
            snippet,
            ...verification,
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = emails.filter(Boolean);
    return NextResponse.json({ emails: filtered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    console.error("[emails GET]", message);
    return NextResponse.json({ emails: [], error: message }, { status: 200 });
  }
}