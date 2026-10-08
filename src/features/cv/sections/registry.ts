import type { SectionInstance } from "@/features/cv/schema/document";
import { builtinSectionDefinitions } from "./builtins";
import type { CustomSectionInput, SectionDefinition } from "./definitions";

const builtinsById = new Map<string, SectionDefinition>(
  builtinSectionDefinitions.map((definition) => [definition.id, definition]),
);

export const sortedBuiltinDefinitions: SectionDefinition[] = [
  ...builtinSectionDefinitions,
].sort((a, b) => a.order - b.order);

export function getBuiltinDefinition(id: string): SectionDefinition | undefined {
  return builtinsById.get(id);
}

export function isBuiltinDefinition(id: string): boolean {
  return builtinsById.has(id);
}

/**
 * Definition for a section instance, whichever way it was created:
 * - built-in: comes from the catalog (`builtins.ts`)
 * - custom: fields are stored inside the instance itself (the `.cv` file is
 *   self-contained — opening it on another machine needs no registry entry)
 * - unknown: graceful generic fallback (e.g. file written by a future version)
 */
export function resolveSectionDefinition(
  instance: SectionInstance,
): SectionDefinition {
  const builtin = builtinsById.get(instance.definitionId);
  if (builtin) return builtin;

  return {
    id: instance.definitionId,
    title: instance.title,
    type: instance.type,
    renderer: "generic",
    fields: instance.fields ?? [],
    defaultVisible: instance.enabled,
    order: instance.order,
  };
}

/**
 * Builds an editable instance from a definition.
 * Custom instances carry their field definitions so the file stays portable.
 */
export function createSectionInstance(
  definition: SectionDefinition,
  order: number,
): SectionInstance {
  const custom = !builtinsById.has(definition.id);
  return {
    id: custom ? `custom-${crypto.randomUUID()}` : definition.id,
    definitionId: definition.id,
    title: definition.title,
    type: definition.type,
    enabled: definition.defaultVisible,
    order,
    ...(custom ? { fields: definition.fields } : {}),
    entries: [],
  };
}

/** A section the user designed in the UI — no source code involved. */
export function createCustomSectionDefinition(
  input: CustomSectionInput,
): SectionDefinition {
  return {
    id: `custom-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description,
    type: input.type,
    renderer: "generic",
    fields: input.fields,
    defaultVisible: true,
    order: 0,
  };
}
