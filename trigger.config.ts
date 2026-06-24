import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_ID || "spizzzy",
  maxDuration: 300,
  dirs: ["src/trigger"],
};
