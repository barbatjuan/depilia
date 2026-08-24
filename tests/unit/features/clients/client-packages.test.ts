import { describe, expect, it } from "vitest";
import { summarizeClientPackages } from "@/features/clients/domain/client-packages";

describe("summarizeClientPackages", () => {
  it("computes remaining sessions as total minus used, per zone", () => {
    const summary = summarizeClientPackages([
      {
        id: "pkg-1",
        zoneId: "zone-legs",
        zoneName: "Piernas",
        totalSessions: 6,
        sessionsUsed: 2,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    expect(summary).toEqual([
      {
        id: "pkg-1",
        zoneId: "zone-legs",
        zoneName: "Piernas",
        totalSessions: 6,
        sessionsUsed: 2,
        createdAt: "2026-01-01T00:00:00Z",
        remaining: 4,
        status: "active",
      },
    ]);
  });

  it("marks a package as completed when no sessions remain", () => {
    const summary = summarizeClientPackages([
      {
        id: "pkg-2",
        zoneId: "zone-underarms",
        zoneName: "Axilas",
        totalSessions: 3,
        sessionsUsed: 3,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);

    expect(summary).toHaveLength(1);
    expect(summary[0]?.remaining).toBe(0);
    expect(summary[0]?.status).toBe("completed");
  });
});
