import { z } from "zod";

/**
 * The vocabulary of field types the generic form renderer knows how to display.
 * Adding a new type = one entry here + one case in FieldRenderer (Phase 4).
 */
export const fieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "year",
  "date",
  "select",
  "multiselect",
  "checkbox",
  "url",
  "email",
  "richtext",
  "authors",
]);

export const optionDefinitionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const fieldDefinitionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: fieldTypeSchema,
    required: z.boolean().optional(),
    options: z.array(optionDefinitionSchema).optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
  })
  .superRefine((field, ctx) => {
    if (
      (field.type === "select" || field.type === "multiselect") &&
      (field.options === undefined || field.options.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Select field "${field.label}" must define at least one option`,
        path: ["options"],
      });
    }
  });

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type OptionDefinition = z.infer<typeof optionDefinitionSchema>;
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
