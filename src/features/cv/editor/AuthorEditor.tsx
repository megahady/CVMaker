import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Author = { name: string; isMe: boolean };

function toAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Author =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Author).name === "string" &&
        typeof (item as Author).isMe === "boolean",
    );
}

/**
 * Structured author list (spec §18): separate rows for name + "is me" flag so
 * the app can later highlight the user's name or detect first authorship.
 */
export function AuthorEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const authors = toAuthors(value);

  const update = (index: number, author: Author): void => {
    onChange(authors.map((current, i) => (i === index ? author : current)));
  };

  return (
    <div className="flex flex-col gap-2">
      {authors.map((author, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="Author name"
            value={author.name}
            onChange={(event) => update(index, { ...author, name: event.target.value })}
          />
          <Label className="flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap">
            <Checkbox
              checked={author.isMe}
              onCheckedChange={(checked) =>
                update(index, { ...author, isMe: checked === true })
              }
            />
            Me
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove author"
            onClick={() => onChange(authors.filter((_, i) => i !== index))}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...authors, { name: "", isMe: false }])}
      >
        + Add author
      </Button>
    </div>
  );
}
