import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_ID || "proj_hjzuvdayyaauyebsqqyq",
  maxDuration: 3600,
  dirs: ["src/trigger"],
};
