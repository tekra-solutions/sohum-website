/**
 * Starter offer templates, one per non-custom category. Every one is
 * explicitly placeholder content: it must be reviewed by counsel before use,
 * and the admin template editor says so. The rendered document carries its own
 * standing note (render-html.ts appends one regardless of which template
 * produced the offer), so the candidate-facing letter states the position
 * without opening on an internal warning. Not inserted automatically on boot —
 * only via an explicit admin action, so nobody mistakes this for reviewed
 * legal language.
 */
/**
 * Templates are starter content pending legal review, and the admin must know
 * that — but the warning belongs to the *template*, not to the letter a
 * candidate receives. It used to be the first line of every bodyHtml, so every
 * issued offer opened with "⚠ Sample content — requires legal review before
 * use." above "Dear <candidate>". The review warning now lives in the template
 * editor and in the reviewNotice below; the rendered document carries the
 * standing legal-note in its footer instead.
 */
export const templateReviewNotice =
  "Starter content. Have counsel review this template before issuing offers from it.";

/**
 * The default template a recruiter gets without choosing anything.
 *
 * It is written to produce three substantive pages from data the system
 * already holds, so creating an offer means entering compensation and dates —
 * not composing a letter. Optional content (bonuses, PTO, a named manager,
 * extra terms) sits inside conditional blocks so an offer without them reads
 * as though those sentences were never written.
 *
 * The prose is standard employment-offer language, not counsel-reviewed advice
 * for any specific offer: it stays editable in Offer Template Settings, which
 * shows the review notice to the admin.
 */
