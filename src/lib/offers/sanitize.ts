import sanitizeHtml from "sanitize-html";
/** Offer bodies are prose, never executable HTML or external resources. */
export function sanitizeOfferBody(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: {}, allowedSchemes: [],
  });
}
