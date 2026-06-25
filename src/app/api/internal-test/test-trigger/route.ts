export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { tasks } from "@trigger.dev/sdk/v3";
import type { buildBook } from "@/trigger/build-book";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { bookId } = await req.json();
    if (!bookId) {
      return NextResponse.json({ error: "bookId required" }, { status: 400 });
    }

    console.log(`[test-trigger] Admin ${user.email} triggering build-book for ${bookId}`);

    const handle = await tasks.trigger<typeof buildBook>("build-book", { bookId });

    console.log(`[test-trigger] Job enqueued: ${handle.id}`);
    return NextResponse.json({ triggered: true, runId: handle.id, bookId });
  } catch (err) {
    console.error("[test-trigger] ERROR:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to trigger job" }, { status: 500 });
  }
}
