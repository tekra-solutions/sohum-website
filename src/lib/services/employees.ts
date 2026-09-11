import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { employees } from "@/db/schema";

/** SOH-EMP-0042 — derived from the row's own Postgres sequence. */
export const formatEmployeeId = (sequence: number) =>
  `SOH-EMP-${String(sequence).padStart(4, "0")}`;

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error(`[employees] ${label} failed`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

export type EmployeeFilters = {
  q?: string;
  status?: string;
  department?: string;
  sort?: "name" | "newest" | "employeeId";
  page?: number;
  pageSize?: number;
};

export async function listEmployees(f: EmployeeFilters = {}) {
  return safe(
    "list",
    () => queryEmployees(f),
    { rows: [], total: 0, page: 1, pageSize: 25, pageCount: 1 },
  );
}

async function queryEmployees(f: EmployeeFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, f.pageSize ?? 25));

  const where = [];
  if (f.q?.trim()) {
    const term = `%${f.q.trim()}%`;
    where.push(
      or(
        ilike(employees.firstName, term),
        ilike(employees.lastName, term),
        ilike(employees.workEmail, term),
        ilike(employees.employeeId, term),
        ilike(employees.jobTitle, term),
      )!,
    );
  }
  if (f.status && f.status !== "ALL") {
    where.push(eq(employees.status, f.status as "ACTIVE"));
  }
  if (f.department && f.department !== "ALL") {
    where.push(eq(employees.department, f.department));
  }
  const clause = where.length ? and(...where) : undefined;

  const order =
    f.sort === "newest" ? desc(employees.createdAt)
    : f.sort === "employeeId" ? asc(employees.sequence)
    : asc(employees.lastName);

  const rows = await db
    .select()
    .from(employees)
    .where(clause)
    .orderBy(order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [totalRow] = await db.select({ n: count() }).from(employees).where(clause);
  const total = totalRow?.n ?? 0;

  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export const getEmployeeById = (id: string) =>
  safe("get", () => db.query.employees.findFirst({ where: eq(employees.id, id) }), undefined);

/** Active colleagues, for the manager picker. Excludes the employee being edited. */
export async function managerOptions(excludeId?: string) {
  return safe(
    "managerOptions",
    async () =>
      db
        .select({
          id: employees.id,
          employeeId: employees.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          jobTitle: employees.jobTitle,
        })
        .from(employees)
        .where(
          excludeId
            ? and(eq(employees.status, "ACTIVE"), ne(employees.id, excludeId))
            : eq(employees.status, "ACTIVE"),
        )
        .orderBy(asc(employees.lastName)),
    [],
  );
}

export async function employeeDepartments() {
  return safe(
    "departments",
    async () => {
      const rows = await db
        .selectDistinct({ department: employees.department })
        .from(employees)
        .orderBy(asc(employees.department));
      return rows.map((r) => r.department).filter(Boolean);
    },
    [],
  );
}

export async function employeeStats() {
  return safe(
    "stats",
    async () => {
      const [row] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${employees.status} = 'ACTIVE')::int`,
          onLeave: sql<number>`count(*) filter (where ${employees.status} = 'ON_LEAVE')::int`,
          terminated: sql<number>`count(*) filter (where ${employees.status} = 'TERMINATED')::int`,
        })
        .from(employees);
      return {
        total: row?.total ?? 0,
        active: row?.active ?? 0,
        onLeave: row?.onLeave ?? 0,
        terminated: row?.terminated ?? 0,
      };
    },
    { total: 0, active: 0, onLeave: 0, terminated: 0 },
  );
}

/** True when the work email is already taken by a different employee. */
export async function workEmailTaken(email: string, excludeId?: string) {
  const existing = await db.query.employees.findFirst({
    where: sql`lower(${employees.workEmail}) = ${email.toLowerCase()}`,
    columns: { id: true },
  });
  return Boolean(existing && existing.id !== excludeId);
}
