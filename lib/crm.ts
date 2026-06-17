export interface CrmOption {
  id: string;
  name: string;
  enabled: boolean;
  /** Short note on what the connection enables / how to get the key. */
  note?: string;
}

// CRM integrations are coming soon: the connection UI is a preview, none are
// connectable yet. Flip `enabled` to true (starting with HighLevel) once the
// save-to-CRM / send-from-CRM endpoints exist.
export const CRM_OPTIONS: CrmOption[] = [
  {
    id: "highlevel",
    name: "HighLevel",
    enabled: false,
    note: "Find your Private Integration token and Location ID in HighLevel under Settings.",
  },
  { id: "hubspot", name: "HubSpot", enabled: false },
  { id: "salesforce", name: "Salesforce", enabled: false },
  { id: "pipedrive", name: "Pipedrive", enabled: false },
  { id: "zoho", name: "Zoho CRM", enabled: false },
];

export const CRM_ENABLED = CRM_OPTIONS.some((c) => c.enabled);

export const ENABLED_CRM_IDS = new Set(
  CRM_OPTIONS.filter((c) => c.enabled).map((c) => c.id),
);

export function crmName(id: string | null) {
  return CRM_OPTIONS.find((c) => c.id === id)?.name ?? null;
}
