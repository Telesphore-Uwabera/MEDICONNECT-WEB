import { type ReactNode } from "react";
import { openPrivateDocument, useAuthorizedFileUrl } from "@/lib/private-document";

export function PrivateDocumentLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const opened = await openPrivateDocument(href);
        if (!opened) window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      {children}
    </a>
  );
}

export function PrivateDocumentImage({
  src,
  alt,
  className,
  onError,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  const shown = useAuthorizedFileUrl(src);
  if (!shown) return null;
  return <img src={shown} alt={alt} className={className} onError={onError} />;
}
