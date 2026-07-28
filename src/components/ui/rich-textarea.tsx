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
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Type,
  Upload,
  Underline as UnderlineIcon,
  Unlink,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";

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
  "S",
  "SPAN",
  "STRIKE",
  "STRONG",
  "U",
  "UL",
]);

// Tags whose entire subtree must be discarded outright (not unwrapped) when
// sanitizing pasted HTML - unwrapping would leak their raw text content
// (CSS rules, script source, etc.) into the visible document.
const DROP_TAGS = new Set([
  "STYLE",
  "SCRIPT",
  "HEAD",
  "TITLE",
  "META",
  "LINK",
  "NOSCRIPT",
  "TEMPLATE",
  "IFRAME",
  "OBJECT",
  "EMBED",
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

const ALLOWED_TEXT_DECORATIONS = new Set(["line-through", "underline", "none"]);

function copySafeStyles(source: HTMLElement, target: HTMLElement) {
  const color = source.style.color;
  const backgroundColor = source.style.backgroundColor;
  const textAlign = source.style.textAlign;
  const textDecoration = source.style.textDecorationLine || source.style.textDecoration;

  if (color && isSafeColor(color)) target.style.color = color;
  if (backgroundColor && isSafeColor(backgroundColor)) {
    target.style.backgroundColor = backgroundColor;
  }
  if (textAlign && ALLOWED_ALIGNMENTS.has(textAlign)) {
    target.style.textAlign = textAlign;
  }
  if (textDecoration && ALLOWED_TEXT_DECORATIONS.has(textDecoration.trim())) {
    target.style.textDecoration = textDecoration.trim();
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

    if (DROP_TAGS.has(tag)) {
      return null;
    }

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
  maxHeight?: number;
}

// Extend the base Image node with the same width/alignment attributes the
// old execCommand-based editor produced, and reject unsafe `src` values at
// parse time (covers both paste and programmatic content-setting).
const ResizableImage = TiptapImage.extend({
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const src = element.getAttribute("src") ?? "";
          if (!isSafeImageSrc(src)) return false;
          const marginLeft = element.style.marginLeft;
          const marginRight = element.style.marginRight;
          const align =
            marginRight === "0" || marginRight === "0px"
              ? "right"
              : marginLeft === "0" || marginLeft === "0px"
                ? "left"
                : "center";
          return {
            src,
            alt: element.getAttribute("alt") ?? "",
            width: element.style.width || element.getAttribute("width") || "100%",
            align,
          };
        },
      },
    ];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        renderHTML: (attributes) => ({
          style: `width:${attributes.width};max-width:100%;`,
        }),
      },
      align: {
        default: "center",
        renderHTML: (attributes) => ({
          style:
            attributes.align === "left"
              ? "display:block;margin-left:0;margin-right:auto;"
              : attributes.align === "right"
                ? "display:block;margin-left:auto;margin-right:0;"
                : "display:block;margin-left:auto;margin-right:auto;",
        }),
      },
    };
  },
});

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    link: {
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      isAllowedUri: (url) => isSafeHref(url),
    },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  ResizableImage.configure({ allowBase64: true, inline: false }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

const FORMAT_OPTIONS = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Quote", value: "blockquote" },
];

