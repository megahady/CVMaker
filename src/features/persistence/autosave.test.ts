import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";
import type { CvDocument } from "@/features/cv/schema/document";
import type { CvRepository, ReadResult, WriteResult } from "./CvRepository";
import { startAutosave } from "./autosave";

const noopResult: ReadResult = { ok: false, error: "unused" };

function fakeRepository() {
  return {
    pickForOpen: vi.fn(async (): Promise<string | null> => null),
    pickForSave: vi.fn(async (): Promise<string | null> => null),
    read: vi.fn(async (): Promise<ReadResult> => noopResult),
    write: vi.fn(
      async (): Promise<WriteResult> => ({ ok: true }),
    ),
    readAutosave: vi.fn(async (): Promise<ReadResult | null> => null),
    writeAutosave: vi.fn(
      async (_document: CvDocument): Promise<WriteResult> => ({ ok: true }),
    ),
    clearAutosave: vi.fn(async (): Promise<void> => undefined),
    pickForTexExport: vi.fn(async (): Promise<string | null> => null),
    writeTex: vi.fn(
      async (_path: string, _contents: string): Promise<WriteResult> => ({
        ok: true,
      }),
    ),
    pickForPdfExport: vi.fn(async (): Promise<string | null> => null),
    exportPdf: vi.fn(
      async (_contents: string, _outPath: string): Promise<WriteResult> => ({
        ok: true,
      }),
    ),
  } satisfies CvRepository;
}

let repository: ReturnType<typeof fakeRepository>;
let stop: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  repository = fakeRepository();
  useDocumentStore.getState().newDocument();
  useUiStore.getState().setAutosaveStatus("idle");
});

afterEach(() => {
  stop?.();
  stop = null;
  vi.useRealTimers();
});

function typeIntoProfile(value: string): void {
  const profile = useDocumentStore
    .getState()
    .document.sections.find((section) => section.definitionId === "profile");
  useDocumentStore.getState().updateEntry(profile!.id, 0, "fullName", value);
}

describe("autosave", () => {
  it("writes after the debounce delay, not per keystroke", async () => {
    stop = startAutosave(repository, 2000);

    typeIntoProfile("J");
    await vi.advanceTimersByTimeAsync(500);
    typeIntoProfile("Jo");
    await vi.advanceTimersByTimeAsync(500);
    typeIntoProfile("John");

    expect(repository.writeAutosave).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);
    expect(repository.writeAutosave).toHaveBeenCalledTimes(1);

    const saved = repository.writeAutosave.mock.calls[0]?.[0];
    const fullName = saved?.sections
      .find((section) => section.definitionId === "profile")
      ?.entries[0]?.fullName;
    expect(fullName).toBe("John");
    expect(useUiStore.getState().autosaveStatus).toBe("saved");
  });

  it("does not rewrite identical content", async () => {
    stop = startAutosave(repository, 1000);

    typeIntoProfile("Jane");
    await vi.advanceTimersByTimeAsync(1000);
    expect(repository.writeAutosave).toHaveBeenCalledTimes(1);

    // An edit that leaves the document JSON unchanged should not re-write
    typeIntoProfile("Jane");
    await vi.advanceTimersByTimeAsync(1000);

    expect(repository.writeAutosave).toHaveBeenCalledTimes(1);
  });

  it("reports failures instead of throwing", async () => {
    repository.writeAutosave.mockResolvedValueOnce({
      ok: false,
      error: "disk full",
    });
    stop = startAutosave(repository, 100);

    typeIntoProfile("X");
    await vi.advanceTimersByTimeAsync(100);

    expect(useUiStore.getState().autosaveStatus).toBe("error");
  });

  it("stops writing after the subscription is disposed", async () => {
    stop = startAutosave(repository, 100);
    typeIntoProfile("before stop");
    stop();
    stop = null;

    await vi.advanceTimersByTimeAsync(5000);
    expect(repository.writeAutosave).not.toHaveBeenCalled();
  });
});
