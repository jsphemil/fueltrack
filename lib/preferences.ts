// Customisation settings. Stored on the user's row (User.preferences) so they
// follow the user across devices; null there means "all defaults". Pure module:
// shared by the API, the validators and the app.

// Days before a document expires at which to remind.
export const DOCUMENT_LEADS = {
  early: { label: "Early: 60 and 14 days before", days: [60, 14] },
  standard: { label: "Standard: 30 and 7 days before", days: [30, 7] },
  late: { label: "Late: 7 days before", days: [7] },
} as const;

export type DocumentLead = keyof typeof DOCUMENT_LEADS;

export type Preferences = {
  showLastFill: boolean;
  showReserveRange: boolean;
  showRecentMileage: boolean;
  showLifetime: boolean;
  documentLead: DocumentLead;
};

export const DEFAULT_PREFERENCES: Preferences = {
  showLastFill: true,
  showReserveRange: true,
  showRecentMileage: true,
  showLifetime: true,
  documentLead: "standard",
};

export const PREFERENCE_FLAGS = ["showLastFill", "showReserveRange", "showRecentMileage", "showLifetime"] as const;

// Unknown or badly typed values fall back to the defaults.
export function mergePreferences(stored: unknown): Preferences {
  const source = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const flag = (key: (typeof PREFERENCE_FLAGS)[number]) =>
    typeof source[key] === "boolean" ? (source[key] as boolean) : DEFAULT_PREFERENCES[key];
  const lead = typeof source.documentLead === "string" && source.documentLead in DOCUMENT_LEADS ? (source.documentLead as DocumentLead) : DEFAULT_PREFERENCES.documentLead;
  return {
    showLastFill: flag("showLastFill"),
    showReserveRange: flag("showReserveRange"),
    showRecentMileage: flag("showRecentMileage"),
    showLifetime: flag("showLifetime"),
    documentLead: lead,
  };
}

export function isDefaultPreferences(preferences: Preferences) {
  return (Object.keys(DEFAULT_PREFERENCES) as Array<keyof Preferences>).every((key) => preferences[key] === DEFAULT_PREFERENCES[key]);
}
