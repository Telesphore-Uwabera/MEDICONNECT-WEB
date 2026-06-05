export function SkeletonRow() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted/60" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 rounded bg-muted" /></td>
      <td className="px-4 py-3 text-right"><div className="h-7 w-16 rounded bg-muted ml-auto" /></td>
    </tr>
  );
}
