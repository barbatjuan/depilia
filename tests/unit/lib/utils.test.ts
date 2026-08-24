import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names in order", () => {
    expect(cn("a", "b", false && "c", "d")).toBe("a b d");
  });

  it("merges conflicting Tailwind utilities, keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
