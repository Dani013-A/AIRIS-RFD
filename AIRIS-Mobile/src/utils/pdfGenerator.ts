/**
 * Create a PDF document from simple text using basic document-building commands.
 */
export function generatePdfFromMarkdown(title: string, markdown: string): string {
  const lines = markdown.split("\n");

  let streamContent = "BT\n";
  streamContent += "/F2 16 Tf\n";
  streamContent += "72 740 Td\n";
  streamContent += `(${escapePdfString(title)}) Tj\n`;
  streamContent += "ET\n";

  let y = 705;
  streamContent += "BT\n";
  streamContent += "/F1 10 Tf\n";
  streamContent += "72 0 Td\n";

  for (const line of lines) {
    if (y < 45) {
      // Stop drawing text before it spills off the bottom of the page.
      break;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      streamContent += `0 -12 Td\n`;
      y -= 12;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const text = trimmed.substring(3);
      streamContent += "ET\nBT\n/F2 11 Tf\n";
      streamContent += `72 ${y - 18} Td\n`;
      streamContent += `(${escapePdfString(text)}) Tj\n`;
      streamContent += "ET\n";

      streamContent += "0.4 w\n";
      streamContent += "0.6 G\n";
      streamContent += `72 ${y - 22} m\n`;
      streamContent += `540 ${y - 22} l\n`;
      streamContent += "S\n";

      streamContent += "BT\n/F1 10 Tf\n0 0 Td\n";
      y -= 26;
    } else if (trimmed.startsWith("# ")) {
      const text = trimmed.substring(2);
      streamContent += "ET\nBT\n/F2 13 Tf\n";
      streamContent += `72 ${y - 20} Td\n`;
      streamContent += `(${escapePdfString(text)}) Tj\n`;
      streamContent += "ET\nBT\n/F1 10 Tf\n0 0 Td\n";
      y -= 20;
    } else {
      streamContent += "ET\nBT\n/F1 9.5 Tf\n";
      streamContent += `72 ${y - 11} Td\n`;
      streamContent += `(${escapePdfString(trimmed)}) Tj\n`;
      streamContent += "ET\nBT\n0 0 Td\n";
      y -= 11;
    }
  }
  streamContent += "ET\n";

  const objects: string[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n");

  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n");

  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>\nendobj\n");

  const streamLength = streamContent.length;
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}endstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += objects[i];
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 0; i < offsets.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, "0");
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";

  return pdf;
}

/**
 * Escapes characters in standard text content so they do not break the PDF stream parser.
 */
function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}
