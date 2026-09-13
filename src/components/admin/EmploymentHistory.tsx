import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { employmentHistory, promotionsForEmployee } from "@/lib/promotions/data";
import { promotionStatusLabel, formatCurrency, calendarDate } from "@/lib/format";
import { Card, StatusPill } from "./ui";
import { t } from "./form";

const money = (cents?: number | null) => (cents == null ? null : formatCurrency(cents));

const eventLabel: Record<string, string> = {
  HIRED: "Hired",
  PROMOTED: "Promoted",
  TRANSFERRED: "Transferred",
  COMPENSATION_CHANGED: "Compensation changed",
  STATUS_CHANGED: "Status changed",
  TERMINATED: "Terminated",
};

/**
 * The employee's employment history and any promotion in flight.
 *
 * History reads from employment_events, which is append-only — a promotion
 * writes one row when it takes effect and nothing ever updates or deletes it,
 * so previous titles and compensation survive every later change.
 *
 * Deliberately compact: this is a record of what changed and when, with a link
 * to the signed document, not an HRIS.
 */
export async function EmploymentHistory({
  employeeId, hiredOn, currentTitle, canViewDocuments,
}: {
  employeeId: string;
  hiredOn?: Date | null;
  currentTitle: string;
  canViewDocuments: boolean;
}) {
  const [events, promotions] = await Promise.all([
    employmentHistory(employeeId),
    promotionsForEmployee(employeeId),
  ]);

  // A promotion that has not taken effect yet is shown separately: it is not
  // history, it is something the admin may still need to act on.
  const inFlight = promotions.filter(
    p => !["EFFECTIVE", "DECLINED", "WITHDRAWN", "EXPIRED"].includes(p.promotion.status),
  );

  return (
    <div className="space-y-5">
      {inFlight.length > 0 && (
        <Card title="Promotion in progress">
          <ul className="space-y-3">
            {inFlight.map(({ promotion, version }) => (
              <li key={promotion.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`${t.body} font-medium text-ink-900`}>
                    {version?.jobTitle ?? "Promotion"}
                  </p>
                  <p className={`mt-0.5 ${t.hint} text-graphite-600`}>
                    {version ? `Effective ${calendarDate(version.effectiveDate)}` : "Draft"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill
                    status={promotion.status === "ACCEPTED" ? "APPROVED" : promotion.status}
                    label={promotionStatusLabel[promotion.status] ?? promotion.status}
                  />
                  <Link href={`/admin/promotions/${promotion.id}`} className={`${t.hint} font-medium text-ink-900 underline underline-offset-4`}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Employment history">
        {events.length === 0 ? (
          <div>
            {hiredOn ? (
              <div className="border-l-2 border-flame-500 pl-3">
                <p className={`${t.body} font-medium text-ink-900`}>Hired</p>
                <p className={`mt-0.5 ${t.hint} text-graphite-600`}>{currentTitle}</p>
                <p className={`mt-0.5 ${t.hint} text-graphite-500`}>{calendarDate(hiredOn)}</p>
              </div>
            ) : (
              <p className={`${t.body} text-graphite-500`}>No recorded changes yet.</p>
            )}
          </div>
        ) : (
          <ol className="space-y-4">
            {events.map(({ event, promotion }) => {
              const from = money(event.previousAnnualSalaryCents) ?? money(event.previousHourlyRateCents);
              const to = money(event.annualSalaryCents) ?? money(event.hourlyRateCents);
              return (
                <li key={event.id} className="border-l-2 border-paper-300 pl-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={`${t.body} font-medium text-ink-900`}>
                      {eventLabel[event.eventType] ?? event.eventType}
                    </p>
                    <span className={`${t.hint} text-graphite-500`}>{calendarDate(event.effectiveDate)}</span>
                  </div>
                  {event.jobTitle && (
                    <p className={`mt-0.5 ${t.body} text-graphite-700`}>{event.jobTitle}</p>
                  )}
                  <p className={`mt-0.5 ${t.hint} text-graphite-500`}>
                    {[
                      event.previousJobTitle && event.jobTitle !== event.previousJobTitle
                        ? `from ${event.previousJobTitle}` : null,
                      event.department && event.previousDepartment
                        && event.department !== event.previousDepartment
                        ? `${event.previousDepartment} → ${event.department}` : null,
                      from && to && from !== to ? `${from} → ${to}` : to ? to : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {canViewDocuments && promotion && (
                    <a
                      href={`/admin/promotions/${promotion.id}/signed`}
                      target="_blank" rel="noopener noreferrer"
                      className={`mt-1.5 inline-flex items-center gap-1 ${t.hint} font-medium text-ink-900 underline underline-offset-4`}
                    >
                      Signed letter
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </li>
              );
            })}
            {/* Only synthesised when the history has no HIRED row of its own;
                otherwise the hire would be listed twice. */}
            {hiredOn && !events.some(e => e.event.eventType === "HIRED") && (
              <li className="border-l-2 border-flame-500 pl-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`${t.body} font-medium text-ink-900`}>Hired</p>
                  <span className={`${t.hint} text-graphite-500`}>{calendarDate(hiredOn)}</span>
                </div>
              </li>
            )}
          </ol>
        )}
      </Card>
    </div>
  );
}
