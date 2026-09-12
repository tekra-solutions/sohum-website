import Link from "next/link";
import { candidateWorkspace } from "@/lib/ats/data";
import { requireApplication } from "@/lib/ats/access";
import { permits, sources, interviewTypes, interviewStatuses } from "@/lib/ats/policy";
import { allowedTransitions } from "@/lib/ats/transitions";
import { applicationStatusLabel, offerStatusLabel, formatCurrency, formatDateTime, shortDate } from "@/lib/format";
import { canEditOffer, type OfferStatus } from "@/lib/offers/policy";
import { WorkflowForm, WorkflowField as Field } from "./WorkflowForm";
import { CandidateEmail } from "./CandidateEmail";
import { Card, StatusPill, adminButtonSecondary } from "./ui";
import { Tabs } from "./Tabs";
import { t } from "./form";

const options = (values: readonly string[]) => values.map(value => ({ value, label: value }));

/** Muted note used under a form or an empty list. */
function Muted({ children }: { children: React.ReactNode }) {
  return <p className={`${t.hint} text-graphite-600`}>{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={`py-2 ${t.body} text-graphite-500`}>{children}</p>;
}

/**
 * Everything a recruiter does to a candidate, organised as tabs.
 *
 * This was previously eleven stacked sections — stage, offer, notes,
 * interviews, feedback, email, email history, reminders and activity all
 * expanded at once, each with its own always-visible form, under an anchor
 * nav that merely scrolled between them. The page was several screens tall
 * before a recruiter could read the resume.
 *
 * Tabs show one job at a time; rare operations (assignment, archiving,
 * starring, out-of-band hire) sit behind "Manage" on the Overview tab so the
 * common path — read, move stage, note, schedule — is what is on screen.
 */
export async function CandidateWorkspace({
  id,
  jobTitle,
  tab = "overview",
  profile,
}: {
  id: string;
  jobTitle: string;
  tab?: string;
  /** The candidate's own details, shown at the top of the Overview tab. */
  profile?: React.ReactNode;
}) {
  const { admin, app } = await requireApplication(id);
  const w = await candidateWorkspace(id);
  const canEdit = permits(admin.role, "candidates");
  const canSeeOffers = permits(admin.role, "offers");
  const nextInterview = [...w.meetings].reverse().find(i => ["Scheduled", "Rescheduled"].includes(i.status) && i.startsAt > new Date());

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "notes", label: "Notes", count: w.notes.length },
    { id: "interviews", label: "Interviews", count: w.meetings.length },
    ...(canEdit ? [{ id: "email", label: "Email", count: w.messages.length }] : []),
    { id: "activity", label: "Activity" },
  ];
  const active = tabs.some(x => x.id === tab) ? tab : "overview";
  const tabHref = (next: string) => `/admin/applications/${id}?tab=${next}#workspace`;

  return (
    <div id="workspace" className="mt-6 scroll-mt-24">
      {w.duplicates.length > 0 && (
        <div className="mb-4 rounded-[4px] border border-[#7a5c00]/30 bg-[#f0a93c]/[0.08] px-5 py-3.5">
          <p className={`${t.body} font-medium text-ink-900`}>This candidate may already exist</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {w.duplicates.map(d => (
              <Link key={d.id} href={`/admin/applications/${d.id}`} className={`${t.hint} text-graphite-700 underline underline-offset-4`}>
                {d.firstName} {d.lastName} · {d.job} · {d.reference}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Tabs tabs={tabs} active={active} href={tabHref} label="Candidate workspace" />

      <div className="mt-5">
        {active === "overview" && (
          // Two explicit columns rather than auto-flow: the candidate's own
          // record reads down the left, the recruiter's working controls down
          // the right. Auto-placed cards of differing heights interleaved
          // across the two, which put "Cover letter" opposite "Stage".
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-5">{profile}</div>
            <div className="space-y-5">
            {canEdit && (
              <Card title="Stage" id="stage">
                <WorkflowForm applicationId={id} kind="status" label="Update stage">
                  <Field
                    name="status"
                    label="Current stage"
                    value={app.status}
                    options={[app.status, ...allowedTransitions(app.status, { hasEmployee: Boolean(w.employeeId) })].map(value => ({ value, label: applicationStatusLabel[value] }))}
                  />
                </WorkflowForm>
                {w.employeeId && <Muted>This candidate is now an employee, so their stage is locked.</Muted>}

                {app.status === "HIRED" && permits(admin.role, "employees") && (
                  <Link href={w.employeeId ? `/admin/employees/${w.employeeId}` : `/admin/employees/new?applicationId=${id}`} className={`mt-4 ${adminButtonSecondary}`}>
                    {w.employeeId ? "Open employee record" : "Create employee record"}
                  </Link>
                )}

                {/* Rare operations, out of the way of the daily path. */}
                <details className="mt-5 border-t border-paper-200 pt-4">
                  <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Manage candidate</summary>
                  <div className="mt-4 space-y-5">
                    <WorkflowForm applicationId={id} kind="profile" label="Save profile">
                      <Field name="skills" label="Skills" value={app.skills} />
                      <Field name="tags" label="Tags, separated by commas" value={app.tags.join(", ")} />
                      <Field name="source" label="Application source" value={app.source || "Company Website"} options={options([...new Set([...sources, ...(app.source ? [app.source] : [])])])} />
                    </WorkflowForm>

                    {permits(admin.role, "manage") && (
                      <WorkflowForm applicationId={id} kind="assign" label="Assign recruiter">
                        <Field
                          name="assignedTo"
                          label="Recruiter"
                          value={app.assignedTo ?? ""}
                          options={[{ value: "", label: "Unassigned" }, ...w.staff.filter(s => permits(s.role, "candidates")).map(s => ({ value: s.id, label: s.name }))]}
                        />
                      </WorkflowForm>
                    )}

                    <WorkflowForm applicationId={id} kind="star" label={w.starred ? "Remove star" : "Star candidate"}>
                      <input type="hidden" name="starred" value={w.starred ? "0" : "1"} />
                      <Muted>Starred candidates can be filtered on the Candidates list.</Muted>
                    </WorkflowForm>

                    <WorkflowForm applicationId={id} kind="archive" label={app.archivedAt ? "Restore application" : "Archive application"}>
                      <input type="hidden" name="restore" value={app.archivedAt ? "1" : "0"} />
                      <Muted>Archived applications keep their full history and can be restored.</Muted>
                    </WorkflowForm>

                    {app.status === "OFFER" && !w.employeeId && permits(admin.role, "manage") && (
                      <WorkflowForm
                        applicationId={id}
                        kind="status"
                        label="Record hire made outside the system"
                        confirm={{
                          message: "This marks the candidate Hired without an accepted offer in the system. Use it only for an offer agreed outside the platform — it is recorded in the audit log against your name.",
                          confirmLabel: "Record hire",
                        }}
                      >
                        <input type="hidden" name="status" value="HIRED" />
                        <input type="hidden" name="allowDirectHire" value="1" />
                      </WorkflowForm>
                    )}
                  </div>
                </details>
              </Card>
            )}

            {canSeeOffers && (
              <Card title="Offer" id="offer">
                {w.offer ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill status={w.offer.offer.status} label={offerStatusLabel[w.offer.offer.status]} />
                      {w.offer.version && <span className={`${t.body} text-ink-900`}>{w.offer.version.jobTitle}</span>}
                    </div>
                    {w.offer.version && (
                      <p className={`${t.hint} text-graphite-600`}>
                        {w.offer.version.annualSalaryCents != null
                          ? formatCurrency(w.offer.version.annualSalaryCents)
                          : w.offer.version.hourlyRateCents != null
                            ? `${formatCurrency(w.offer.version.hourlyRateCents)}/hr`
                            : "No compensation set"}
                        {" · "}Start {shortDate(w.offer.version.startDate)}
                      </p>
                    )}
                    {/* One route into the offer: its own screen owns send,
                        approve, withdraw and extend. Duplicating "Send offer"
                        here linked to that same page anyway. */}
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/offers/${w.offer.offer.id}`} className={adminButtonSecondary}>Open offer</Link>
                      {canEditOffer(w.offer.offer.status as OfferStatus) && canEdit && (
                        <Link href={`/admin/offers/${w.offer.offer.id}/edit`} className={adminButtonSecondary}>Edit offer</Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Empty>No offer yet.</Empty>
                    {app.status === "OFFER" && canEdit && (
                      <Link href={`/admin/offers/new?applicationId=${id}`} className={`mt-2 ${adminButtonSecondary}`}>Create offer letter</Link>
                    )}
                  </>
                )}
              </Card>
            )}

            {canEdit && (
              <Card title="Reminders" description="Private to you">
                <ul className="space-y-2.5">
                  {w.tasks.map(task => (
                    <li key={task.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-paper-200 pb-2.5 last:border-0">
                      <div>
                        <p className={`${t.body} text-ink-900`}>{task.title}</p>
                        <p className={`${t.hint} text-graphite-500`}>
                          Due {formatDateTime(task.dueAt)}{task.completedAt ? " · Completed" : ""}
                        </p>
                      </div>
                      {!task.completedAt && (
                        <WorkflowForm applicationId={id} kind="reminder" label="Mark complete">
                          <input type="hidden" name="reminderId" value={task.id} />
                        </WorkflowForm>
                      )}
                    </li>
                  ))}
                  {!w.tasks.length && <Empty>No reminders.</Empty>}
                </ul>
                <details className="mt-4 border-t border-paper-200 pt-4">
                  <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Add a reminder</summary>
                  <div className="mt-3">
                    <WorkflowForm applicationId={id} kind="reminder" label="Add reminder">
                      <Field name="title" label="Reminder" required />
                      <Field name="dueAt" label="Due (your local time)" type="datetime-local" required />
                    </WorkflowForm>
                  </div>
                </details>
              </Card>
            )}
            </div>
          </div>
        )}

        {active === "notes" && (
          <Card title="Recruiter notes" description="Private to authorized recruiting staff. Most recent 100.">
            {app.internalNotes && (
              <div className="mb-5 border-l-2 border-paper-300 pl-3">
                <p className={`whitespace-pre-wrap ${t.body} text-ink-800`}>{app.internalNotes}</p>
                <p className={`mt-1 ${t.hint} text-graphite-500`}>Legacy internal note</p>
              </div>
            )}
            <WorkflowForm applicationId={id} kind="note" label="Add note">
              <Field name="note" label="New internal note" multiline required />
            </WorkflowForm>
            <div className="mt-6 space-y-4">
              {w.notes.map(({ note, author }) => (
                <article key={note.id} className="border-t border-paper-200 pt-4">
                  <p className={`whitespace-pre-wrap ${t.body} text-ink-800`}>{note.note}</p>
                  <p className={`mt-1.5 ${t.hint} text-graphite-500`}>
                    {author} · {formatDateTime(note.createdAt)}{note.updatedAt > note.createdAt ? " · Edited" : ""}
                  </p>
                  {(note.createdBy === admin.id || permits(admin.role, "manage")) && (
                    <details className="mt-2">
                      <summary className={`cursor-pointer ${t.hint} text-graphite-600 underline underline-offset-4`}>Edit or delete</summary>
                      <div className="mt-3 space-y-3">
                        <WorkflowForm applicationId={id} kind="note" label="Save note">
                          <input type="hidden" name="noteId" value={note.id} />
                          <Field name="note" label="Note" value={note.note} multiline required />
                        </WorkflowForm>
                        <WorkflowForm applicationId={id} kind="note" label="Delete this note">
                          <input type="hidden" name="noteId" value={note.id} />
                          <input type="hidden" name="intent" value="delete" />
                        </WorkflowForm>
                      </div>
                    </details>
                  )}
                </article>
              ))}
              {!w.notes.length && !app.internalNotes && <Empty>No notes yet.</Empty>}
            </div>
          </Card>
        )}

        {active === "interviews" && (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Card title="Scheduled interviews" id="interviews">
              {canEdit && (
                <details className="mb-5">
                  <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Schedule an interview</summary>
                  <div className="mt-3">
                    <WorkflowForm applicationId={id} kind="interview" label="Schedule interview">
                      <Field name="type" label="Interview type" options={options(interviewTypes)} />
                      <input type="hidden" name="status" value="Scheduled" />
                      <Field name="startsAt" label="Start (your local time)" type="datetime-local" required />
                      <Field name="endsAt" label="End (your local time)" type="datetime-local" required />
                      <Field name="interviewers" label="Interviewers" required />
                      <Field name="location" label="Location" />
                      <Field name="meetingUrl" label="Meeting URL" type="url" />
                      <Field name="notes" label="Internal notes" multiline />
                    </WorkflowForm>
                  </div>
                </details>
              )}
              <div className="space-y-4">
                {w.meetings.map(meeting => (
                  <article key={meeting.id} className="border-t border-paper-200 pt-4 first:border-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className={`${t.body} font-medium text-ink-900`}>{meeting.type}</h3>
                      <span className={`${t.hint} text-graphite-500`}>{meeting.status}</span>
                    </div>
                    <p className={`mt-1 ${t.hint} text-graphite-600`}>
                      {meeting.startsAt.toLocaleString("en-US", { timeZone: meeting.timezone, dateStyle: "medium", timeStyle: "short" })}
                      {" – "}
                      {meeting.endsAt.toLocaleTimeString("en-US", { timeZone: meeting.timezone, timeStyle: "short" })} ({meeting.timezone})
                    </p>
                    <p className={`mt-1 ${t.hint} text-graphite-600`}>Interviewers: {meeting.interviewers}</p>
                    {meeting.location && <p className={`mt-1 ${t.hint} text-graphite-600`}>{meeting.location}</p>}
                    {meeting.meetingUrl && (
                      <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className={`mt-1.5 inline-block ${t.hint} text-graphite-700 underline underline-offset-4`}>
                        Open meeting link
                      </a>
                    )}
                    {meeting.notes && <p className={`mt-2 whitespace-pre-wrap ${t.body} text-ink-800`}>{meeting.notes}</p>}
                    {canEdit && (
                      <details className="mt-2">
                        <summary className={`cursor-pointer ${t.hint} text-graphite-600 underline underline-offset-4`}>Reschedule or update</summary>
                        <div className="mt-3">
                          <WorkflowForm applicationId={id} kind="interview" label="Save interview">
                            <input type="hidden" name="interviewId" value={meeting.id} />
                            <Field name="type" label="Type" value={meeting.type} options={options(interviewTypes)} />
                            <Field name="status" label="Status" value={meeting.status} options={options(interviewStatuses)} />
                            <Field name="startsAt" label="Start (your local time)" type="datetime-local" value={meeting.startsAt.toISOString()} required />
                            <Field name="endsAt" label="End (your local time)" type="datetime-local" value={meeting.endsAt.toISOString()} required />
                            <Field name="interviewers" label="Interviewers" value={meeting.interviewers} required />
                            <Field name="location" label="Location" value={meeting.location} />
                            <Field name="meetingUrl" label="Meeting URL" type="url" value={meeting.meetingUrl} />
                            <Field name="notes" label="Internal interview notes" value={meeting.notes} multiline />
                          </WorkflowForm>
                        </div>
                      </details>
                    )}
                  </article>
                ))}
                {!w.meetings.length && <Empty>No interviews scheduled.</Empty>}
              </div>
            </Card>

            <Card title="Hiring feedback">
              <div className="space-y-4">
                {w.feedback.map(({ feedback: f, author }) => (
                  <article key={f.id} className="border-b border-paper-200 pb-4 last:border-0">
                    <p className={`${t.body} font-medium text-ink-900`}>{f.recommendation} · {f.rating}/5 overall</p>
                    <p className={`mt-1 ${t.hint} text-graphite-600`}>
                      Technical {f.technical}/5 · Communication {f.communication}/5 · Team fit {f.teamFit}/5
                    </p>
                    {f.comments && <p className={`mt-2 whitespace-pre-wrap ${t.body} text-ink-800`}>{f.comments}</p>}
                    <p className={`mt-1.5 ${t.hint} text-graphite-500`}>{author} · {formatDateTime(f.updatedAt)}</p>
                  </article>
                ))}
                {!w.feedback.length && <Empty>No feedback recorded.</Empty>}
              </div>
              {w.meetings.length > 0 && (
                <details className="mt-4 border-t border-paper-200 pt-4">
                  <summary className={`cursor-pointer ${t.label} font-medium text-graphite-700`}>Record feedback</summary>
                  <div className="mt-3">
                    <WorkflowForm applicationId={id} kind="feedback" label="Save feedback">
                      <Field name="interviewId" label="Interview" options={w.meetings.filter(i => i.status !== "Cancelled").map(i => ({ value: i.id, label: `${i.type} · ${formatDateTime(i.startsAt)}` }))} />
                      {([["rating", "Overall rating"], ["technical", "Technical skills"], ["communication", "Communication"], ["teamFit", "Team fit"]] as const).map(([name, label]) => (
                        <Field key={name} name={name} label={label} required options={[{ value: "", label: "Choose a rating" }, ...[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: `${n} / 5` }))]} />
                      ))}
                      <Field name="recommendation" label="Recommendation" required options={[{ value: "", label: "Choose a recommendation" }, ...options(["Strong Hire", "Hire", "Maybe", "No Hire"])]} />
                      <Field name="comments" label="Comments" multiline />
                    </WorkflowForm>
                  </div>
                </details>
              )}
            </Card>
          </div>
        )}

        {active === "email" && canEdit && (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Card title="Compose" id="email">
              <CandidateEmail
                applicationId={id}
                email={app.email}
                templates={w.templates}
                requestKey={crypto.randomUUID()}
                values={{
                  candidate_first_name: app.firstName,
                  candidate_last_name: app.lastName,
                  job_title: jobTitle,
                  company_name: "Sohum Systems",
                  interview_date: nextInterview?.startsAt.toLocaleDateString("en-US", { timeZone: nextInterview.timezone }) ?? "",
                  interview_time: nextInterview ? `${nextInterview.startsAt.toLocaleTimeString("en-US", { timeZone: nextInterview.timezone })} ${nextInterview.timezone}` : "",
                }}
              />
            </Card>
            <Card title="Sent messages">
              {w.messages.length ? (
                <ul className="divide-y divide-paper-200">
                  {w.messages.map(({ message: m, author }) => (
                    <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p className={`${t.body} font-medium text-ink-900`}>{m.subject}</p>
                      <p className={`mt-0.5 ${t.hint} text-graphite-600`}>{m.status} · {author} · {formatDateTime(m.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No messages sent.</Empty>
              )}
            </Card>
          </div>
        )}

        {active === "activity" && (
          <Card title="Activity" description="Most recent 100 events. Full history remains in the audit log." id="activity">
            <ol className="space-y-3.5">
              {w.activity.map(({ event: e, author }) => (
                <li key={e.id} className="border-l-2 border-paper-300 pl-3">
                  <p className={`${t.body} font-medium text-ink-900 first-letter:uppercase`}>
                    {e.action.replace(/^ADMIN_/, "").replaceAll("_", " ").toLowerCase()}
                  </p>
                  {e.metadata?.from && e.metadata?.to ? (
                    <p className={`mt-0.5 ${t.hint} text-graphite-600`}>{String(e.metadata.from)} → {String(e.metadata.to)}</p>
                  ) : null}
                  <p className={`mt-0.5 ${t.hint} text-graphite-500`}>{author ?? "System"} · {formatDateTime(e.createdAt)}</p>
                </li>
              ))}
              <li className="border-l-2 border-flame-500 pl-3">
                <p className={`${t.body} font-medium text-ink-900`}>Application submitted</p>
                <p className={`mt-0.5 ${t.hint} text-graphite-500`}>{formatDateTime(app.createdAt)}</p>
              </li>
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
