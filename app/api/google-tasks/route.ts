/**
 * /api/google-tasks
 *
 * GET  → fetch tasks from the user's default Google Tasks list
 * POST → create a new task
 * PATCH → toggle complete / update status  (body: { id, status })
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN   (obtained via /api/auth/google/callback)
 */

import { NextRequest, NextResponse } from "next/server";

const TASKS_API = "https://tasks.googleapis.com/tasks/v1";

// ─── Shared: refresh access token ─────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth env vars for Tasks API.");
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

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const json = await res.json();
  return json.access_token as string;
}

// ─── GET /api/google-tasks ────────────────────────────────────────────────────

export async function GET() {
  try {
    const token = await getAccessToken();
    // Use "@default" directly — avoids a separate /lists call that requires
    // the same scope anyway and fails if Tasks API isn't enabled in the project.
    const listId = "@default";

    const params = new URLSearchParams({
      showCompleted: "false",
      showHidden: "false",
      maxResults: "50",
    });

    const res = await fetch(`${TASKS_API}/lists/${listId}/tasks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Tasks fetch error: ${await res.text()}`);

    const { items = [] } = await res.json();

    // Normalise to our internal Task shape
    const tasks = (items as Array<{
      id: string;
      title: string;
      status: string;
      due?: string;
      notes?: string;
    }>).map((t) => ({
      id: `gtask_${t.id}`,
      google_task_id: t.id,
      text: t.title,
      is_completed: t.status === "completed",
      created_at: new Date().toISOString(),
      source: "google" as const,
      due: t.due,
      notes: t.notes,
    }));

    return NextResponse.json({ tasks, listId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[google-tasks GET]", message);
    return NextResponse.json({ tasks: [], error: message }, { status: 200 });
  }
}

// ─── POST /api/google-tasks  (create) ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json() as { title: string };
    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const token = await getAccessToken();

    const res = await fetch(`${TASKS_API}/lists/@default/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) throw new Error(`Task create error: ${await res.text()}`);
    const task = await res.json();
    return NextResponse.json({ task });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH /api/google-tasks  (toggle complete) ───────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { googleTaskId, completed } = await req.json() as {
      googleTaskId: string;
      completed: boolean;
    };

    if (!googleTaskId) {
      return NextResponse.json({ error: "googleTaskId is required" }, { status: 400 });
    }

    const token = await getAccessToken();
    const status = completed ? "completed" : "needsAction";

    const res = await fetch(`${TASKS_API}/lists/@default/tasks/${googleTaskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) throw new Error(`Task update error: ${await res.text()}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}