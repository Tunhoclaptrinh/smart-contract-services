/**
 * System roles (spec 17). Three internal roles keep SoD-1: the controller handles exceptions, the
 * system administrator manages configuration and accounts, the auditor only reads. A company's
 * own administrator (ORG_ADMIN) manages the business accounts of that company and nothing else.
 */
export type Role =
  | "CONTRACT_OWNER"
  | "FINANCE_APPROVER"
  | "SECONDARY_APPROVER"
  | "LEGAL_REVIEWER"
  | "ADMIN_AUDITOR"
  | "SYSTEM_ADMIN"
  | "AUDITOR"
  | "SUPPLIER"
  | "ORG_ADMIN";

/**
 * Roles of the platform operator (organisation OPS). None of them is a party to a contract, so
 * none of them reads contract content: the administrator configures, the integrity checker sees
 * hashes, anchors and proofs only (spec 2.2).
 */
export const INTERNAL_ROLES: Role[] = ["SYSTEM_ADMIN", "AUDITOR"];

/**
 * Roles a company administrator may give, by the kind of its company (same table as
 * ORG_ADMIN_ASSIGNABLE in packages/contracts). Controllers, other administrators and platform
 * roles stay with the system administrator, so a company never appoints its own controller (SoD-1).
 */
export const ORG_ADMIN_ASSIGNABLE: Record<"BUYER" | "SUPPLIER", Role[]> = {
  BUYER: [
    "CONTRACT_OWNER",
    "FINANCE_APPROVER",
    "SECONDARY_APPROVER",
    "LEGAL_REVIEWER",
  ],
  SUPPLIER: ["SUPPLIER"],
};

/**
 * Why a company administrator may not hold `account` (role, company, party), or null when it may:
 * a business account of its own company, acting for that company or one of its approvers.
 */
export function orgAdminRefusal(
  actor: { role: Role; organizationId: string },
  account: { role?: unknown; organizationId?: unknown; partyId?: unknown },
  tables: { organizations: RecordLike[]; parties: RecordLike[] },
): string | null {
  if (actor.role !== "ORG_ADMIN") return null;
  if (account.organizationId !== actor.organizationId)
    return "OTHER_ORGANIZATION";
  const kind = tables.organizations.find(
    (org) => org.id === actor.organizationId,
  )?.kind as "BUYER" | "SUPPLIER" | undefined;
  if (!kind || !ORG_ADMIN_ASSIGNABLE[kind]?.includes(account.role as Role))
    return "ROLE_NOT_ASSIGNABLE";
  const party = account.partyId;
  if (party !== undefined && party !== null && party !== "") {
    const row = tables.parties.find((p) => p.party_id === party);
    if (
      !row ||
      (row.party_id !== actor.organizationId &&
        row.parent_party_id !== actor.organizationId)
    )
      return "OTHER_ORGANIZATION";
  }
  return null;
}
type RecordLike = Record<string, unknown>;
