import { task } from "@trigger.dev/sdk/v3";
import { runFullBuild } from "@/lib/ai/build-pipeline";

export const buildBook = task({
  id: "build-book",
  run: async (payload: { bookId: string }) => {
    const { bookId } = payload;
    console.log(`[trigger:build-book] Starting full build for ${bookId}`);

    await runFullBuild(bookId, (progress) => {
      console.log(`[trigger:build-book] ${progress.stage}: ${progress.detail || 'started'}`);
    });

    console.log(`[trigger:build-book] Build complete for ${bookId}`);
    return { success: true, bookId };
  },
});
