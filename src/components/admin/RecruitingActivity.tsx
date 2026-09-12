import Link from "next/link";
import { actionCenter, upcomingInterviews } from "@/lib/ats/data";
import { formatDateTime } from "@/lib/format";
import { Card } from "./ui";

/**
 * The dashboard's two working lists.
 *
 * These were previously one dense component plus a `NotificationPanel` pinned
 * above every admin screen. The panel listed the same offer approvals and
 * expiring offers as "Needs attention" below it, so the same work appeared
 * twice — and appeared on Invoices and Settings, where it is noise. The panel
 * is gone; this is the single place unfinished work is surfaced.
 */

function Item({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li>
      <Link href={href} className="block px-5 py-3 transition-colors hover:bg-paper-50">
        <p className="text-[0.8125rem] font-medium text-ink-900">{title}</p>
        <p className="mt-0.5 text-[0.75rem] text-graphite-600">{meta}</p>
      </Link>
    </li>
  );
}

function List({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  const items = children.flat().filter(Boolean);
  if (!items.length) {
    return <p className="px-5 py-6 text-center text-[0.8125rem] text-graphite-500">{empty}</p>;
  }
  return <ul className="divide-y divide-paper-200">{items}</ul>;
}

export async function NeedsAttention() {
  const actions = await actionCenter();
  const count =
    actions.tasks.length + actions.feedbackDue.length +
    actions.offerApprovals.length + actions.offerExpiring.length;

  return (
    <Card
      title="Needs attention"
      description={count ? `${count} item${count === 1 ? "" : "s"} waiting on you` : undefined}
      className="[&>div]:p-0"
    >
      <List empty="Nothing needs your attention right now.">
        {actions.offerApprovals.map((o) => (
          <Item key={`ap-${o.id}`} href={`/admin/offers/${o.id}`} title="Offer pending your approval" meta={`${o.name} · ${o.job}`} />
        ))}
        {actions.offerExpiring.map((o) => (
          <Item key={`exp-${o.id}`} href={`/admin/offers/${o.id}`} title="Offer expiring soon" meta={`${o.name} · expires ${formatDateTime(o.expiresAt)}`} />
        ))}
        {actions.feedbackDue.map((f, i) => (
          <Item key={`fb-${f.id}-${i}`} href={`/admin/applications/${f.id}#interviews`} title="Interview feedback required" meta={`${f.name} · ${f.type}`} />
        ))}
        {actions.tasks.map(({ task, name }) => (
          <Item key={`t-${task.id}`} href={`/admin/applications/${task.applicationId}`} title={task.title} meta={`${name} · due ${formatDateTime(task.dueAt)}`} />
        ))}
      </List>
    </Card>
  );
}

export async function UpcomingInterviews() {
  const upcoming = await upcomingInterviews();

  return (
    <Card title="Upcoming interviews" className="[&>div]:p-0">
      <List empty="No interviews scheduled.">
        {upcoming.map(({ interview: i, name, job }) => (
          <Item
            key={i.id}
            href={`/admin/applications/${i.applicationId}#interviews`}
            title={`${name} · ${i.type}`}
            meta={`${job} — ${i.startsAt.toLocaleString("en-US", { timeZone: i.timezone, dateStyle: "medium", timeStyle: "short" })} (${i.timezone})`}
          />
        ))}
      </List>
    </Card>
  );
}
