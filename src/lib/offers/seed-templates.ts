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

  /* Wording follows the offer letter Sohum Systems already issues: the
     opening paragraph, the numbered terms, the at-will paragraph, the
     eligibility conditions and the sign-and-return deadline. Optional content
     sits in conditional blocks so an offer without a bonus reads as though
     those sentences were never written. Still sample content pending legal
     review, like every template here. */
  bodyHtml: `<p>We are very excited about the opportunity to work together with you. We feel that you will be a valuable asset to {{company_name}} and to our future growth. Therefore, we are pleased to confirm the following with regards to the responsibilities and compensation for the position of <strong>{{job_title}}</strong> with the start date of <strong>{{start_date}}</strong>.</p>
<p>Please note that this arrangement supersedes any previous arrangements that may have been made:</p>
<ol>
{{#if salary}}<li>Your position as <strong>{{job_title}}</strong> is a {{employment_type}} position paid at <strong>{{salary}}</strong> annually.</li>{{/if}}
{{#if hourly_rate}}<li>Your position as <strong>{{job_title}}</strong> is a {{employment_type}} position paid at an hourly rate of <strong>{{hourly_rate}}</strong> for hours worked.</li>{{/if}}
<li>You will be paid in {{pay_frequency}} installments, according to the Company payroll cycle. State and Federal laws require us to withhold State and Federal taxes in accordance with instructions you will file with us pertaining to your tax status for your paychecks.</li>
<li>During the first ninety days of employment, you will work on an introductory basis. The introductory period is intended to give you the opportunity to demonstrate your ability to achieve a satisfactory level of performance and to determine whether the new position meets your expectations. {{company_name}} uses this period to do an initial evaluation of your capabilities, work habits and overall performance.</li>
{{#if sign_on_bonus}}<li>You will receive a one-time sign-on bonus of <strong>{{sign_on_bonus}}</strong>, payable with your first regular paycheck and subject to the repayment terms described in your onboarding materials.</li>{{/if}}
{{#if bonus}}<li>You will be eligible for a performance bonus of up to <strong>{{bonus}}</strong>, awarded at the company's discretion based on individual and company performance.</li>{{/if}}
{{#if other_compensation}}<li>{{other_compensation}}</li>{{/if}}
</ol>`,

  termsHtml: `<p>It is important to note that employment with the Company is based on mutual consent, is for an unspecified term, and is employment at will (employment-at-will). Accordingly, either you or the Company &mdash; with or without cause or advance notice &mdash; can terminate the employment relationship, at any time with or without cause or with or without notice. {{company_name}} also has the right to change the terms and conditions of your employment with or without notice including but not limited to termination, demotion, promotion, transfer, compensation, benefits, duties and location of work. No person, other than the CEO by written agreement, has the right to enter an expressed or implied agreement on any other basis.</p>
<p>The above information is conditioned on, and this offer is contingent upon, your complying with the following requirements:</p>
<ul>
<li>You are legally eligible for work in the United States; and</li>
<li>You are able to obtain and maintain a government security clearance.</li>
<li>You are able to successfully clear the background check, including criminal and credit check.</li>
</ul>
<p>As it is necessary for you to successfully clear your background check, we ask that you do not give your current employer, if applicable, notice of your resignation until you received clearance from our team.</p>
<p>As {{job_title}}, you will perform the duties and responsibilities customarily associated with this role and such other responsibilities as may reasonably be assigned{{#if reports_to}} by {{reports_to}}{{/if}}. Your employment is also subject to the Company&rsquo;s written policies, as described in the employee handbook and updated from time to time, and to the security, conduct and reporting requirements of any client you support.</p>
<p>As a condition of employment you will be asked to sign the Company&rsquo;s confidentiality and intellectual property agreement. You will have access to confidential information belonging to {{company_name}}, its clients and its partners, and you agree to protect that information both during and after your employment. Work product you create within the scope of your employment belongs to the Company.</p>
{{#if benefits_summary}}<p>{{benefits_summary}}</p>{{/if}}
{{#if pto_summary}}<p>{{pto_summary}}</p>{{/if}}
{{#if additional_terms}}<p>{{additional_terms}}</p>{{/if}}`,

  acknowledgementsHtml: `<p>If you agree to accept this offer, please sign and return this letter no later than <mark>{{offer_expiration_date}}</mark>. We believe that you will make a significant contribution to our Company and, at the same time, will realize both the personal and professional growth you seek.</p>
<p>We look forward to working with you and are pleased to invite you to be a member of our team.</p>`,
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
