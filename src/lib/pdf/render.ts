import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function renderPdf(document: ReactElement<DocumentProps>): Promise<Buffer> {
  return renderToBuffer(document);
}
