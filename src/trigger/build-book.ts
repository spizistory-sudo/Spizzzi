import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

export const buildBook = task({
  id: "build-book",
  run: async (payload: { bookId: string }) => {
    const { bookId } = payload;
    console.log(`[trigger:build-book] ping for ${bookId}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: book } = await supabase
      .from("books")
      .select("id, title, status, metadata")
      .eq("id", bookId)
      .limit(1);

    if (!book?.[0]) {
      console.error(`[trigger:build-book] book ${bookId} not found`);
      return { success: false, reason: "book_not_found" };
    }

    const meta = (book[0].metadata || {}) as Record<string, unknown>;
    await supabase
      .from("books")
      .update({
        metadata: { ...meta, trigger_ping: new Date().toISOString() },
      })
      .eq("id", bookId);

    console.log(`[trigger:build-book] ping written for ${bookId} (title: ${book[0].title})`);
    return { success: true, bookId, title: book[0].title };
  },
});
