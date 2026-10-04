export type ReportType =
  | "student_profiles"
  | "completion_funnel"
  | "interview_usage"
  | "system_health"
  | "security_audit";

export interface ReportFilterScope {
  coordinator?: string; // "all" | "ccs" | "cea" | "cbe-coa"; legacy "cbe" and "ca" remain readable
  period?: "all" | "7d" | "30d" | "90d" | "1y";
  college?: string; // Optional backwards-compatible alias
}

export interface ReportMetadata {
  reportTitle: string;
  scopeDescription: string;
  reportingPeriod: string;
  generatedAt: string;
  generatedBy: string;
  actorRole: string;
  orientation?: "portrait" | "landscape";
  coordinatorScope?: string;
}

export interface ReportDefinition {
  key: ReportType;
  category: string;
  title: string;
  question: string;
  description: string;
  useCase: string;
}

export interface FunnelStageItem {
  stageNumber: number;
  label: string;
  count: number;
  percentage: number;
  dropOff?: number;
  meaning?: string;
}

export interface ScoreDistributionItem {
  range: string;
  label: string;
  count: number;
  percentage: number;
  color?: [number, number, number];
}

export interface BarMetricItem {
  label: string;
  value: number;
  max: number;
  subtext?: string;
  color?: [number, number, number];
}

export interface HealthTelemetryItem {
  name: string;
  status: "operational" | "degraded" | "error";
  detail: string;
}

export interface DonutCategoryItem {
  label: string;
  count: number;
  percentage: number;
  colorHex?: string;
  colorRgb?: [number, number, number];
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ReportVisualization {
  type:
    | "donut_breakdown"
    | "funnel_pipeline"
    | "score_distribution"
    | "horizontal_bars"
    | "telemetry_health"
    | "trend_line";
  title: string;
  subtitle?: string;
  donutData?: DonutCategoryItem[];
  funnelStages?: FunnelStageItem[];
  scoreDistribution?: {
    metricName: string;
    tiers: ScoreDistributionItem[];
    totalEvaluated: number;
    totalPopulation: number;
    averageScore?: number | null;
  };
  metrics?: BarMetricItem[];
  healthTelemetry?: HealthTelemetryItem[];
  historicalPoints?: HistoricalDataPoint[];
  insufficientDataNote?: string;
}

export interface ExecutiveSummary {
  headline: string;
  paragraphs: string[];
  keyObservations: string[];
}

export interface ReportTableData {
  headers: string[];
  rows: (string | number)[][];
  columnStyles?: Record<
    number,
    { cellWidth?: number | "auto" | "wrap"; halign?: "left" | "center" | "right" }
  >;
}

export interface ReportPayload {
  key: ReportType;
  title: string;
  category: string;
  question: string;
  description: string;
  metadata: ReportMetadata;
  summaryStats: Array<{ label: string; value: string | number; change?: string }>;
  executiveSummary: ExecutiveSummary;
  visualizations: ReportVisualization[];
  tableData: ReportTableData;
  definitions: string[];
  rawCsvData?: string;
}
