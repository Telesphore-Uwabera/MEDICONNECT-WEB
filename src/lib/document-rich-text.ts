const DANGEROUS_TAGS = "script,style,iframe,object,embed,link,meta";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^(https?:|mailto:|tel:|\/|#)/i.test(trimmed);
}

function isSafeImageSrc(value: string): boolean {
  const trimmed = value.trim();
  return /^(https?:|data:image\/(?:png|jpe?g|gif|webp);base64,|blob:|\/)/i.test(trimmed);
}

export function sanitizeDocumentRichText(value?: string | null): string {
  const html = String(value ?? "").trim();
  if (!html) return "";

  if (typeof DOMParser === "undefined") return escapeHtml(html);

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll(DANGEROUS_TAGS).forEach((node) => node.remove());

  doc.body.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.removeAttribute("class");
    element.removeAttribute("id");
    element.removeAttribute("contenteditable");
    element.removeAttribute("data-rich-selected");

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      if (name === "style" && /expression\s*\(|javascript:/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName.toLowerCase() === "a") {
      const href = element.getAttribute("href") ?? "";
      if (href && isSafeUrl(href)) {
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("href");
      }
    }

    if (element.tagName.toLowerCase() === "img") {
      const src = element.getAttribute("src") ?? "";
      if (!src || !isSafeImageSrc(src)) {
        element.remove();
        return;
      }
      element.removeAttribute("width");
      element.removeAttribute("height");
    }
  });

  return doc.body.innerHTML;
}

export function richDocumentHtml(value?: string | null): string {
  const html = sanitizeDocumentRichText(value);
  return html ? `<div class="rich-content">${html}</div>` : `<span class="muted">-</span>`;
}

export const richDocumentCss = `
  .rich-content { max-width:100%; overflow-wrap:anywhere; word-break:break-word; white-space:normal; }
  .rich-content p { margin:0 0 7px; }
  .rich-content p:last-child { margin-bottom:0; }
  .rich-content h1, .rich-content h2, .rich-content h3 { margin:0 0 8px; font-family:Arial, sans-serif; line-height:1.2; color:#0f172a; }
  .rich-content h1 { font-size:18px; }
  .rich-content h2 { font-size:16px; }
  .rich-content h3 { font-size:14px; }
  .rich-content ul, .rich-content ol { margin:6px 0 6px 20px; padding:0; }
  .rich-content li { margin:2px 0; }
  .rich-content blockquote { margin:6px 0; padding:5px 9px; border-left:3px solid var(--brand); background:#f8fafc; color:var(--muted); }
  .rich-content a { color:var(--brand-dark); text-decoration:underline; }
  .rich-content img { display:block; max-width:100%; max-height:280px; height:auto; margin:8px auto; border:1px solid var(--soft-line); border-radius:4px; object-fit:contain; }
  .rich-content table { width:100%; margin:8px 0; font-size:12px; border-collapse:collapse; }
  .rich-content table td, .rich-content table th { border:1px solid var(--soft-line); padding:5px 6px; }
`;