import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Heading1,
  Heading2,
  Highlighter,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Type,
  Upload,
  Underline,
  Unlink,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "DIV",
  "EM",
  "FONT",
  "H1",
  "H2",
  "H3",
  "H4",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right", "justify"]);
const IMAGE_WIDTHS = ["25%", "50%", "75%", "100%"] as const;

function isSafeColor(value: string) {
  const trimmed = value.trim();
  return (
    /^#[0-9a-f]{3,8}$/i.test(trimmed) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(trimmed) ||
    /^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(trimmed) ||
    /^[a-z]+$/i.test(trimmed)
  );
}

function isSafeImageSrc(src: string) {
  const trimmed = src.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)
  );
}

function copySafeStyles(source: HTMLElement, target: HTMLElement) {
  const color = source.style.color;
  const backgroundColor = source.style.backgroundColor;
  const textAlign = source.style.textAlign;

  if (color && isSafeColor(color)) target.style.color = color;
  if (backgroundColor && isSafeColor(backgroundColor)) {
    target.style.backgroundColor = backgroundColor;
  }
  if (textAlign && ALLOWED_ALIGNMENTS.has(textAlign)) {
    target.style.textAlign = textAlign;
  }
}

function isSafeSize(value: string) {
  return /^(?:\d{1,3}(?:\.\d+)?%|\d{1,4}px)$/i.test(value.trim());
}

function copySafeImageStyles(source: HTMLElement, target: HTMLElement) {
  const width = source.style.width || source.getAttribute("width") || "";
  const maxWidth = source.style.maxWidth;
  const display = source.style.display;
  const marginLeft = source.style.marginLeft;
  const marginRight = source.style.marginRight;

  if (width && isSafeSize(width)) target.style.width = width;
  if (maxWidth && isSafeSize(maxWidth)) target.style.maxWidth = maxWidth;
  if (display === "block" || display === "inline-block") target.style.display = display;
  if (marginLeft === "auto" || marginLeft === "0px" || marginLeft === "0") {
    target.style.marginLeft = marginLeft;
  }
  if (marginRight === "auto" || marginRight === "0px" || marginRight === "0") {
    target.style.marginRight = marginRight;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(href: string) {
  const trimmed = href.trim();
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed)
  );
}

export function sanitizeRichText(value?: string | null) {
  if (!value) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return escapeHtml(value);
  }

  const doc = new DOMParser().parseFromString(value, "text/html");

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent ?? "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    const children = Array.from(el.childNodes)
      .map(sanitizeNode)
      .filter(Boolean) as Node[];

    if (!ALLOWED_TAGS.has(tag)) {
      const fragment = doc.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child));
      return fragment;
    }

    if (tag === "IMG") {
      const src = el.getAttribute("src") ?? "";
      if (!isSafeImageSrc(src)) return null;

      const cleanImage = doc.createElement("img");
      cleanImage.setAttribute("src", src);
      const alt = el.getAttribute("alt");
      if (alt) cleanImage.setAttribute("alt", alt.slice(0, 160));
      copySafeImageStyles(el, cleanImage);
      return cleanImage;
    }

    const clean = doc.createElement(tag === "FONT" ? "span" : tag.toLowerCase());
    copySafeStyles(el, clean);

    if (tag === "FONT") {
      const color = el.getAttribute("color") ?? "";
      if (color && isSafeColor(color)) clean.style.color = color;
    }

    if (tag === "A") {
      const href = el.getAttribute("href") ?? "";
      if (isSafeHref(href)) {
        clean.setAttribute("href", href);
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noopener noreferrer");
      }
    }

    children.forEach((child) => clean.appendChild(child));
    return clean;
  };

  const container = doc.createElement("div");
  Array.from(doc.body.childNodes).forEach((node) => {
    const clean = sanitizeNode(node);
    if (clean) container.appendChild(clean);
  });

  return container.innerHTML;
}

function isEmptyHtml(value?: string | null) {
  if (!value) return true;
  if (typeof window === "undefined") return value.trim().length === 0;
  const div = document.createElement("div");
  div.innerHTML = sanitizeRichText(value);
  return (div.textContent ?? "").trim().length === 0 && !div.querySelector("img");
}

function normalizeRichText(value: string) {
  const sanitized = sanitizeRichText(value);
  if (isEmptyHtml(sanitized)) return "";
  return sanitized;
}

export function hasRichTextContent(value?: string | null) {
  const sanitized = sanitizeRichText(value);
  if (!sanitized) return false;
  return richTextToPlainText(sanitized).length > 0 || /<img\b/i.test(sanitized);
}

