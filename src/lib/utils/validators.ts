import { z } from 'zod';

export const childDetailsSchema = z.object({
  childName: z.string().min(1, 'Name is required').max(50),
  childAge: z.number().min(1).max(12),
  childTraits: z.array(z.string()).min(1, 'Select at least one trait').max(5),
});

export const generateStorySchema = z.object({
  themeSlug: z.string().min(1),
  childName: z.string().min(1).max(50),
  childAge: z.number().min(1).max(12),
  childTraits: z.array(z.string()).min(1).max(5),
  language: z.enum(['en', 'he']).default('en'),
  customPrompt: z.string().max(2000).optional(),
});

export type ChildDetailsInput = z.infer<typeof childDetailsSchema>;
export type GenerateStoryInput = z.infer<typeof generateStorySchema>;
