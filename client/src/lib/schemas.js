import { z } from "zod";

export const videoSchema = z.object({
  video_id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  thumbnail_url: z.string().url(),
  published_at: z.string(),
  url: z.string().url(),
  duration_seconds: z.number(),
  view_count: z.number(),
  is_short: z.boolean(),
});

export const videosSchema = z.array(videoSchema);