export function prepareRichTextForSave(value?: string | null) {
  const sanitized = sanitizeRichText(value);
  return hasRichTextContent(sanitized) ? sanitized : undefined;
}

export interface RichTextareaProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
  minHeight?: number;
  maxHeight?:number
}

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "formatBlock"
  | "foreColor"
  | "hiliteColor"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "createLink"
  | "unlink"
  | "removeFormat";

const TOOLBAR: Array<{
  command: Command;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "underline", label: "Underline", icon: Underline },
  { command: "insertUnorderedList", label: "Bullet list", icon: List },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  { command: "justifyLeft", label: "Align left", icon: AlignLeft },
  { command: "justifyCenter", label: "Align center", icon: AlignCenter },
  { command: "justifyRight", label: "Align right", icon: AlignRight },
  { command: "createLink", label: "Add link", icon: Link },
  { command: "unlink", label: "Remove link", icon: Unlink },
  { command: "removeFormat", label: "Clear format", icon: RemoveFormatting },
];

const FORMAT_OPTIONS = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Quote", value: "blockquote" },
];

export const RichTextarea = React.forwardRef<HTMLDivElement, RichTextareaProps>(
  (
    {
      value,
      onChange,
      placeholder = "Write details...",
      disabled = false,
      className,
      editorClassName,
      minHeight = 120,
      maxHeight
    },
    ref,
  ) => {
    const editorRef = React.useRef<HTMLDivElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [focused, setFocused] = React.useState(false);
    const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
    const [selectedImage, setSelectedImage] = React.useState<HTMLImageElement | null>(null);
    const sanitizedValue = React.useMemo(() => sanitizeRichText(value), [value]);
    const empty = isEmptyHtml(sanitizedValue);

    React.useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

    React.useEffect(() => {
      const editor = editorRef.current;
      if (!editor || focused) return;
      if (editor.innerHTML !== sanitizedValue) {
        editor.innerHTML = sanitizedValue;
      }
    }, [focused, sanitizedValue]);

    const emitChange = React.useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return;
      onChange(normalizeRichText(editor.innerHTML));
    }, [onChange]);

    const selectImage = React.useCallback((image: HTMLImageElement | null) => {
      editorRef.current
        ?.querySelectorAll("img[data-rich-selected='true']")
        .forEach((img) => {
          img.removeAttribute("data-rich-selected");
          (img as HTMLImageElement).style.outline = "";
          (img as HTMLImageElement).style.outlineOffset = "";
        });

      if (image) {
        image.setAttribute("data-rich-selected", "true");
        image.style.outline = "2px solid hsl(var(--primary))";
        image.style.outlineOffset = "2px";
      }

      setSelectedImage(image);
    }, []);

    const runCommand = React.useCallback(
      (command: Command, commandValue?: string) => {
        if (disabled) return;
        editorRef.current?.focus();

        if (command === "createLink") {
          const url = window.prompt("Paste link URL");
          if (!url || !isSafeHref(url)) return;
          document.execCommand(command, false, url);
        } else {
          document.execCommand(command, false, commandValue);
        }

        emitChange();
      },
      [disabled, emitChange],
    );

    const insertImage = React.useCallback(
      (src: string) => {
        if (disabled || !isSafeImageSrc(src)) return;
        editorRef.current?.focus();
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${escapeHtml(src)}" alt="" style="width:100%;max-width:100%;display:block;margin-left:auto;margin-right:auto;" />`,
        );
        emitChange();
      },
      [disabled, emitChange],
    );

    const insertImageFromUrl = React.useCallback(() => {
      const url = window.prompt("Paste image URL");
      if (!url) return;
      insertImage(url);
    }, [insertImage]);

    const handleLocalImage = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? "");
          insertImage(result);
        };
        reader.readAsDataURL(file);
      },
      [insertImage],
    );

    const setImageWidth = React.useCallback(
      (width: string) => {
        if (!selectedImage || disabled) return;
        selectedImage.style.width = width;
        selectedImage.style.maxWidth = "100%";
        emitChange();
      },
      [disabled, emitChange, selectedImage],
    );

    const alignImage = React.useCallback(
      (align: "left" | "center" | "right") => {
        if (!selectedImage || disabled) return;
        selectedImage.style.display = "block";

        if (align === "left") {
          selectedImage.style.marginLeft = "0";
          selectedImage.style.marginRight = "auto";
        } else if (align === "center") {
          selectedImage.style.marginLeft = "auto";
          selectedImage.style.marginRight = "auto";
        } else {
          selectedImage.style.marginLeft = "auto";
          selectedImage.style.marginRight = "0";
        }

        emitChange();
      },
      [disabled, emitChange, selectedImage],
    );

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-[6px] border border-input bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          disabled && "opacity-60",
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-muted/30 p-1.5">
          <select
            disabled={disabled}
            defaultValue="p"
            aria-label="Text style"
            onChange={(e) => {
              runCommand("formatBlock", e.target.value);
              e.currentTarget.value = "p";
            }}
            className="h-7 rounded-[6px] border border-border bg-background px-2 text-[11px] text-foreground outline-none disabled:opacity-50"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            title="Heading 1"
            aria-label="Heading 1"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand("formatBlock", "h1")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Heading 2"
            aria-label="Heading 2"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand("formatBlock", "h2")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Quote"
            aria-label="Quote"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand("formatBlock", "blockquote")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>

          {TOOLBAR.map(({ command, label, icon: Icon }) => (
            <button
              key={command}
              type="button"
              title={label}
              aria-label={label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runCommand(command)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}

          <label
            title="Text color"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Type className="h-3.5 w-3.5" />
            <input
              type="color"
              disabled={disabled}
              className="sr-only"
              onChange={(e) => runCommand("foreColor", e.target.value)}
            />
          </label>

          <label
            title="Highlight color"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Highlighter className="h-3.5 w-3.5" />
            <input
              type="color"
              disabled={disabled}
              className="sr-only"
              onChange={(e) => runCommand("hiliteColor", e.target.value)}
            />
          </label>

          <div className="relative">
            <button
              type="button"
              title="Insert image"
              aria-label="Insert image"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setImageMenuOpen((open) => !open)}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-[6px] px-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Image className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </button>

            {imageMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-40 overflow-hidden rounded-[6px] border border-border bg-popover p-1 shadow-lg">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setImageMenuOpen(false);
                    insertImageFromUrl();
                  }}
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[11px] text-popover-foreground hover:bg-accent"
                >
                  <Link className="h-3.5 w-3.5" /> From URL
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setImageMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[11px] text-popover-foreground hover:bg-accent"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload file
                </button>
              </div>
            )}
          </div>

          {selectedImage && (
            <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
              <select
                aria-label="Image size"
                disabled={disabled}
                value={(IMAGE_WIDTHS.find((width) => selectedImage.style.width === width) ?? "100%")}
                onChange={(e) => setImageWidth(e.target.value)}
                className="h-7 rounded-[6px] border border-border bg-background px-2 text-[11px] text-foreground outline-none disabled:opacity-50"
              >
                {IMAGE_WIDTHS.map((width) => (
                  <option key={width} value={width}>
                    {width}
                  </option>
                ))}
              </select>

              <button
                type="button"
                title="Place image left"
                aria-label="Place image left"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => alignImage("left")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Place image center"
                aria-label="Place image center"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => alignImage("center")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Place image right"
                aria-label="Place image right"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => alignImage("right")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="hidden"
            onChange={handleLocalImage}
          />
        </div>

        <div className="relative">
          {empty && !focused && (
            <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            role="textbox"
            aria-multiline="true"
            suppressContentEditableWarning
            onInput={emitChange}
            onClick={(event) => {
              const target = event.target;
              selectImage(target instanceof HTMLImageElement ? target : null);
            }}
            onBlur={() => {
              setFocused(false);
              emitChange();
            }}
            onFocus={() => setFocused(true)}
            className={cn(
              "w-full max-w-none overflow-y-auto px-3 py-2 text-sm text-foreground outline-none",
              "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3",
              "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
              "[&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-[6px] [&_img]:border [&_img]:border-border [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc",
              editorClassName,
            )}
            style={{ minHeight,maxHeight }}
          />
        </div>
      </div>
    );
  },
);
RichTextarea.displayName = "RichTextarea";

export interface RichTextRendererProps {
  value?: string | null;
  fallback?: React.ReactNode;
  className?: string;
}

export function RichTextRenderer({
  value,
  fallback = null,
  className,
}: RichTextRendererProps) {
  const html = React.useMemo(() => sanitizeRichText(value), [value]);

  if (isEmptyHtml(html)) return <>{fallback}</>;

  return (
    <div
      className={cn(
        "max-w-none text-sm leading-relaxed text-foreground/80",
        "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3",
        "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_img]:my-3 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-[6px] [&_img]:border [&_img]:border-border [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function richTextToPlainText(value?: string | null) {
  const sanitized = sanitizeRichText(value);
  if (!sanitized) return "";
  if (typeof window === "undefined") {
    return sanitized.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = sanitized;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}
