import { z } from "zod";
import { interviewStatuses, interviewTypes, validateTemplate } from "./policy";
export const interviewSchema = z.object({
  type: z.enum(interviewTypes), status: z.enum(interviewStatuses).default("Scheduled"),
  startsAt: z.coerce.date(), endsAt: z.coerce.date(),
  timezone: z.string().max(80).refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Choose a valid time zone"),
  interviewers: z.string().trim().min(1).max(1000),
  location: z.string().trim().max(300).default(""),
  meetingUrl: z.string().max(500).refine(v => !v || /^https:\/\//i.test(v), "Use an HTTPS meeting URL").default(""),
  notes: z.string().trim().max(5000).default(""),
}).refine(v => v.endsAt > v.startsAt, "End time must follow start time");
export const feedbackSchema = z.object({
  interviewId: z.uuid(), rating: z.coerce.number().int().min(1).max(5),
  technical: z.coerce.number().int().min(1).max(5), communication: z.coerce.number().int().min(1).max(5),
  teamFit: z.coerce.number().int().min(1).max(5),
  recommendation: z.enum(["Strong Hire", "Hire", "Maybe", "No Hire"]), comments: z.string().trim().max(5000).default(""),
});
export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(300).refine(v => !/[\r\n]/.test(v)).refine(validateTemplate, "Unknown or invalid variable"),
  body: z.string().trim().min(1).max(20000).refine(validateTemplate, "Unknown or invalid variable"),
  isActive: z.boolean(),
});
