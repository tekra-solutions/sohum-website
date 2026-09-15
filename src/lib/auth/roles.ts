/** Role checks. Kept out of the "use server" modules, which may only export
 *  async functions. */

/** Only a SUPER_ADMIN may create or disable admin accounts. */
export function canManageAdmins(role: string) {
  return role === "SUPER_ADMIN";
}

/** Product-facing descriptions of the existing RBAC roles. */
export const adminRoleDetails: Record<string, { label: string; description: string }> = {
  RECRUITER: { label: "Recruiter", description: "Assigned candidates, offers and interview feedback." },
  HIRING_MANAGER: { label: "Hiring manager", description: "Candidates and feedback for assigned jobs. No compensation access." },
  RECRUITING_ADMIN: { label: "Recruiting admin", description: "Recruiting, approvals, employees, reports and invoices." },
  ADMIN: { label: "Admin", description: "Operations, settings and audit logs. Cannot manage admin accounts." },
  SUPER_ADMIN: { label: "Super admin", description: "Full access, including creating accounts and managing team access." },
};
