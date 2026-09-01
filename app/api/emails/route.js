import { NextResponse } from "next/server";

const GOOGLE_API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function getGoogleAccessToken() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth environment variables.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token error: ${await res.text()}`);
  }

  return (await res.json()).access_token;
}

export async function GET() {
  try {
    const accessToken = await getGoogleAccessToken();

    const params = new URLSearchParams({
      maxResults: "10",
      labelIds: "INBOX",
      q: "category:primary -in:spam -in:trash",
    });

    const listRes = await fetch(`${GOOGLE_API}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!listRes.ok) {
      throw new Error(`Gmail API list error: ${await listRes.text()}`);
    }

    const { messages = [] } = await listRes.json();

    const emails = await Promise.all(
      messages.map(async ({ id }) => {
        try {
          const detailRes = await fetch(
            `${GOOGLE_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              cache: "no-store",
            }
          );

          if (!detailRes.ok) return null;
          const message = await detailRes.json();
          const headers = message.payload?.headers || [];

          const getHeader = (name) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          return {
            id: message.id,
            sender: getHeader("From"),
            subject: getHeader("Subject") || "(Không có tiêu đề)",
            time: getHeader("Date"),
            type: "gmail",
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({ emails: emails.filter(Boolean) });
  } catch (error) {
    console.error("Gmail API route error:", error.message);
    // Trả về mảng trống thay vì throw 500 để giao diện dashboard không bị crash
    return NextResponse.json({ emails: [], error: error.message }, { status: 200 });
  }
}