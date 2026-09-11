/** Future decision-support provider boundary. No provider is enabled or invoked. */
export type CandidateReviewInput = {
  job: { title: string; requirements: string[]; skills: string[] };
  candidate: { skills: string[]; experienceEvidence: string[] };
};
export type CandidateReview = {
  generatedByAI: true;
  summary: string;
  relevantSkills: string[];
  experienceSummary: string;
  potentialGaps: string[];
  evidence: { requirement: string; evidence: string; confidence: "low" | "medium" | "high" }[];
  requiresHumanReview: true;
};
/** Implementations must not receive names, contact information or protected characteristics.
 * Raw resumes require separate extraction, redaction and human approval before this boundary.
 * Outputs have no authority to mutate candidate status or make hiring decisions. */
export interface CandidateReviewProvider {
  review(input: CandidateReviewInput, signal: AbortSignal): Promise<CandidateReview>;
}
export const aiReviewEnabled = false;
