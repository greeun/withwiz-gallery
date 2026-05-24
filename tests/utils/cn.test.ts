import { describe, it, expect } from "vitest";
import { cn } from "../../src/utils/cn";

describe("cn (clsx + tailwind-merge)", () => {
  it("merges class strings", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", true && "shown")).toContain("shown");
  });
});
