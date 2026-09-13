import sanitizeHtml from "sanitize-html";

/**
 * Offer bodies are prose, never executable HTML or external resources.
 *
 * Two transforms run before sanitising, because the previous behaviour
 * silently destroyed perfectly reasonable template content:
 *
 *  - `<div>` was not on the allowlist, so it was dropped *with its line break*.
 *    A template written as `<div>Dear X,</div><div>We offer…</div>` — which is
 *    what most rich-text editors and most people hand-writing HTML produce —
 *    collapsed into one run-on paragraph. Divs are mapped to paragraphs.
 *
 *  - A template typed as plain text with blank lines between paragraphs lost
 *    them completely, since newlines carry no meaning in HTML. Plain text is
 *    now converted to paragraphs first.
 *
 * Anything still outside the allowlist is dropped as before: this is a
 * document renderer, not a web page.
 */

/** Tags that may appear in an offer letter body. */
const allowedTags = [
  "p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td",
  // Carries the one highlight the letter uses: the sign-and-return deadline,
  // which the company's own letters show on a yellow ground.
  "mark",
];

/** True when the value carries no HTML tags at all. */
const looksLikePlainText = (value: string) => !/<[a-z][\s\S]*>/i.test(value);

/**
 * Turns plain text into paragraphs: blank lines separate paragraphs, single
 * newlines become line breaks. Leaves anything already containing markup alone.
 */
function plainTextToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function sanitizeOfferBody(html: string) {
  const input = looksLikePlainText(html) ? plainTextToHtml(html) : html;

  return sanitizeHtml(input, {
    allowedTags,
    allowedAttributes: {},
    allowedSchemes: [],
    transformTags: {
      // Structural containers become paragraphs rather than vanishing, so the
      // text they separate stays separated.
      div: "p",
      section: "p",
      // Heading levels above the document's own are normalised into the two
      // the offer stylesheet renders, instead of being stripped to bare text.
      h1: "h2",
      h4: "h3",
      h5: "h3",
      h6: "h3",
    },
    // Inline wrappers that are not on the allowlist (span, font, a) are removed
    // but their text is kept, which is sanitize-html's default. Only these tags
    // have their *content* discarded too.
    nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  });
}
