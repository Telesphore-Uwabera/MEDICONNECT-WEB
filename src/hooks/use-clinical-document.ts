import { useMutation } from "@tanstack/react-query";
import { downloadAuthedFile } from "@/lib/download-file";

export function useDownloadClinicalDocument() {
  return useMutation({
    mutationFn: ({
      path,
      filename,
    }: {
      path: string;
      filename: string;
    }) => downloadAuthedFile(path, filename),
  });
}
