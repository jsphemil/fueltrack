import { describe, expect, it } from "@jest/globals";

import { activeWithin, ERROR_MESSAGE_MAX, errorMessage, signupsByWeek } from "@/lib/admin-stats";

const NOW = new Date("2026-11-10T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("errorMessage", () => {
  it("masks emails and keeps one line", () => {
    expect(errorMessage(new Error("No user\n  rider@example.com found"))).toBe("Error: No user [email] found");
  });

  it("caps the length", () => {
    const message = errorMessage(new Error("x".repeat(2000)));
    expect(message.length).toBe(ERROR_MESSAGE_MAX);
    expect(message.endsWith("…")).toBe(true);
  });

  it("handles non-Error values", () => {
    expect(errorMessage("plain text")).toBe("plain text");
  });
});

describe("signupsByWeek", () => {
  it("buckets dates into the last 8 weeks, oldest first", () => {
    const weeks = signupsByWeek([daysAgo(1), daysAgo(3), daysAgo(10), daysAgo(100)], NOW);
    expect(weeks).toHaveLength(8);
    expect(weeks[7].count).toBe(2); // this week
    expect(weeks[6].count).toBe(1); // last week
    expect(weeks.reduce((sum, week) => sum + week.count, 0)).toBe(3); // 100 days ago is outside
  });
});

describe("activeWithin", () => {
  it("counts recent activity and ignores none", () => {
    const last = [daysAgo(2), daysAgo(20), null, daysAgo(40)];
    expect(activeWithin(last, NOW, 7)).toBe(1);
    expect(activeWithin(last, NOW, 30)).toBe(2);
  });
});