const standardOffer = {
  name: "Sohum Systems Standard Offer",
  category: "FULL_TIME" as const,
  subject: "Employment Offer — {{job_title}} — {{company_name}}",

  // Page 1 — introduction, position, compensation, benefits.
  bodyHtml: `<p>Dear {{candidate_first_name}},</p>
<p>{{company_legal_name}} is pleased to offer you the {{employment_type}} position of <strong>{{job_title}}</strong> in our {{department}} team{{#if manager_name}}, reporting to {{manager_name}}{{/if}}. We were impressed by your background and believe you will make a strong contribution to our work supporting mission-critical federal programs.</p>
<p>Your anticipated start date is <strong>{{start_date}}</strong>. This letter sets out the terms of our offer, which remains open until <strong>{{offer_expiration_date}}</strong>.</p>
<h3>Compensation</h3>
{{#if salary}}<p>Your annual base salary will be <strong>{{salary}}</strong>, paid {{pay_frequency}} and subject to applicable withholdings and deductions.</p>{{/if}}
{{#if hourly_rate}}<p>You will be compensated at an hourly rate of <strong>{{hourly_rate}}</strong>, paid {{pay_frequency}} for hours worked and subject to applicable withholdings and deductions.</p>{{/if}}
{{#if sign_on_bonus}}<p>You will receive a one-time sign-on bonus of <strong>{{sign_on_bonus}}</strong>, payable with your first regular paycheck and subject to the repayment terms described in your onboarding materials.</p>{{/if}}
{{#if bonus}}<p>You will be eligible for a performance bonus of up to <strong>{{bonus}}</strong>, awarded at the company's discretion based on individual and company performance.</p>{{/if}}
{{#if other_compensation}}<p>{{other_compensation}}</p>{{/if}}
<h3>Benefits</h3>
{{#if benefits_summary}}<p>{{benefits_summary}}</p>{{/if}}
{{#if pto_summary}}<p>{{pto_summary}}</p>{{/if}}
<p>Full details of all benefit programs, including eligibility dates and enrollment windows, are provided in the employee handbook and plan documents, which govern in the event of any difference from this summary.</p>`,

  // Page 2 — employment terms, responsibilities, policies, contingencies.
  termsHtml: `<h3>Position and responsibilities</h3>
<p>As {{job_title}}, you will perform the duties customarily associated with this role and such other responsibilities as may reasonably be assigned{{#if reports_to}} by {{reports_to}}{{/if}}. You agree to devote your full professional attention to {{company_name}} during working hours.</p>
<h3>Work location and arrangement</h3>
<p>This position is based in {{location}} on a {{work_arrangement}} basis.{{#if work_location}} Your primary work location will be {{work_location}}.{{/if}} Work location and arrangement may change as business and client needs require.</p>
<h3>Employment classification</h3>
<p>This is a {{employment_type}} position. Employment with {{company_legal_name}} is at will, meaning either you or the company may end the employment relationship at any time, with or without cause or notice. Nothing in this letter creates a contract of employment for any fixed term.</p>
<h3>Confidentiality and intellectual property</h3>
<p>As a condition of employment you will be asked to sign the company's confidentiality and intellectual property agreement. You will have access to confidential information belonging to {{company_name}}, its clients and its partners, and you agree to protect that information both during and after your employment. Work product you create within the scope of your employment belongs to the company.</p>
<h3>Company and client policies</h3>
<p>Because {{company_name}} supports federal agencies, your employment is subject to both company policy and the security, conduct and reporting requirements of the clients you support. This includes any site-specific access rules, training obligations and codes of conduct applicable to a client engagement. Company policies are described in the employee handbook and may be updated from time to time.</p>
<h3>Eligibility and contingencies</h3>
<p>This offer is contingent upon: verification of your identity and authorization to work in the United States, including timely completion of Form I-9; satisfactory completion of a background check and reference checks; and, where a client engagement requires it, your ability to obtain and maintain the necessary clearance or public trust determination. If any contingency is not satisfied, this offer may be withdrawn or employment terminated.</p>
{{#if additional_terms}}<h3>Additional terms</h3><p>{{additional_terms}}</p>{{/if}}`,

  // Page 3 — acknowledgements preceding the signature block.
  acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood this letter, the referenced company policies, and the contingencies described above.</p>
<p>You confirm that your acceptance is voluntary, and that no promises or representations have been made to you other than those contained in this document. You further confirm that accepting this position will not breach any agreement you have with a current or former employer.</p>
<p>This letter, once accepted, represents the complete offer of employment and supersedes any prior discussions, whether written or verbal.</p>
{{#if hr_contact_email}}<p>If you have questions before accepting, please contact us at {{hr_contact_email}}.</p>{{/if}}
<p>We look forward to welcoming you to {{company_name}}.</p>`,
};

export const defaultOfferTemplates = [
  standardOffer,
  {
    name: "Full-Time Employee",
    category: "FULL_TIME" as const,
    subject: "Employment Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `<p>We are pleased to offer {{candidate_first_name}} the full-time position of {{job_title}} at {{company_name}}, reporting to {{manager_name}}, with an anticipated start date of {{start_date}}.</p><p>This offer is contingent upon standard pre-employment requirements and is valid until {{offer_expiration_date}}.</p>`,
    // Pages 2 and 3. Placeholder structure showing where each kind of term
    // belongs — deliberately generic, and subject to the same legal review as
    // the rest of the template.
    termsHtml: `<h3>Benefits</h3><p>You will be eligible to participate in the company benefit plans described in the employee handbook, subject to the terms of those plans.</p><h3>Working hours</h3><p>Standard business hours apply, with flexibility as agreed with your manager.</p><h3>Contingencies</h3><p>This offer is contingent upon satisfactory completion of a background check, reference checks, and verification of your eligibility to work.</p><h3>Confidentiality and intellectual property</h3><p>You will be asked to sign the company's standard confidentiality and intellectual property agreement as a condition of employment.</p><h3>Company policies</h3><p>Your employment is subject to the written policies referenced in the employee handbook, which may be updated from time to time.</p>`,
    acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood the terms set out in this letter and the referenced company policies.</p><p>You confirm that your acceptance is voluntary and that no representations have been made to you other than those contained in this document.</p>`,
  },
  {
    name: "Contract Employee",
    category: "CONTRACT" as const,
    subject: "Contract Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `<p>We are pleased to offer {{candidate_first_name}} a contract engagement as {{job_title}} with {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
    // Pages 2 and 3. Placeholder structure showing where each kind of term
    // belongs — deliberately generic, and subject to the same legal review as
    // the rest of the template.
    termsHtml: `<h3>Benefits</h3><p>You will be eligible to participate in the company benefit plans described in the employee handbook, subject to the terms of those plans.</p><h3>Working hours</h3><p>Standard business hours apply, with flexibility as agreed with your manager.</p><h3>Contingencies</h3><p>This offer is contingent upon satisfactory completion of a background check, reference checks, and verification of your eligibility to work.</p><h3>Confidentiality and intellectual property</h3><p>You will be asked to sign the company's standard confidentiality and intellectual property agreement as a condition of employment.</p><h3>Company policies</h3><p>Your employment is subject to the written policies referenced in the employee handbook, which may be updated from time to time.</p>`,
    acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood the terms set out in this letter and the referenced company policies.</p><p>You confirm that your acceptance is voluntary and that no representations have been made to you other than those contained in this document.</p>`,
  },
  {
    name: "Remote Employee",
    category: "REMOTE" as const,
    subject: "Remote Employment Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `<p>We are pleased to offer {{candidate_first_name}} the fully remote position of {{job_title}} at {{company_name}}, reporting to {{manager_name}}, with an anticipated start date of {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
    // Pages 2 and 3. Placeholder structure showing where each kind of term
    // belongs — deliberately generic, and subject to the same legal review as
    // the rest of the template.
    termsHtml: `<h3>Benefits</h3><p>You will be eligible to participate in the company benefit plans described in the employee handbook, subject to the terms of those plans.</p><h3>Working hours</h3><p>Standard business hours apply, with flexibility as agreed with your manager.</p><h3>Contingencies</h3><p>This offer is contingent upon satisfactory completion of a background check, reference checks, and verification of your eligibility to work.</p><h3>Confidentiality and intellectual property</h3><p>You will be asked to sign the company's standard confidentiality and intellectual property agreement as a condition of employment.</p><h3>Company policies</h3><p>Your employment is subject to the written policies referenced in the employee handbook, which may be updated from time to time.</p>`,
    acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood the terms set out in this letter and the referenced company policies.</p><p>You confirm that your acceptance is voluntary and that no representations have been made to you other than those contained in this document.</p>`,
  },
  {
    name: "Internship",
    category: "INTERNSHIP" as const,
    subject: "Internship Offer — {{job_title}} — {{company_name}}",
    bodyHtml: `<p>We are pleased to offer {{candidate_first_name}} an internship position as {{job_title}} at {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
    // Pages 2 and 3. Placeholder structure showing where each kind of term
    // belongs — deliberately generic, and subject to the same legal review as
    // the rest of the template.
    termsHtml: `<h3>Benefits</h3><p>You will be eligible to participate in the company benefit plans described in the employee handbook, subject to the terms of those plans.</p><h3>Working hours</h3><p>Standard business hours apply, with flexibility as agreed with your manager.</p><h3>Contingencies</h3><p>This offer is contingent upon satisfactory completion of a background check, reference checks, and verification of your eligibility to work.</p><h3>Confidentiality and intellectual property</h3><p>You will be asked to sign the company's standard confidentiality and intellectual property agreement as a condition of employment.</p><h3>Company policies</h3><p>Your employment is subject to the written policies referenced in the employee handbook, which may be updated from time to time.</p>`,
    acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood the terms set out in this letter and the referenced company policies.</p><p>You confirm that your acceptance is voluntary and that no representations have been made to you other than those contained in this document.</p>`,
  },
];