const EDITOR_CONTENT_CLASSES =
  "w-full max-w-none overflow-y-auto px-3 py-2 text-sm text-foreground outline-none " +
  "[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 " +
  "[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_img]:my-3 [&_img]:max-h-80 [&_img]:rounded-[6px] [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-primary " +
  "[&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc [&_s]:opacity-80";

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
      maxHeight,
    },
    ref,
  ) => {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
    const [selectedImageAttrs, setSelectedImageAttrs] = React.useState<
      { width: string; align: "left" | "center" | "right" } | null
    >(null);
    const focusedRef = React.useRef(false);
    // Marks the very next onUpdate as originating from our own setContent()
    // sync below, so we don't immediately bounce the sanitized value back up
    // through onChange as if the user had typed it.
    const isSyncingRef = React.useRef(false);

    const editor = useEditor({
      extensions: EDITOR_EXTENSIONS,
      content: sanitizeRichText(value),
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (isSyncingRef.current) {
          isSyncingRef.current = false;
          return;
        }
        onChange(normalizeRichText(editor.getHTML()));
      },
      onFocus: () => {
        focusedRef.current = true;
      },
      onBlur: () => {
        focusedRef.current = false;
      },
      onSelectionUpdate: ({ editor }) => {
        const { selection } = editor.state;
        if (selection instanceof NodeSelection && selection.node.type.name === "image") {
          setSelectedImageAttrs({
            width: selection.node.attrs.width ?? "100%",
            align: selection.node.attrs.align ?? "center",
          });
        } else {
          setSelectedImageAttrs(null);
        }
      },
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-multiline": "true",
          class: cn(EDITOR_CONTENT_CLASSES, editorClassName),
        },
      },
    });

    React.useImperativeHandle(ref, () => editor?.view.dom as HTMLDivElement, [editor]);

    React.useEffect(() => {
      if (editor) editor.setEditable(!disabled);
    }, [editor, disabled]);

    // Sync external value changes (e.g. a parent resetting the form) while
    // the user isn't actively typing - never fight a live edit in progress.
    React.useEffect(() => {
      if (!editor || focusedRef.current) return;
      const sanitized = sanitizeRichText(value);
      if (sanitized !== editor.getHTML()) {
        isSyncingRef.current = true;
        editor.commands.setContent(sanitized, { emitUpdate: true });
      }
    }, [editor, value]);

    const insertImage = React.useCallback(
      (src: string) => {
        if (disabled || !editor || !isSafeImageSrc(src)) return;
        editor
          .chain()
          .focus()
          .insertContent({ type: "image", attrs: { src, alt: "", width: "100%", align: "center" } })
          .run();
      },
      [disabled, editor],
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
        if (!editor || disabled) return;
        editor.chain().focus().updateAttributes("image", { width }).run();
      },
      [disabled, editor],
    );

    const alignImage = React.useCallback(
      (align: "left" | "center" | "right") => {
        if (!editor || disabled) return;
        editor.chain().focus().updateAttributes("image", { align }).run();
      },
      [disabled, editor],
    );

    const addLink = React.useCallback(() => {
      if (!editor || disabled) return;
      const url = window.prompt("Paste link URL");
      if (!url || !isSafeHref(url)) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }, [disabled, editor]);

    const empty = editor?.isEmpty ?? true;

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
            value="p"
            aria-label="Text style"
            onChange={(e) => {
              if (!editor) return;
              const v = e.target.value;
              const chain = editor.chain().focus();
              if (v === "p") chain.setParagraph().run();
              else if (v === "blockquote") chain.toggleBlockquote().run();
              else chain.toggleHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
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
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
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
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
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
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Bold"
            aria-label="Bold"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Italic"
            aria-label="Italic"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Underline"
            aria-label="Underline"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Strikethrough"
            aria-label="Strikethrough"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Bullet list"
            aria-label="Bullet list"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Numbered list"
            aria-label="Numbered list"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align left"
            aria-label="Align left"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align center"
            aria-label="Align center"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Align right"
            aria-label="Align right"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Add link"
            aria-label="Add link"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Remove link"
            aria-label="Remove link"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().unsetLink().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Clear format"
            aria-label="Clear format"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>

          <label
            title="Text color"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Type className="h-3.5 w-3.5" />
            <input
              type="color"
              disabled={disabled}
              className="sr-only"
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
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
              onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
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
              <ImageIcon className="h-3.5 w-3.5" />
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
                  <LinkIcon className="h-3.5 w-3.5" /> From URL
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

          {selectedImageAttrs && (
            <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
              <select
                aria-label="Image size"
                disabled={disabled}
                value={
                  (IMAGE_WIDTHS as readonly string[]).includes(selectedImageAttrs.width)
                    ? selectedImageAttrs.width
                    : "100%"
                }
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
          {empty && (
            <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
          <EditorContent editor={editor} style={{ minHeight, maxHeight }} />
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
