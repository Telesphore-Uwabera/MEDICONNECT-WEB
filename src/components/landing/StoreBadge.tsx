/**
 * Store badges stay non-clickable until a real listing URL is configured.
 * VITE_APP_STORE_URL and VITE_PLAY_STORE_URL are optional and must not be invented.
 */
export function StoreBadge({
  href,
  src,
  alt,
  soonLabel,
  className = "flex h-9 items-center gap-1.5 overflow-hidden rounded-[6px] bg-black/80 px-1.5",
}: {
  href?: string;
  src: string;
  alt: string;
  soonLabel: string;
  className?: string;
}) {
  const image = <img src={src} alt={alt} className="h-9 w-auto max-w-full object-contain" />;
  if (href) {
    return (
      <a href={href} className={className} rel="noopener noreferrer" target="_blank">
        {image}
      </a>
    );
  }
  return (
    <span className={`${className} opacity-80`} aria-disabled="true" title={soonLabel}>
      {image}
      <span className="pr-1 text-[10px] font-semibold text-white">{soonLabel}</span>
    </span>
  );
}
