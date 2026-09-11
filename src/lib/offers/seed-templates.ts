/**
 * Starter offer templates, one per non-custom category. Every one is
 * explicitly placeholder content: it must be reviewed by counsel before use,
 * and says so in the admin editor as well as inside the rendered document
 * itself (render-html.ts adds an always-present disclaimer regardless of
 * which template produced the offer, so this isn't the only place that
 * warning lives). Not inserted automatically on boot — only via an explicit
 * admin action, so nobody mistakes this for reviewed legal language.
 */
const disclaimer = "<p><strong>⚠ Sample content — requires legal review before use.</strong></p>";

export const defaultOfferTemplates = [
  {
    name: "Full-Time Employee",
    category: "FULL_TIME" as const,
    subject: "Employment Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} the full-time position of {{job_title}} at {{company_name}}, reporting to {{manager_name}}, with an anticipated start date of {{start_date}}.</p><p>This offer is contingent upon standard pre-employment requirements and is valid until {{offer_expiration_date}}.</p>`,
  },
  {
    name: "Contract Employee",
    category: "CONTRACT" as const,
    subject: "Contract Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} a contract engagement as {{job_title}} with {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
  },
  {
    name: "Remote Employee",
    category: "REMOTE" as const,
    subject: "Remote Employment Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} the fully remote position of {{job_title}} at {{company_name}}, reporting to {{manager_name}}, with an anticipated start date of {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
  },
  {
    name: "Internship",
    category: "INTERNSHIP" as const,
    subject: "Internship Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} an internship position as {{job_title}} at {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
  },
];
