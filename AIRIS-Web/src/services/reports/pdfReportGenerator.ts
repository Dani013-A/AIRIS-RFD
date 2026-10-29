import jsPDF from "jspdf";
import autoTable, { type RowInput, type Table } from "jspdf-autotable";
import { ReportMetadata, ReportPayload, ReportVisualization } from "../../types/report.types";
import { TIP_LOGO_BASE64 } from "./tipAssetsBase64";

const NAVY = [30, 62, 107] as [number, number, number]; // #1E3E6B
const SLATE = [100, 116, 139] as [number, number, number]; // #64748B
const DARK = [30, 41, 59] as [number, number, number]; // #1E293B
const LIGHT_BG = [248, 250, 252] as [number, number, number]; // #F8FAFC
const BORDER = [226, 232, 240] as [number, number, number]; // #E2E8F0
const TEAL = [13, 148, 136] as [number, number, number]; // #0D9488
const AMBER = [217, 119, 6] as [number, number, number]; // #D97706
const ROSE = [225, 29, 72] as [number, number, number]; // #E11D48
const TIP_GOLD = [229, 160, 13] as [number, number, number]; // #E5A00D

export interface TableReportData {
  headers: string[];
  rows: (string | number)[][];
  summaryStats?: Array<{ label: string; value: string | number }>;
  executiveSummary?: {
    headline: string;
    paragraphs: string[];
    keyObservations: string[];
  };
  visualizations?: ReportVisualization[];
  visualization?: ReportVisualization;
  definitions?: string[];
  columnStyles?: Record<number, { cellWidth?: number | "auto" | "wrap"; halign?: "left" | "center" | "right" }>;
}

export class PdfDocumentLayout {
  doc: jsPDF & { lastAutoTable?: Table };
  metadata: ReportMetadata;
  pageWidth: number;
  pageHeight: number;
  margin: number = 14;
  contentWidth: number;
  currentY: number = 0;
  footerHeight: number = 12;

  constructor(metadata: ReportMetadata, orientation: "portrait" | "landscape" = "portrait") {
    this.metadata = metadata;
    this.doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  ensureSpace(requiredHeightMm: number): void {
    if (this.currentY + requiredHeightMm > this.pageHeight - this.footerHeight) {
      this.doc.addPage();
      this.currentY = 18; // Top margin on subsequent pages
    }
  }

  renderInstitutionalHeader(): void {
    // 1. Official T.I.P. Logo (Left)
    // Logo native dimensions: 202x140. Aspect ratio = 1.4428
    const logoWidth = 22;
    const logoHeight = logoWidth / (202 / 140); // 15.25mm
    const logoX = this.margin;
    const logoY = 8.5;

    try {
      this.doc.addImage(TIP_LOGO_BASE64, "PNG", logoX, logoY, logoWidth, logoHeight, undefined, "FAST");
    } catch {
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(14);
      this.doc.setTextColor(...NAVY);
      this.doc.text("T.I.P.", logoX, logoY + 10);
    }

    // Institutional Letterhead Typography (Center/Left)
    const textX = logoX + logoWidth + 4;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text("TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES", textX, 13);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...DARK);
    this.doc.text("T.I.P. Career Center & OJT Coordination Office", textX, 17);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(...SLATE);
    this.doc.text("Manila Campus: 1338 Arlegui Street, Quiapo, Manila · www.tip.edu.ph", textX, 20.5);

    // Restrained T.I.P. orange divider
    this.doc.setFillColor(...TIP_GOLD);
    this.doc.rect(this.margin, 25.5, this.contentWidth, 0.8, "F");

    this.currentY = 31;
  }

  renderReportTitleAndScope(subtitle?: string): void {
    // Report title: the strongest heading in the document
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(...NAVY);
    const titleLines = this.doc.splitTextToSize(this.metadata.reportTitle, this.contentWidth);
    this.doc.text(titleLines, this.margin, this.currentY);
    this.currentY += titleLines.length * 6 + 2;

    // Subtitle: report description in muted tone
    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(...SLATE);
      const subLines = this.doc.splitTextToSize(subtitle, this.contentWidth);
      this.doc.text(subLines, this.margin, this.currentY);
      this.currentY += subLines.length * 4.6 + 3;
    }

