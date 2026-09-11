export const stages = ["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
export const sources = ["Company Website", "LinkedIn", "Indeed", "Referral", "Employee Referral", "GovernmentJobs", "Job Board", "Recruiter", "Other"] as const;
export const interviewTypes = ["Technical", "HR", "Managerial", "Phone", "Video", "Onsite"] as const;
export const interviewStatuses = ["Scheduled", "Completed", "Cancelled", "Rescheduled"] as const;
/**
 * `offers` is separate from `candidates` on purpose: offer records carry
 * compensation, which is a distinct sensitivity from the rest of a candidate
 * record. A HIRING_MANAGER assigned to a job can see that job's candidates in
 * order to give interview feedback, but must never see their salary.
 */
export const permissions = {
  SUPER_ADMIN: ["manage", "candidates", "offers", "feedback", "employees", "reports", "audit", "settings"],
  ADMIN: ["manage", "candidates", "offers", "feedback", "employees", "reports", "audit", "settings"],
  RECRUITING_ADMIN: ["manage", "candidates", "offers", "feedback", "employees", "reports"],
  RECRUITER: ["candidates", "offers", "feedback"],
  HIRING_MANAGER: ["feedback"],
} as const;
export type Permission = typeof permissions.SUPER_ADMIN[number];
export function permits(role: string, permission: Permission) {
  return ((permissions[role as keyof typeof permissions] ?? []) as readonly string[]).includes(permission);
}
export function unrestricted(role: string) { return permits(role, "manage"); }
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export const templateVariables = ["candidate_first_name", "candidate_last_name", "job_title", "interview_date", "interview_time", "company_name"] as const;
export function validateTemplate(text: string) {
  const tokens = [...text.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(m => m[1]);
  if (tokens.some(t => !(templateVariables as readonly string[]).includes(t)) || /[{}]/.test(text.replace(/{{\s*([^{}]+?)\s*}}/g, ""))) return false;
  return true;
}
export function renderTemplate(text: string, values: Record<string, string>) {
  if (!validateTemplate(text)) throw new Error("Unsupported template variable.");
  return text.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => {
    if (!values[key]) throw new Error(`Complete ${key.replaceAll("_", " ")} before sending.`);
    return values[key];
  });
}
export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function positivePage(value: unknown) { const n = Number(value); return Number.isFinite(n) ? Math.max(1, Math.min(100000, Math.floor(n))) : 1; }
