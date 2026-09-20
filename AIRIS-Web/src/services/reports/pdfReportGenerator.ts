import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportMetadata, ReportPayload, ReportVisualization } from "../../types/report.types";
import { TIP_LOGO_BASE64, TIP_SEAL_BASE64 } from "./tipAssetsBase64";

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
  doc: jsPDF;
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

    // 2. Official T.I.P. Seal (Right - Restrained Secondary Mark)
    // Seal native dimensions: 182x182 (1:1 square)
    const sealSize = 13.5;
    const sealX = this.pageWidth - this.margin - sealSize;
    const sealY = 9;

    try {
      this.doc.addImage(TIP_SEAL_BASE64, "PNG", sealX, sealY, sealSize, sealSize, undefined, "FAST");
    } catch {
      // Fallback
    }

    // 3. Institutional Letterhead Typography (Center/Left)
    const textX = logoX + logoWidth + 4;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...NAVY);
    this.doc.text("TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES", textX, 13);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...DARK);
    this.doc.text("Career Center & OJT Coordination Office", textX, 17);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(...SLATE);
    this.doc.text("Manila Campus: 363 P. Casal St., Quiapo, Manila 1001 · www.tip.edu.ph", textX, 20.5);

    // 4. Institutional Yellow Accent Bar
    this.doc.setFillColor(...TIP_GOLD);
    this.doc.rect(this.margin, 25, this.contentWidth, 0.7, "F");

    this.currentY = 29.5;
  }

  renderReportTitleAndScope(subtitle?: string): void {
    // Title
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.setTextColor(...NAVY);
    const titleLines = this.doc.splitTextToSize(this.metadata.reportTitle, this.contentWidth);
    this.doc.text(titleLines, this.margin, this.currentY);
    this.currentY += titleLines.length * 4.8 + 1;

    // Subtitle / Question
    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7);
      this.doc.setTextColor(...SLATE);
      const subLines = this.doc.splitTextToSize(subtitle, this.contentWidth);
      this.doc.text(subLines, this.margin, this.currentY);
      this.currentY += subLines.length * 3.4 + 1.5;
    }

    // Scope & Metadata Card (2-Column Clean Grid)
    this.renderMetadataCard();
  }

  private renderMetadataCard(): void {
    const cardX = this.margin;
    const cardWidth = this.contentWidth;
    const padding = 3;
    const colGap = 6;
    const colWidth = (cardWidth - padding * 2 - colGap) / 2;

    this.doc.setFontSize(6.8);
    const scopeVal = this.metadata.scopeDescription || "All Programs · All Coordinators";
    const scopeLines = this.doc.splitTextToSize(scopeVal, colWidth - 14);

    const periodVal = this.metadata.reportingPeriod || "All Recorded History";
    const periodLines = this.doc.splitTextToSize(periodVal, colWidth - 14);

    const actorVal = `${this.metadata.generatedBy} (${this.metadata.actorRole})`;
    const actorLines = this.doc.splitTextToSize(actorVal, colWidth - 22);

    const timeVal = this.metadata.generatedAt;

    const leftHeight = (scopeLines.length + periodLines.length) * 3.4 + 5.5;
    const rightHeight = (actorLines.length + 2) * 3.4 + 5.5;
    const cardHeight = Math.max(leftHeight, rightHeight, 15);

    // Card background
    this.doc.setFillColor(...LIGHT_BG);
    this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "F");
    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "S");

    // Left Column
    let leftY = this.currentY + padding + 2;
    const col1X = cardX + padding;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text("Scope:", col1X, leftY);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...DARK);
    this.doc.text(scopeLines, col1X + 11, leftY);
    leftY += scopeLines.length * 3.4 + 0.8;

    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...NAVY);
    this.doc.text("Period:", col1X, leftY);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...DARK);
    this.doc.text(periodLines, col1X + 11, leftY);

    // Right Column
    let rightY = this.currentY + padding + 2;
    const col2X = cardX + padding + colWidth + colGap;

    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...NAVY);
    this.doc.text("Generated By:", col2X, rightY);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...DARK);
    this.doc.text(actorLines, col2X + 20, rightY);
    rightY += actorLines.length * 3.4 + 0.8;

    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...NAVY);
    this.doc.text("Timestamp:", col2X, rightY);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...DARK);
    this.doc.text(timeVal, col2X + 20, rightY);
    rightY += 3.4;

    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(...NAVY);
    this.doc.text("Data Integrity:", col2X, rightY);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(22, 101, 52); // Forest Green
    this.doc.text("Authoritative Stored Data", col2X + 20, rightY);

    this.currentY += cardHeight + 2.5;
  }

  renderExecutiveSummary(summary?: { headline: string; paragraphs: string[]; keyObservations: string[] }): void {
    if (!summary) return;

    this.ensureSpace(18);

    this.doc.setFillColor(241, 245, 249);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 5, 0.8, 0.8, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.2);
    this.doc.setTextColor(...NAVY);
    this.doc.text("EXECUTIVE SUMMARY & INSTITUTIONAL FINDINGS", this.margin + 2.5, this.currentY + 3.5);
    this.currentY += 6.5;

    // Headline
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.6);
    this.doc.setTextColor(...DARK);
    const headlineLines = this.doc.splitTextToSize(summary.headline, this.contentWidth);
    this.doc.text(headlineLines, this.margin, this.currentY);
    this.currentY += headlineLines.length * 3.8 + 1.5;

    // Paragraphs
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(6.8);
    this.doc.setTextColor(...DARK);
    summary.paragraphs.forEach((p) => {
      const pLines = this.doc.splitTextToSize(p, this.contentWidth);
      this.ensureSpace(pLines.length * 3.2 + 1.5);
      this.doc.text(pLines, this.margin, this.currentY);
      this.currentY += pLines.length * 3.2 + 1.5;
    });

    // Key Observations
    if (summary.keyObservations.length > 0) {
      this.ensureSpace(summary.keyObservations.length * 3.5 + 3);
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...NAVY);
      this.doc.text("Key Observations:", this.margin, this.currentY);
      this.currentY += 3.2;

      summary.keyObservations.forEach((obs) => {
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(6.8);
        this.doc.setTextColor(...DARK);
        const obsLines = this.doc.splitTextToSize(`• ${obs}`, this.contentWidth - 4);
        this.doc.text(obsLines, this.margin + 2, this.currentY);
        this.currentY += obsLines.length * 3.2;
      });
      this.currentY += 1.5;
    }
  }

  renderSummaryCounters(stats?: Array<{ label: string; value: string | number }>): void {
    if (!stats || stats.length === 0) return;

    this.ensureSpace(16);

    const count = stats.length;
    const gap = 2.5;
    const cardWidth = (this.contentWidth - (count - 1) * gap) / count;
    const cardHeight = 12.5;

    stats.forEach((st, idx) => {
      const cardX = this.margin + idx * (cardWidth + gap);

      this.doc.setFillColor(...LIGHT_BG);
      this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "F");
      this.doc.setDrawColor(...BORDER);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 1, 1, "S");

      // Metric Value
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(10);
      this.doc.setTextColor(...NAVY);
      this.doc.text(String(st.value), cardX + 2.5, this.currentY + 5.2);

      // Metric Label
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(...SLATE);
      const labelLines = this.doc.splitTextToSize(st.label, cardWidth - 5);
      this.doc.text(labelLines, cardX + 2.5, this.currentY + 9.2);
    });

    this.currentY += cardHeight + 2.5;
  }

  renderDonutBreakdown(data: NonNullable<ReportVisualization["donutData"]>, title: string, subtitle?: string): void {
    if (!data || data.length === 0) return;

    const totalHeight = 8 + data.length * 4.8 + 3;
    this.ensureSpace(Math.max(totalHeight, 32));

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 3;
    }

    const ringCenterX = this.margin + 15;
    const ringCenterY = this.currentY + 11;
    const outerRadius = 11.5;
    const innerRadius = 6.5;

    const totalCount = data.reduce((acc, d) => acc + d.count, 0);
    let startAngle = -Math.PI / 2;

    data.forEach((item, idx) => {
      const sliceAngle = totalCount > 0 ? (item.count / totalCount) * (Math.PI * 2) : 0;
      const endAngle = startAngle + sliceAngle;

      const color =
        item.colorRgb ||
        (idx === 0 ? TEAL : idx === 1 ? NAVY : idx === 2 ? AMBER : SLATE);

      if (sliceAngle > 0.05) {
        this.doc.setFillColor(color[0], color[1], color[2]);
        this.doc.circle(ringCenterX, ringCenterY, outerRadius, "F");
      }
      startAngle = endAngle;
    });

    // Inner cutout circle
    this.doc.setFillColor(255, 255, 255);
    this.doc.circle(ringCenterX, ringCenterY, innerRadius, "F");

    // Center total text
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...NAVY);
    this.doc.text(String(totalCount), ringCenterX, ringCenterY + 1, { align: "center" });
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(5);
    this.doc.setTextColor(...SLATE);
    this.doc.text("TOTAL", ringCenterX, ringCenterY + 3.2, { align: "center" });

    // Legend on the right
    const legendX = this.margin + 36;
    let legendY = this.currentY + 1.5;

    data.forEach((item, idx) => {
      const color =
        item.colorRgb ||
        (idx === 0 ? TEAL : idx === 1 ? NAVY : idx === 2 ? AMBER : SLATE);

      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.roundedRect(legendX, legendY, 3, 3, 0.4, 0.4, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...DARK);
      this.doc.text(item.label, legendX + 4.5, legendY + 2.3);

      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(...NAVY);
      const valStr = `${item.count} (${item.percentage.toFixed(1)}%)`;
      this.doc.text(valStr, this.margin + this.contentWidth, legendY + 2.3, { align: "right" });

      legendY += 4.5;
    });

    this.currentY = Math.max(ringCenterY + outerRadius + 3, legendY + 1.5);
  }

  renderFunnelPipeline(stages: NonNullable<ReportVisualization["funnelStages"]>, title: string, subtitle?: string): void {
    if (!stages || stages.length === 0) return;

    const totalHeight = 8 + stages.length * 5.8 + 3;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 3;
    }

    const maxCount = Math.max(...stages.map((s) => s.count), 1);
    const labelWidth = 42;
    const trackWidth = Math.min(95, this.contentWidth - labelWidth - 36);
    const trackHeight = 3.6;

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
        this.doc.text("Baseline Cohort", trackX + trackWidth + 24, stageY + 2.7);
      } else if (idx === stages.length - 1 && stage.count > 0) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(6.2);
        this.doc.setTextColor(...TEAL);
        this.doc.text("Ready for OJT", trackX + trackWidth + 24, stageY + 2.7);
      }

      this.currentY += 5.5;
    });

    this.currentY += 2;
  }

  renderScoreDistribution(dist: NonNullable<ReportVisualization["scoreDistribution"]>, title: string): void {
    const totalHeight = 8 + dist.tiers.length * 5.5 + 6;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.5;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(...SLATE);
    const sub = `Evaluated cohorts (${dist.totalEvaluated} of ${dist.totalPopulation} evaluated${
      dist.averageScore !== undefined && dist.averageScore !== null ? ` · Cohort Average: ${dist.averageScore}/100` : ""
    })`;
    this.doc.text(sub, this.margin, this.currentY);
    this.currentY += 3.5;

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
    const trackHeight = 3.6;

    dist.tiers.forEach((tier) => {
      const tierY = this.currentY;

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...DARK);
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
      this.doc.setTextColor(...NAVY);
      const text = `${tier.count} ${tier.count === 1 ? "student" : "students"} (${tier.percentage.toFixed(1)}%)`;
      this.doc.text(text, trackX + trackWidth + 3, tierY + 2.7);

      this.currentY += 5.2;
    });

    this.currentY += 2;
  }

  renderHorizontalBars(items: NonNullable<ReportVisualization["metrics"]>, title: string, subtitle?: string): void {
    if (!items || items.length === 0) return;

    const totalHeight = 8 + items.length * 5.5 + 3;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.5;

    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 3;
    }

    const maxVal = Math.max(...items.map((i) => i.max || i.value), 1);
    const labelWidth = 46;
    const trackWidth = Math.min(95, this.contentWidth - labelWidth - 36);
    const trackHeight = 3.6;

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

      this.currentY += 5.2;
    });

    this.currentY += 2;
  }

  renderHealthTelemetry(items: NonNullable<ReportVisualization["healthTelemetry"]>, title: string): void {
    const totalHeight = 8 + items.length * 6.5 + 3;
    this.ensureSpace(totalHeight);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.8;

    items.forEach((item) => {
      const cardY = this.currentY;
      const cardHeight = 6;

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

      this.currentY += cardHeight + 1.6;
    });

    this.currentY += 1.5;
  }

  renderTrendLine(viz: ReportVisualization): void {
    this.ensureSpace(20);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7.8);
    this.doc.setTextColor(...NAVY);
    this.doc.text(viz.title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3.5;

    if (viz.subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...SLATE);
      this.doc.text(viz.subtitle, this.margin, this.currentY);
      this.currentY += 3;
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
    const maxVal = Math.max(...points.map((p) => p.value), 1);
    const plotWidth = this.contentWidth - 16;
    const plotHeight = 20;
    const plotX = this.margin + 8;
    const plotY = this.currentY + 3;

    this.doc.setDrawColor(...BORDER);
    this.doc.setLineWidth(0.2);
    this.doc.rect(plotX, plotY, plotWidth, plotHeight, "S");

    const coords = points.map((pt, idx) => {
      const cx = plotX + (idx / (points.length - 1)) * plotWidth;
      const cy = plotY + plotHeight - (pt.value / maxVal) * (plotHeight - 4) - 2;
      return { cx, cy, pt };
    });

    this.doc.setDrawColor(...TEAL);
    this.doc.setLineWidth(0.35);
    for (let i = 0; i < coords.length - 1; i++) {
      this.doc.line(coords[i].cx, coords[i].cy, coords[i + 1].cx, coords[i + 1].cy);
    }

    coords.forEach(({ cx, cy, pt }) => {
      this.doc.setFillColor(...TEAL);
      this.doc.circle(cx, cy, 0.9, "F");
      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(...NAVY);
      this.doc.text(String(pt.value), cx, cy - 1.8, { align: "center" });
    });

    this.currentY = plotY + plotHeight + 5;
  }

  renderDataTable(
    headers: string[],
    rows: (string | number)[][],
    columnStyles?: Record<number, { cellWidth?: number | "auto" | "wrap"; halign?: "left" | "center" | "right" }>
  ): void {
    // If remaining space is tight (less than 32mm), start table on next page so header + rows stay together
    if (this.currentY + 32 > this.pageHeight - this.footerHeight) {
      this.doc.addPage();
      this.currentY = 18;
    }

    const effectiveRows =
      rows.length > 0
        ? rows
        : [
            [
              {
                content: "No records found matching the specified report criteria.",
                colSpan: headers.length,
                styles: { halign: "center", textColor: [100, 116, 139], fontStyle: "italic", cellPadding: 4 },
              } as any,
            ],
          ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: effectiveRows,
      margin: { left: this.margin, right: this.margin, bottom: this.footerHeight + 2 },
      tableWidth: this.contentWidth,
      theme: "striped",
      showHead: "everyPage",
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: 6.8,
        fontStyle: "bold",
        halign: "left",
        cellPadding: 1.8,
      },
      bodyStyles: {
        fontSize: 6.4,
        textColor: [30, 41, 59],
        cellPadding: 1.4,
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

    this.currentY = (this.doc as any).lastAutoTable?.finalY
      ? (this.doc as any).lastAutoTable.finalY + 3.5
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
    const pageCount = (this.doc.internal as any).getNumberOfPages();

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
  const isPayload = (arg: any): arg is ReportPayload => {
    return arg && "key" in arg && "tableData" in arg && "metadata" in arg;
  };

  if (isPayload(metadataOrPayload)) {
    const payload = metadataOrPayload;
    const fileName = (reportDataOrFileName as string) || `AIRIS_${payload.key}_${Date.now()}.pdf`;
    const orientation = payload.metadata.orientation || "portrait";
    const layout = new PdfDocumentLayout(payload.metadata, orientation);

    // 1. Institutional Letterhead
    layout.renderInstitutionalHeader();

    // 2. Report Title & Scope
    layout.renderReportTitleAndScope(payload.question);

    // 3. Executive Summary
    layout.renderExecutiveSummary(payload.executiveSummary);

    // 4. Executive Counters
    layout.renderSummaryCounters(payload.summaryStats);

    // 5. Visualizations
    if (payload.visualizations && payload.visualizations.length > 0) {
      payload.visualizations.forEach((viz) => {
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
    }

    // 6. Data Table
    layout.renderDataTable(payload.tableData.headers, payload.tableData.rows, payload.tableData.columnStyles);

    // 7. Definitions
    layout.renderDefinitions(payload.definitions);

    // 8. Finalize
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
