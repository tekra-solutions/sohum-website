"use server";

import { z } from "zod";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, applications, auditLogs } from "@/db/schema";
import { employeeInputSchema } from "@/lib/validation/schemas";
import { requirePermission } from "@/lib/ats/access";
import { audit } from "@/lib/audit";
import { formatEmployeeId, workEmailTaken } from "@/lib/services/employees";

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
      await db.update(employees).set(values).where(eq(employees.id, id));
      await audit({
        adminId: admin.id,
        action: "ADMIN_UPDATED_EMPLOYEE",
        entityType: "employee",
        entityId: id,
        metadata: { workEmail: v.workEmail },
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
        await tx.insert(auditLogs).values({ adminId: admin.id, action: "ADMIN_CREATED_EMPLOYEE", entityType: "employee", entityId: row.id, metadata: { employeeId } });
        if (sourceApplicationId) await tx.insert(auditLogs).values({ adminId: admin.id, action: "CANDIDATE_CONVERTED_TO_EMPLOYEE", entityType: "application", entityId: sourceApplicationId, metadata: { employeeId: row.id } });
      });
    }
  } catch (err) {
    console.error("[employees] save failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { message: "Could not save this employee. Please try again." };
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

  const current = await db.query.employees.findFirst({
    where: eq(employees.id, id),
    columns: { employeeId: true, endDate: true },
  });
  if (!current) return;

  await db
    .update(employees)
    .set({
      status: status as "ACTIVE",
      // Terminating without an explicit end date stamps today, so the record
      // is never left in a contradictory state.
      endDate: status === "TERMINATED" ? (current.endDate ?? new Date()) : current.endDate,
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id));

  await audit({
    adminId: admin.id,
    action: "ADMIN_CHANGED_EMPLOYEE_STATUS",
    entityType: "employee",
    entityId: id,
    metadata: { employeeId: current.employeeId, status },
  });

  revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/admin/employees");
}
