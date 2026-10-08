import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDefinition } from "@/features/cv/schema/fields";
import { AuthorEditor } from "./AuthorEditor";

type Props = {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
};

/**
 * The ONE component that turns a FieldDefinition into inputs.
 * A new field type = one new case here, never a new form component.
 */
export function FieldRenderer({ field, value, onChange }: Props) {
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "textarea":
    case "richtext":
      return (
        <Textarea
          rows={3}
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "number":
    case "year":
      return (
        <Input
          inputMode="numeric"
          maxLength={field.type === "year" ? 4 : undefined}
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "email":
      return (
        <Input
          type="email"
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "url":
      return (
        <Input
          type="url"
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "checkbox":
      return (
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.label}
        </Label>
      );

    case "select":
      return (
        <Select
          value={text || undefined}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multiselect": {
      const selected = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {field.options?.map((option) => (
            <Label
              key={option.value}
              className="flex items-center gap-1.5 text-sm font-normal"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value),
                  )
                }
              />
              {option.label}
            </Label>
          ))}
        </div>
      );
    }

    case "authors":
      return <AuthorEditor value={value} onChange={onChange} />;

    case "text":
      return (
        <Input
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
