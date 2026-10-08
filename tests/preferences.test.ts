import { describe, expect, it } from "@jest/globals";

import { DEFAULT_PREFERENCES, mergePreferences } from "@/lib/preferences";

describe("mergePreferences", () => {
  it("falls back to defaults for missing or malformed data", () => {
    expect(mergePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(mergePreferences("nope")).toEqual(DEFAULT_PREFERENCES);
    expect(mergePreferences({ showLifetime: "no", documentLead: "whenever" })).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps valid choices and ignores unknown keys", () => {
    expect(mergePreferences({ showLifetime: false, documentLead: "late", extra: 1 })).toEqual({
      ...DEFAULT_PREFERENCES,
      showLifetime: false,
      documentLead: "late",
    });
  });
});
