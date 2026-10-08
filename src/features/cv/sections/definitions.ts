import { z } from "zod";
import {
  fieldDefinitionSchema,
  type FieldDefinition,
} from "@/features/cv/schema/fields";
import { sectionTypeSchema } from "@/features/cv/schema/document";

/**
 * Everything the app needs to know to render/edit a section — as data.
 *
 *   SectionDefinition → form generator → entries → preview renderer → latex renderer
 *
 * `renderer` selects implementations from renderer registries (Phases 6–7);
 * unknown keys fall back to the generic renderer, which is what keeps custom
 * sections free of code.
 */
export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  type: sectionTypeSchema,
  renderer: z.string().min(1),
  fields: z.array(fieldDefinitionSchema),
  defaultVisible: z.boolean(),
  order: z.number().int(),
});

export type SectionDefinition = z.infer<typeof sectionDefinitionSchema>;

export type CustomSectionInput = {
  title: string;
  description?: string;
  type: z.infer<typeof sectionTypeSchema>;
  fields: FieldDefinition[];
};
