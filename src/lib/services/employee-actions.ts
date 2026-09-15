"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { employees, applications, auditLogs, employmentEvents, offers, offerVersions, promotions } from "@/db/schema";
import { employeeInputSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/ats/access";
import { formatEmployeeId, workEmailTaken, employeeCompensation } from "@/lib/services/employees";

export type EmployeeFormState = {
  errors?: Record<string, string>;
  message?: string;
};

const toDate = (v?: string) => (v ? new Date(v) : null);

export async function saveEmployeeAction(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const admin = await requirePermission("employees");
  const id = String(formData.get("id") ?? "") || null;
  if (id && !z.uuid().safeParse(id).success) return { message: "Invalid employee." };

  const parsed = employeeInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors, message: "Please correct the highlighted fields." };
  }
  const v = parsed.data;
  const sourceApplicationId = String(formData.get("sourceApplicationId") ?? "") || null;
  if (sourceApplicationId && !z.uuid().safeParse(sourceApplicationId).success) return { message: "Invalid source application." };

  if (await workEmailTaken(v.workEmail, id ?? undefined)) {
    return { errors: { workEmail: "Another employee already uses this work email." } };
  }

  const values = {
    firstName: v.firstName,
    lastName: v.lastName,
    workEmail: v.workEmail,
    personalEmail: v.personalEmail || null,
    phone: v.phone || null,
    jobTitle: v.jobTitle,
    department: v.department,
    location: v.location || null,
    employmentType: v.employmentType,
    status: v.status,
    managerId: v.managerId || null,
    startDate: toDate(v.startDate),
    endDate: toDate(v.endDate),
    notes: v.notes || null,
    updatedAt: new Date(),
  };

  let employeeUuid = id;
  try {
    if (id) {
      await db.transaction(async tx => {
        const [previous] = await tx.select().from(employees).where(eq(employees.id, id)).for("update");
        if (!previous) throw new Error("Employee not found.");
        if (values.managerId === id) throw new Error("An employee cannot report to themselves.");
        const roleChanged = previous.jobTitle !== values.jobTitle || previous.department !== values.department || previous.location !== values.location || previous.managerId !== values.managerId || previous.employmentType !== values.employmentType;
        if (roleChanged || previous.workEmail !== values.workEmail) {
          const [pending] = await tx.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.employeeId, id), notInArray(promotions.status, ["DECLINED", "WITHDRAWN", "EXPIRED", "EFFECTIVE"]))).limit(1);
          if (pending) throw new Error("A promotion is in progress. Complete or withdraw it before changing employment details or the signing email.");
        }
        const pay = await employeeCompensation(id, tx);
        await tx.update(employees).set(values).where(eq(employees.id, id));
        if (roleChanged || previous.status !== values.status) await tx.insert(employmentEvents).values({
          employeeId: id, eventType: values.status === "TERMINATED" ? "TERMINATED" : roleChanged ? "TRANSFERRED" : "STATUS_CHANGED",
          previousJobTitle: previous.jobTitle, jobTitle: values.jobTitle, previousDepartment: previous.department, department: values.department,
          previousLocation: previous.location, location: values.location, annualSalaryCents: pay?.annualSalaryCents, hourlyRateCents: pay?.hourlyRateCents,
          effectiveDate: new Date(), createdBy: admin.id, note: `Administrative update. Status: ${previous.status} → ${values.status}.`,
        });
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "ADMIN_UPDATED_EMPLOYEE", entityType: "employee", entityId: id,
          metadata: { previousTitle: previous.jobTitle, title: values.jobTitle, previousStatus: previous.status, status: values.status } });
      });
    } else {
      await db.transaction(async tx => {
        if (sourceApplicationId) {
          const [candidate] = await tx.select().from(applications).where(eq(applications.id, sourceApplicationId)).for("update");
          if (!candidate || candidate.status !== "HIRED") throw new Error("Candidate must be hired before conversion.");
        }
        const [row] = await tx.insert(employees).values({ ...values, sourceApplicationId, employeeId: `P-${crypto.randomUUID().slice(0,24)}`, createdBy: admin.id }).returning({ id: employees.id, sequence: employees.sequence });
        if (!row) throw new Error("Insert returned no row");
        const employeeId = formatEmployeeId(row.sequence);
        await tx.update(employees).set({ employeeId }).where(eq(employees.id, row.id));
        employeeUuid = row.id;
        const [accepted] = sourceApplicationId ? await tx.select({ version: offerVersions }).from(offers).innerJoin(offerVersions, eq(offerVersions.id, offers.acceptedVersionId)).where(eq(offers.applicationId, sourceApplicationId)).limit(1) : [];
        await tx.insert(employmentEvents).values({ employeeId: row.id, eventType: "HIRED", jobTitle: values.jobTitle,
          department: values.department, location: values.location, effectiveDate: values.startDate ?? new Date(),
          annualSalaryCents: accepted?.version.annualSalaryCents, hourlyRateCents: accepted?.version.hourlyRateCents, createdBy: admin.id });
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "ADMIN_CREATED_EMPLOYEE", entityType: "employee", entityId: row.id, metadata: { employeeId } });
        if (sourceApplicationId) await tx.insert(auditLogs).values({ adminId: admin.id, action: "CANDIDATE_CONVERTED_TO_EMPLOYEE", entityType: "application", entityId: sourceApplicationId, metadata: { employeeId: row.id } });
      });
    }
  } catch (err) {
    console.error("[employees] save failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: err instanceof Error && !("query" in err) ? err.message : "Could not save this employee. Please try again." };
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin");
  redirect(`/admin/employees/${employeeUuid}?saved=1`);
}

export async function setEmployeeStatusAction(formData: FormData) {
  const admin = await requirePermission("employees");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["ACTIVE", "ON_LEAVE", "TERMINATED"].includes(status)) return;

  if (!z.uuid().safeParse(id).success) return;
  await db.transaction(async tx => {
    const [current] = await tx.select().from(employees).where(eq(employees.id, id)).for("update");
    if (!current || current.status === status) return;
    const pay = await employeeCompensation(id, tx);
    await tx.update(employees).set({ status: status as "ACTIVE", endDate: status === "TERMINATED" ? current.endDate ?? new Date() : null, updatedAt: new Date() }).where(eq(employees.id, id));
    await tx.insert(employmentEvents).values({ employeeId: id, eventType: status === "TERMINATED" ? "TERMINATED" : "STATUS_CHANGED",
      jobTitle: current.jobTitle, department: current.department, location: current.location,
      annualSalaryCents: pay?.annualSalaryCents, hourlyRateCents: pay?.hourlyRateCents,
      effectiveDate: new Date(), createdBy: admin.id, note: `${current.status} → ${status}` });
    await tx.insert(auditLogs).values({ adminId: admin.id, action: "ADMIN_CHANGED_EMPLOYEE_STATUS", entityType: "employee", entityId: id, metadata: { from: current.status, to: status } });
  });

  revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/admin/employees");
}
