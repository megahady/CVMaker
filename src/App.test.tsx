import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { useDocumentStore } from "@/features/cv/store/documentStore";
import { useUiStore } from "@/features/cv/store/uiStore";

describe("App shell", () => {
  beforeEach(() => {
    useDocumentStore.getState().newDocument();
    useUiStore.getState().setActiveSectionId(null);
  });

  it("lists the default sections and opens the first one", { timeout: 15000 }, () => {
    render(<App />);
    expect(screen.getByText("Sections")).toBeTruthy();
    expect(screen.getByText("Education")).toBeTruthy();
    expect(screen.getByText("Publications")).toBeTruthy();
    expect(screen.getByLabelText("Section title")).toHaveProperty(
      "value",
      "Personal Information",
    );
  });

  it("shows the live preview with an empty-state message", { timeout: 15000 }, () => {
    render(<App />);
    expect(screen.getByText(/Nothing to preview yet/)).toBeTruthy();
  });

  it("offers template choices", { timeout: 15000 }, () => {
    render(<App />);
    expect(screen.getByLabelText("Template")).toBeTruthy();
  });
});
