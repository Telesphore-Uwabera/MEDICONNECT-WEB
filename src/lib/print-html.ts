export function openHtmlDocument(html: string) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