    // Compact subordinate report information (hairline rules, no form card)
    this.renderReportInformation();
  }

  private renderReportInformation(): void {
    const labelW = 30;
    const colGap = 8;
    const colW = (this.contentWidth - colGap) / 2;
    const valW = colW - labelW - 2;
    const lineH = 3.8;

    const leftRows: Array<[string, string]> = [
      ["Scope", this.metadata.scopeDescription || "All Programs · All Coordinators"],
      ["Reporting Period", this.metadata.reportingPeriod || "All Recorded History"],
      ["Data Source", "Authoritative Stored Data"],
    ];
    const rightRows: Array<[string, string]> = [
      ["Generated By", `${this.metadata.generatedBy} (${this.metadata.actorRole})`],
      ["Generated Timestamp", this.metadata.generatedAt],
    ];

    const leftLines = leftRows.map(([, v]) => this.doc.splitTextToSize(v, valW));
    const rightLines = rightRows.map(([, v]) => this.doc.splitTextToSize(v, valW));
    const leftH = leftLines.reduce((a, l) => a + l.length * lineH + 1.6, 0);
    const rightH = rightLines.reduce((a, l) => a + l.length * lineH + 1.6, 0);
    this.ensureSpace(Math.max(leftH, rightH) + 9);

    // Hairline above
    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY);
    this.currentY += 2.5;

    this.doc.setFontSize(7.5);
    let y = this.currentY;
    leftRows.forEach(([label], i) => {
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...SLATE);
      this.doc.text(label, this.margin, y);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(...DARK);
      this.doc.text(leftLines[i], this.margin + labelW, y);
      y += leftLines[i].length * lineH + 1.6;
    });
    let maxY = y;
    y = this.currentY;
    const rx = this.margin + colW + colGap;
    rightRows.forEach(([label], i) => {
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...SLATE);
      this.doc.text(label, rx, y);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(...DARK);
      this.doc.text(rightLines[i], rx + labelW, y);
      y += rightLines[i].length * lineH + 1.6;
    });
    maxY = Math.max(maxY, y);
    this.currentY = maxY + 1;

    // Hairline below
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY);
    this.currentY += 5;
  }

  renderSectionTitle(title: string, subtitle?: string): void {
    // Formal report heading: navy title in given case, muted subtitle,
    // hairline rule below. Never orphaned from following content.
    const subtitleLines = subtitle ? this.doc.splitTextToSize(subtitle, this.contentWidth) : [];
    this.ensureSpace(10 + subtitleLines.length * 3.6 + 14);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitleLines, this.margin, this.currentY);
      this.currentY += subtitleLines.length * 3.6 + 1.5;
    }

    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.25);
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY);
    this.currentY += 4;
  }

  renderExecutiveSummary(summary?: { headline: string; paragraphs: string[]; keyObservations: string[] }): void {
    if (!summary) return;
    const bodySize = 9;
    const lineHeight = 4.6;

    this.ensureSpace(34);

    // Section heading with a short restrained orange accent
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...NAVY);
    this.doc.text("Executive Summary", this.margin, this.currentY);
    this.currentY += 2.2;
    this.doc.setFillColor(...TIP_GOLD);
    this.doc.rect(this.margin, this.currentY, 18, 0.9, "F");
    this.currentY += 5;

    // Primary finding
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...DARK);
    const headlineLines = this.doc.splitTextToSize(summary.headline, this.contentWidth);
    this.doc.text(headlineLines, this.margin, this.currentY);
    this.currentY += headlineLines.length * 5 + 2.5;

    // Supporting clarification (compact, unboxed)
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(bodySize);
    this.doc.setTextColor(...DARK);
    summary.paragraphs.forEach((p) => {
      const pLines = this.doc.splitTextToSize(p, this.contentWidth);
      this.ensureSpace(pLines.length * lineHeight + 2);
      this.doc.text(pLines, this.margin, this.currentY);
      this.currentY += pLines.length * lineHeight + 2;
    });

    // Key observations, compact with hanging indent
    if (summary.keyObservations.length > 0) {
      this.ensureSpace(summary.keyObservations.length * (lineHeight + 1) + 7);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(bodySize);
      this.doc.setTextColor(...NAVY);
      this.doc.text("Key observations", this.margin, this.currentY);
      this.currentY += 4.5;

      this.doc.setFont("helvetica", "normal");
      summary.keyObservations.forEach((obs) => {
        const obsLines = this.doc.splitTextToSize(obs, this.contentWidth - 6);
        this.ensureSpace(obsLines.length * lineHeight + 1);
        this.doc.setTextColor(...SLATE);
        this.doc.text("–", this.margin + 1.5, this.currentY);
        this.doc.setTextColor(...DARK);
        this.doc.text(obsLines, this.margin + 6, this.currentY);
        this.currentY += obsLines.length * lineHeight + 1;
      });
      this.currentY += 3;
    }
  }

  renderSummaryCounters(stats?: Array<{ label: string; value: string | number }>): void {
    if (!stats || stats.length === 0) return;

    this.ensureSpace(28);

    const count = stats.length;
    const gap = 4;
    const cardWidth = (this.contentWidth - (count - 1) * gap) / count;
    const cardHeight = 17;

    stats.forEach((st, idx) => {
      const cardX = this.margin + idx * (cardWidth + gap);

      // Individual metric card: white surface, thin border, large navy value.
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "S");

      // Metric Value
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(11);
      this.doc.setTextColor(...NAVY);
      this.doc.text(String(st.value), cardX + 3, this.currentY + 6);

      // Metric Label
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7);
      this.doc.setTextColor(...SLATE);
      const labelLines = this.doc.splitTextToSize(st.label, cardWidth - 6);
      this.doc.text(labelLines, cardX + 3, this.currentY + 10.5);
    });

    this.currentY += cardHeight + 7;
  }

  renderDonutBreakdown(data: NonNullable<ReportVisualization["donutData"]>, title: string, subtitle?: string, caption?: string): void {
    if (!data || data.length === 0) return;

    const rowPitch = 6.5;
    const totalCount = data.reduce((acc, d) => acc + d.count, 0);
    const captionText = caption ? `${caption} (n = ${totalCount})` : undefined;
    const captionLines = captionText ? this.doc.splitTextToSize(captionText, this.contentWidth) : [];
    const totalHeight = 16 + (subtitle && !caption ? 6 : 0) + captionLines.length * 3.6 + 4 + 12 + rowPitch * data.length + 6;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    if (captionText) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(captionLines, this.margin, this.currentY);
      this.currentY += captionLines.length * 3.6 + 2;
    } else if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 4;
    }

    const barX = this.margin;
    const barW = this.contentWidth;
    const barH = 5;
    this.doc.setFillColor(241, 245, 249);
    this.doc.roundedRect(barX, this.currentY, barW, barH, 1, 1, "F");
    if (totalCount > 0) {
      let segX = barX;
      data.forEach((item, idx) => {
        if (item.count <= 0) return;
        const color =
          item.colorRgb || (idx === 0 ? TEAL : idx === 1 ? NAVY : idx === 2 ? AMBER : SLATE);
        const segW = (item.count / totalCount) * barW;
        this.doc.setFillColor(color[0], color[1], color[2]);
        this.doc.rect(segX, this.currentY, Math.min(segW, barX + barW - segX), barH, "F");
        segX += segW;
      });
    }
    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(barX, this.currentY, barW, barH, 1, 1, "S");
    this.currentY += barH + 4;

    // Legend rows with true counts + shares (zero-value states stay quiet)
    data.forEach((item, idx) => {
      const quiet = item.count === 0;
      const color =
        item.colorRgb || (idx === 0 ? TEAL : idx === 1 ? NAVY : idx === 2 ? AMBER : SLATE);

      const swatch: [number, number, number] = quiet ? [203, 213, 225] : color;
      this.doc.setFillColor(...swatch);
      this.doc.roundedRect(barX, this.currentY - 2.6, 3, 3, 0.4, 0.4, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...(quiet ? SLATE : DARK));
      this.doc.text(item.label, barX + 5, this.currentY);

      this.doc.setTextColor(...(quiet ? SLATE : NAVY));
      const valStr = `${item.count} (${item.percentage.toFixed(1)}%)`;
      this.doc.text(valStr, barX + barW, this.currentY, { align: "right" });

      this.currentY += rowPitch;
    });

    this.currentY += 3;
  }

  renderFunnelPipeline(stages: NonNullable<ReportVisualization["funnelStages"]>, title: string, subtitle?: string): void {
    if (!stages || stages.length === 0) return;

    const totalHeight = 12 + stages.length * 6.5 + 5;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 4;
    }

    const maxCount = Math.max(...stages.map((s) => s.count), 1);
    const labelWidth = 42;
    const trackWidth = Math.min(95, this.contentWidth - labelWidth - 36);
    const trackHeight = 4.2;

    stages.forEach((stage, idx) => {
      const stageY = this.currentY;

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...DARK);
      this.doc.text(`${stage.stageNumber}. ${stage.label}`, this.margin, stageY + 2.7);

      const trackX = this.margin + labelWidth;
      this.doc.setFillColor(241, 245, 249);
      this.doc.roundedRect(trackX, stageY, trackWidth, trackHeight, 0.6, 0.6, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(trackX, stageY, trackWidth, trackHeight, 0.6, 0.6, "S");

      const fillRatio = Math.max(0.02, Math.min(1, stage.count / maxCount));
      const fillWidth = fillRatio * trackWidth;

      if (stage.label.toLowerCase().includes("prepared") || stage.label.toLowerCase().includes("ready")) {
        this.doc.setFillColor(...TEAL);
      } else {
        this.doc.setFillColor(...NAVY);
      }
      this.doc.roundedRect(trackX, stageY, fillWidth, trackHeight, 0.6, 0.6, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...NAVY);
      const metricLabel = `${stage.count} (${stage.percentage.toFixed(1)}%)`;
      this.doc.text(metricLabel, trackX + trackWidth + 3, stageY + 2.7);

      if (stage.dropOff !== undefined && stage.dropOff > 0) {
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...ROSE);
        this.doc.text(`-${stage.dropOff} drop-off`, trackX + trackWidth + 24, stageY + 2.7);
      } else if (idx === 0) {
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...SLATE);
        this.doc.text("Baseline Participant Group", trackX + trackWidth + 24, stageY + 2.7);
      } else if (idx === stages.length - 1 && stage.count > 0) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...TEAL);
        this.doc.text("Ready for Employment", trackX + trackWidth + 24, stageY + 2.7);
      }

      this.currentY += 6.5;
    });

    this.currentY += 4;
  }

  renderScoreDistribution(dist: NonNullable<ReportVisualization["scoreDistribution"]>, title: string, caption?: string): void {
    const totalHeight = 16 + 8 + dist.tiers.length * 6.5 + 6;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...SLATE);
    const sub = caption
      ? `${caption} (n = ${dist.totalEvaluated} evaluated)`
      : `Evaluated participants (${dist.totalEvaluated} of ${dist.totalPopulation} evaluated${
          dist.averageScore !== undefined && dist.averageScore !== null ? ` · Average Score: ${dist.averageScore}/100` : ""
        })`;
    const subLines = this.doc.splitTextToSize(sub, this.contentWidth);
    this.doc.text(subLines, this.margin, this.currentY);
    this.currentY += subLines.length * 3.6 + 2;

    if (dist.totalEvaluated === 0) {
      this.doc.setFillColor(...LIGHT_BG);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 9, 0.8, 0.8, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 9, 0.8, 0.8, "S");
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...SLATE);
      this.doc.text(
        "No completed score evaluations recorded for the selected scope. Assessment records are currently pending.",
        this.margin + 3.5,
        this.currentY + 5.5
      );
      this.currentY += 12;
      return;
    }

    const maxTierCount = Math.max(...dist.tiers.map((t) => t.count), 1);
    const labelWidth = 42;
    const trackWidth = Math.min(95, this.contentWidth - labelWidth - 36);
    const trackHeight = 4.2;

    dist.tiers.forEach((tier) => {
      const tierY = this.currentY;
      const quiet = tier.count === 0;

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...(quiet ? SLATE : DARK));
      this.doc.text(`${tier.range} (${tier.label})`, this.margin, tierY + 2.7);

      const trackX = this.margin + labelWidth;
      this.doc.setFillColor(241, 245, 249);
      this.doc.roundedRect(trackX, tierY, trackWidth, trackHeight, 0.6, 0.6, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(trackX, tierY, trackWidth, trackHeight, 0.6, 0.6, "S");

      if (tier.count > 0) {
        const fillWidth = Math.max(1.5, (tier.count / maxTierCount) * trackWidth);
        const barColor = tier.color || NAVY;
        this.doc.setFillColor(...barColor);
        this.doc.roundedRect(trackX, tierY, fillWidth, trackHeight, 0.6, 0.6, "F");
      }

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...(quiet ? SLATE : NAVY));
      const text = `${tier.count} ${tier.count === 1 ? "student" : "students"} (${tier.percentage.toFixed(1)}%)`;
      this.doc.text(text, trackX + trackWidth + 3, tierY + 2.7);

      this.currentY += 6.5;
    });

    this.currentY += 4;
  }

  renderHorizontalBars(items: NonNullable<ReportVisualization["metrics"]>, title: string, subtitle?: string): void {
    if (!items || items.length === 0) return;

    const totalHeight = 12 + items.length * 6.5 + 5;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 4;
    }

    const maxVal = Math.max(...items.map((i) => i.max || i.value), 1);
    const labelWidth = 46;
    const trackWidth = Math.min(95, this.contentWidth - labelWidth - 36);
    const trackHeight = 4.2;

    items.forEach((item) => {
      const itemY = this.currentY;

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...DARK);
      this.doc.text(item.label, this.margin, itemY + 2.7);

      const trackX = this.margin + labelWidth;
      this.doc.setFillColor(241, 245, 249);
      this.doc.roundedRect(trackX, itemY, trackWidth, trackHeight, 0.6, 0.6, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(trackX, itemY, trackWidth, trackHeight, 0.6, 0.6, "S");

      const fillWidth = Math.max(1, (item.value / maxVal) * trackWidth);
      const color = item.color || (item.label.toLowerCase().includes("prepared") ? TEAL : NAVY);
      this.doc.setFillColor(...color);
      this.doc.roundedRect(trackX, itemY, fillWidth, trackHeight, 0.6, 0.6, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...NAVY);
      const text = item.subtext ? `${item.value} (${item.subtext})` : String(item.value);
      this.doc.text(text, trackX + trackWidth + 3, itemY + 2.7);

      this.currentY += 6.5;
    });

    this.currentY += 4;
  }

  renderHealthTelemetry(items: NonNullable<ReportVisualization["healthTelemetry"]>, title: string): void {
    const totalHeight = 12 + items.length * 8 + 5;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 5;

    items.forEach((item) => {
      const cardY = this.currentY;
      const cardHeight = 7;

      this.doc.setFillColor(...LIGHT_BG);
      this.doc.roundedRect(this.margin, cardY, this.contentWidth, cardHeight, 0.8, 0.8, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(this.margin, cardY, this.contentWidth, cardHeight, 0.8, 0.8, "S");

      const dotColor =
        item.status === "operational"
          ? [22, 101, 52]
          : item.status === "degraded"
          ? [217, 119, 6]
          : [225, 29, 72];
      this.doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      this.doc.circle(this.margin + 3, cardY + 3, 1, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...DARK);
      this.doc.text(item.name, this.margin + 6.5, cardY + 3.8);

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(dotColor[0], dotColor[1], dotColor[2]);
      const statusText =
        item.status === "operational"
          ? "OPERATIONAL"
          : item.status === "degraded"
          ? "DEGRADED"
          : "OFFLINE";
      this.doc.text(statusText, this.margin + 56, cardY + 3.8);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...SLATE);
      const maxDetailWidth = this.contentWidth - 84;
      const detailLines = this.doc.splitTextToSize(item.detail, maxDetailWidth);
      this.doc.text(detailLines[0] || "", this.margin + 80, cardY + 3.8);

      this.currentY += cardHeight + 2.5;
    });

    this.currentY += 3;
  }

  renderTrendLine(viz: ReportVisualization): void {
    this.ensureSpace(30);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text(viz.title, this.margin, this.currentY);
    this.currentY += 5;

    if (viz.subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(viz.subtitle, this.margin, this.currentY);
      this.currentY += 4;
    }

    if (!viz.historicalPoints || viz.historicalPoints.length < 2) {
      const note =
        viz.insufficientDataNote ||
        "Trend unavailable for the selected period because insufficient historical observations are available.";

      this.doc.setFillColor(...LIGHT_BG);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 10, 0.8, 0.8, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 10, 0.8, 0.8, "S");

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...SLATE);
      this.doc.text(note, this.margin + 3.5, this.currentY + 6);

      this.currentY += 13;
      return;
    }

    const points = viz.historicalPoints;
    const maxVal = Math.max(...points.map((p) => p.value ?? p.count ?? 0), 1);
    const plotWidth = this.contentWidth - 16;
    const plotHeight = 20;
    const plotX = this.margin + 8;
    const plotY = this.currentY + 3;

    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.2);
    this.doc.rect(plotX, plotY, plotWidth, plotHeight, "S");

    const coords = points.map((pt, idx) => {
      const val = pt.value ?? pt.count ?? 0;
      const cx = plotX + (idx / (points.length - 1)) * plotWidth;
      const cy = plotY + plotHeight - (val / maxVal) * (plotHeight - 4) - 2;
      return { cx, cy, pt, val };
    });

    this.doc.setDrawColor(...TEAL);
    this.doc.setLineWidth(0.35);
    for (let i = 0; i < coords.length - 1; i++) {
      this.doc.line(coords[i].cx, coords[i].cy, coords[i + 1].cx, coords[i + 1].cy);
    }

    coords.forEach(({ cx, cy, val }) => {
      this.doc.setFillColor(...TEAL);
      this.doc.circle(cx, cy, 0.9, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...NAVY);
      this.doc.text(String(val), cx, cy - 1.8, { align: "center" });
    });

    this.currentY = plotY + plotHeight + 5;
  }

  renderDataTable(
    headers: string[],
    rows: (string | number)[][],
    columnStyles?: Record<number, { cellWidth?: number | "auto" | "wrap"; halign?: "left" | "center" | "right" }>,
    readableRoster = false
  ): void {
    // If remaining space is tight (less than 32mm), start table on next page so header + rows stay together
    if (this.currentY + 32 > this.pageHeight - this.footerHeight) {
      this.doc.addPage();
      this.currentY = 18;
    }

    const effectiveRows: RowInput[] =
      rows.length > 0
        ? rows
        : [
            [
              {
                content: "No records found matching the specified report criteria.",
                colSpan: headers.length,
                styles: { halign: "center", textColor: [100, 116, 139], fontStyle: "italic", cellPadding: 4 },
              },
            ],
          ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: effectiveRows,
      margin: { left: this.margin, right: this.margin, bottom: this.footerHeight + 2 },
      tableWidth: this.contentWidth,
      theme: "striped",
      rowPageBreak: "avoid",
      showHead: "everyPage",
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: readableRoster ? 8 : 6.8,
        fontStyle: "bold",
        halign: "left",
        cellPadding: readableRoster ? 2.5 : 1.8,
      },
      bodyStyles: {
        fontSize: readableRoster ? 8 : 6.4,
        textColor: [30, 41, 59],
        cellPadding: readableRoster ? 2.3 : 1.4,
        valign: "middle",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        overflow: "linebreak",
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
      },
      columnStyles: columnStyles || {},
      didDrawPage: (data) => {
        this.currentY = data.cursor?.y ? data.cursor.y + 3.5 : this.currentY;
      },
    });

    this.currentY = this.doc.lastAutoTable?.finalY
      ? this.doc.lastAutoTable.finalY + 3.5
      : this.currentY + 3.5;
  }

  renderDefinitions(definitions?: string[]): void {
    if (!definitions || definitions.length === 0) return;

    const blockHeight = 3.5 + definitions.length * 2.8;
    this.ensureSpace(blockHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text("Official Metric & Methodological Definitions:", this.margin, this.currentY);
    this.currentY += 3.5;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(6.2);
    this.doc.setTextColor(...SLATE);

    definitions.forEach((def) => {
      const wrapped = this.doc.splitTextToSize(`• ${def}`, this.contentWidth);
      this.doc.text(wrapped, this.margin, this.currentY);
      this.currentY += wrapped.length * 2.8;
    });
  }

  finalize(fileName: string): void {
    const pageCount = (this.doc.internal as typeof this.doc.internal & { getNumberOfPages(): number }).getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      // Running Header on subsequent pages (Page 2+)
      if (i > 1) {
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(6.8);
        this.doc.setTextColor(...SLATE);
        this.doc.text("TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES · CAREER CENTER", this.margin, 9);
        this.doc.text(this.metadata.reportTitle, this.pageWidth - this.margin, 9, { align: "right" });
        this.doc.setDrawColor(...BORDER);
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin, 11, this.pageWidth - this.margin, 11);
      }

      // Universal Running Footer on ALL pages
      // Left: Institution
      // Right: Document Reference & Page X of Y
      // Completely avoids center text collisions!
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.pageHeight - 9, this.pageWidth - this.margin, this.pageHeight - 9);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...SLATE);
      this.doc.text(
        "TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES · CAREER CENTER",
        this.margin,
        this.pageHeight - 5.2
      );

      this.doc.setFont("helvetica", "normal");
      this.doc.text(
        `AIRIS-REP-2026  ·  Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 5.2,
        { align: "right" }
      );
    }

    this.doc.save(fileName);
  }
}

/**
 * Universal PDF Generator accepting either a full unified ReportPayload or a TableReportData structure.
 */
export function generateProfessionalPdf(
  metadataOrPayload: ReportMetadata | ReportPayload,
  reportDataOrFileName?: TableReportData | string,
  maybeFileName?: string
): void {
  const isPayload = (arg: ReportMetadata | ReportPayload): arg is ReportPayload => {
    return arg && "key" in arg && "tableData" in arg && "metadata" in arg;
  };

  if (isPayload(metadataOrPayload)) {
    const payload = metadataOrPayload;
    const fileName = (reportDataOrFileName as string) || `AIRIS_${payload.key}_${Date.now()}.pdf`;
    const orientation = payload.metadata.orientation || "portrait";
    const layout = new PdfDocumentLayout(payload.metadata, orientation);
    const isProfiles = payload.key === "student_profiles";

    // PDF-side display wording (presentation only; web report + data untouched).
    const displaySubtitle = isProfiles
      ? "Institutional overview of student evaluation progress and employability preparedness"
      : payload.question;
    const displayTitle = (t: string): string => {
      if (!isProfiles) return t;
      if (t === "Employability Preparedness Status Distribution") return "Employability Preparedness Status";
      if (t === "Cohort Resume Performance Distribution") return "Resume Performance Distribution";
      return t;
    };

    // 1. Institutional Letterhead
    layout.renderInstitutionalHeader();

    // 2. Report Title, Description & Report Information
    layout.renderReportTitleAndScope(displaySubtitle);

    // 3. Executive Summary (unboxed formal section)
    layout.renderExecutiveSummary(payload.executiveSummary);

    // 4. At-a-Glance Metrics (individual cards, large navy values)
    if (payload.summaryStats && payload.summaryStats.length > 0) {
      layout.renderSectionTitle("At-a-Glance Metrics");
      layout.renderSummaryCounters(payload.summaryStats);
    }

    // 5. Report figures (whitespace-separated formal figures, never boxed)
    if (payload.visualizations && payload.visualizations.length > 0) {
      payload.visualizations.forEach((viz) => {
        if (viz.type === "donut_breakdown" && viz.donutData) {
          const data = viz.donutData;
          const title = displayTitle(viz.title);
          const caption = isProfiles ? "Distribution of students by evaluation completion status." : undefined;
          layout.renderDonutBreakdown(data, title, viz.subtitle, caption);
        } else if (viz.type === "funnel_pipeline" && viz.funnelStages) {
          const stages = viz.funnelStages;
          const title = viz.title;
          const subtitle = viz.subtitle;
          layout.renderFunnelPipeline(stages, title, subtitle);
        } else if (viz.type === "score_distribution" && viz.scoreDistribution) {
          const dist = viz.scoreDistribution;
          const title = displayTitle(viz.title);
          const caption = isProfiles ? "Distribution of evaluated resumes by score range." : undefined;
          layout.renderScoreDistribution(dist, title, caption);
        } else if (viz.type === "telemetry_health" && viz.healthTelemetry) {
          const items = viz.healthTelemetry;
          const title = viz.title;
          layout.renderHealthTelemetry(items, title);
        } else if (viz.type === "horizontal_bars" && viz.metrics) {
          const items = viz.metrics;
          const title = viz.title;
          const subtitle = viz.subtitle;
          layout.renderHorizontalBars(items, title, subtitle);
        } else if (viz.type === "trend_line") {
          layout.renderTrendLine(viz);
        }
      });
    }

    // 6. Student Roster: intentionally starts on a fresh page (page 2)
    // when all preceding content fit on page 1.
    if ((layout.doc.internal as typeof layout.doc.internal & { getNumberOfPages(): number }).getNumberOfPages() === 1) {
      layout.doc.addPage();
      layout.currentY = 18;
    }
    layout.renderSectionTitle(
      isProfiles ? "STUDENT ROSTER" : "Detailed Records",
      isProfiles
        ? "Individual student evaluation records within the selected reporting scope."
        : undefined
    );
    layout.renderDataTable(payload.tableData.headers, payload.tableData.rows, payload.tableData.columnStyles, isProfiles);

    // The web report retains detailed metric definitions; the PDF is an executive summary.
    layout.finalize(fileName);
    return;
  }

  // Backward-compatible invocation
  const metadata = metadataOrPayload as ReportMetadata;
  const reportData = reportDataOrFileName as TableReportData;
  const fileName = maybeFileName || `AIRIS_Report_${Date.now()}.pdf`;
  const orientation = metadata.orientation || (reportData.headers.length >= 7 ? "portrait" : "portrait");
  const layout = new PdfDocumentLayout(metadata, orientation);

  layout.renderInstitutionalHeader();
  layout.renderReportTitleAndScope();
  if (reportData.executiveSummary) {
    layout.renderExecutiveSummary(reportData.executiveSummary);
  }
  layout.renderSummaryCounters(reportData.summaryStats);

  const vizList = reportData.visualizations || (reportData.visualization ? [reportData.visualization] : []);
  vizList.forEach((viz) => {
    if (viz.type === "donut_breakdown" && viz.donutData) {
      layout.renderDonutBreakdown(viz.donutData, viz.title, viz.subtitle);
    } else if (viz.type === "funnel_pipeline" && viz.funnelStages) {
      layout.renderFunnelPipeline(viz.funnelStages, viz.title, viz.subtitle);
    } else if (viz.type === "score_distribution" && viz.scoreDistribution) {
      layout.renderScoreDistribution(viz.scoreDistribution, viz.title);
    } else if (viz.type === "telemetry_health" && viz.healthTelemetry) {
      layout.renderHealthTelemetry(viz.healthTelemetry, viz.title);
    } else if (viz.type === "horizontal_bars" && viz.metrics) {
      layout.renderHorizontalBars(viz.metrics, viz.title, viz.subtitle);
    } else if (viz.type === "trend_line") {
      layout.renderTrendLine(viz);
    }
  });

  layout.renderDataTable(reportData.headers, reportData.rows, reportData.columnStyles);
  layout.renderDefinitions(reportData.definitions);
  layout.finalize(fileName);
}
