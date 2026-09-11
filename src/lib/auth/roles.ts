/** Role checks. Kept out of the "use server" modules, which may only export
 *  async functions. */

/** Only a SUPER_ADMIN may create or disable admin accounts. */
export function canManageAdmins(role: string) {
  return role === "SUPER_ADMIN";
}
