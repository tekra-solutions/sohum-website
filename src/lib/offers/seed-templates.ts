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
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} a contract engagement as {{job_title}} with {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
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
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} the fully remote position of {{job_title}} at {{company_name}}, reporting to {{manager_name}}, with an anticipated start date of {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
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
    bodyHtml: `${disclaimer}<p>We are pleased to offer {{candidate_first_name}} an internship position as {{job_title}} at {{company_name}}, reporting to {{manager_name}}, beginning {{start_date}}.</p><p>This offer is valid until {{offer_expiration_date}}.</p>`,
    // Pages 2 and 3. Placeholder structure showing where each kind of term
    // belongs — deliberately generic, and subject to the same legal review as
    // the rest of the template.
    termsHtml: `<h3>Benefits</h3><p>You will be eligible to participate in the company benefit plans described in the employee handbook, subject to the terms of those plans.</p><h3>Working hours</h3><p>Standard business hours apply, with flexibility as agreed with your manager.</p><h3>Contingencies</h3><p>This offer is contingent upon satisfactory completion of a background check, reference checks, and verification of your eligibility to work.</p><h3>Confidentiality and intellectual property</h3><p>You will be asked to sign the company's standard confidentiality and intellectual property agreement as a condition of employment.</p><h3>Company policies</h3><p>Your employment is subject to the written policies referenced in the employee handbook, which may be updated from time to time.</p>`,
    acknowledgementsHtml: `<p>By accepting this offer you acknowledge that you have read and understood the terms set out in this letter and the referenced company policies.</p><p>You confirm that your acceptance is voluntary and that no representations have been made to you other than those contained in this document.</p>`,
  },
];
