import jsPDF from 'jspdf';
import type { ScanResult, ScanModuleResult, RiskLevel } from '../types';

const COLORS = {
  text: [23, 23, 23] as const,
  muted: [110, 110, 120] as const,
  border: [225, 225, 230] as const,
  panel: [246, 247, 249] as const,
  primary: [37, 99, 235] as const,
  critical: [220, 38, 38] as const,
  high: [234, 88, 12] as const,
  medium: [217, 119, 6] as const,
  low: [37, 99, 235] as const,
  safe: [22, 163, 74] as const,
  white: [255, 255, 255] as const,
};

const riskColor = (risk: RiskLevel | string): readonly [number, number, number] => {
  switch (risk) {
    case 'CRITICAL': return COLORS.critical;
    case 'HIGH': return COLORS.high;
    case 'MEDIUM': return COLORS.medium;
    case 'LOW': return COLORS.low;
    case 'SAFE': return COLORS.safe;
    default: return COLORS.muted;
  }
};

const severityForModule = (mod: ScanModuleResult): { label: string; color: readonly [number, number, number] } => {
  if (mod.scoreDeduction === 0) return { label: 'PASS', color: COLORS.safe };
  if (mod.scoreDeduction > 10) return { label: 'CRITICAL', color: COLORS.critical };
  return { label: 'WARNING', color: COLORS.medium };
};

class ReportBuilder {
  doc: jsPDF;
  margin = 16;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  y: number;
  private generatedAt: string;
  private targetUrl: string;

  constructor(targetUrl: string) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.margin;
    this.generatedAt = new Date().toLocaleString();
    this.targetUrl = targetUrl;
  }

  private setColor(c: readonly [number, number, number]) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  private setFill(c: readonly [number, number, number]) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }

  private setDraw(c: readonly [number, number, number]) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }

  ensureSpace(height: number) {
    if (this.y + height > this.pageHeight - this.margin - 8) {
      this.doc.addPage();
      this.y = this.margin;
    }
  }

  sectionTitle(text: string) {
    this.ensureSpace(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.setColor(COLORS.text);
    this.doc.text(text, this.margin, this.y);
    this.y += 2;
    this.setDraw(COLORS.border);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 7;
  }

  paragraph(text: string, opts: { fontSize?: number; color?: readonly [number, number, number]; bold?: boolean } = {}) {
    const { fontSize = 10, color = COLORS.text, bold = false } = opts;
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(fontSize);
    this.setColor(color);
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    const lineHeight = fontSize * 0.42;
    for (const line of lines) {
      this.ensureSpace(lineHeight + 1);
      this.doc.text(line, this.margin, this.y);
      this.y += lineHeight;
    }
    this.y += 2;
  }

  bulletList(items: string[], opts: { markerColor?: readonly [number, number, number]; fontSize?: number } = {}) {
    const { markerColor = COLORS.primary, fontSize = 9.5 } = opts;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(fontSize);
    const lineHeight = fontSize * 0.42;
    const indent = 5;
    for (const item of items) {
      const lines = this.doc.splitTextToSize(item, this.contentWidth - indent);
      this.ensureSpace(lineHeight * lines.length + 2);
      this.setFill(markerColor);
      this.doc.circle(this.margin + 1, this.y - 1.2, 0.8, 'F');
      this.setColor(COLORS.text);
      lines.forEach((line: string, i: number) => {
        this.doc.text(line, this.margin + indent, this.y + i * lineHeight);
      });
      this.y += lineHeight * lines.length + 1.5;
    }
  }

  divider() {
    this.ensureSpace(6);
    this.setDraw(COLORS.border);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 6;
  }

  coverPage(result: ScanResult, criticalIssues: number, warnings: number, passedChecks: number) {
    // Header band
    this.setFill([17, 24, 39]);
    this.doc.rect(0, 0, this.pageWidth, 42, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(20);
    this.setColor(COLORS.white);
    this.doc.text('JobJockey Security Report', this.margin, 20);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(200, 205, 215);
    this.doc.text(`Target: ${result.url}`, this.margin, 29);
    this.doc.text(`Generated: ${this.generatedAt}`, this.margin, 35);

    this.y = 54;

    // Score + Risk summary row
    const boxW = (this.contentWidth - 8) / 2;
    const boxH = 32;

    // Score box
    this.setDraw(COLORS.border);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.y, boxW, boxH, 2, 2, 'S');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(24);
    const scoreColor = result.overallScore >= 80 ? COLORS.safe : result.overallScore >= 50 ? COLORS.medium : COLORS.critical;
    this.setColor(scoreColor);
    this.doc.text(`${result.overallScore}/100`, this.margin + 6, this.y + 16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.setColor(COLORS.muted);
    this.doc.text('Overall Security Score', this.margin + 6, this.y + 24);

    // Risk box
    const riskX = this.margin + boxW + 8;
    this.doc.roundedRect(riskX, this.y, boxW, boxH, 2, 2, 'S');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(20);
    const rc = riskColor(result.riskLevel);
    this.setColor(rc);
    this.doc.text(result.riskLevel, riskX + 6, this.y + 16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.setColor(COLORS.muted);
    this.doc.text('Risk Level', riskX + 6, this.y + 24);

    this.y += boxH + 10;

    // Stat row: critical / warnings / passed
    const statW = (this.contentWidth - 8) / 3;
    const stats: Array<[string, number, readonly [number, number, number]]> = [
      ['Critical Issues', criticalIssues, COLORS.critical],
      ['Warnings', warnings, COLORS.medium],
      ['Passed Checks', passedChecks, COLORS.safe],
    ];
    stats.forEach(([label, value, color], i) => {
      const x = this.margin + i * (statW + 4);
      this.setFill(COLORS.panel);
      this.doc.roundedRect(x, this.y, statW, 22, 2, 2, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(16);
      this.setColor(color);
      this.doc.text(String(value), x + 5, this.y + 12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.5);
      this.setColor(COLORS.muted);
      this.doc.text(label, x + 5, this.y + 18);
    });

    this.y += 22 + 12;
  }

  moduleSection(mod: ScanModuleResult) {
    const severity = severityForModule(mod);
    this.ensureSpace(16);

    // Header bar
    this.setFill(COLORS.panel);
    this.doc.roundedRect(this.margin, this.y, this.contentWidth, 10, 1.5, 1.5, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.5);
    this.setColor(COLORS.text);
    this.doc.text(mod.moduleName, this.margin + 4, this.y + 6.8);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.setColor(severity.color);
    const badgeText = mod.scoreDeduction > 0 ? `${severity.label} · -${mod.scoreDeduction} pts` : severity.label;
    const badgeWidth = this.doc.getTextWidth(badgeText);
    this.doc.text(badgeText, this.pageWidth - this.margin - badgeWidth - 4, this.y + 6.8);

    this.y += 14;

    if (mod.findings.length) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.setColor(COLORS.muted);
      this.ensureSpace(6);
      this.doc.text('FINDINGS', this.margin, this.y);
      this.y += 5;
      this.bulletList(mod.findings, { markerColor: COLORS.primary });
    }

    if (mod.remediations.length) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.setColor(COLORS.muted);
      this.ensureSpace(6);
      this.doc.text('RECOMMENDED ACTIONS', this.margin, this.y);
      this.y += 5;
      this.bulletList(mod.remediations, { markerColor: COLORS.safe });
    }

    this.y += 3;
    this.divider();
  }

  finalizeFooters() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.setDraw(COLORS.border);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.pageHeight - 12, this.pageWidth - this.margin, this.pageHeight - 12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.setColor(COLORS.muted);
      this.doc.text(`JobJockey Security Report · ${this.targetUrl}`, this.margin, this.pageHeight - 7);
      const pageLabel = `Page ${i} of ${pageCount}`;
      const w = this.doc.getTextWidth(pageLabel);
      this.doc.text(pageLabel, this.pageWidth - this.margin - w, this.pageHeight - 7);
    }
  }
}

export function generateScanReportPDF(result: ScanResult): void {
  let criticalIssues = 0;
  let warnings = 0;
  let passedChecks = 0;

  Object.values(result.modules).forEach((mod) => {
    if (mod.scoreDeduction > 10) criticalIssues++;
    else if (mod.scoreDeduction > 0) warnings++;
    else passedChecks++;
  });

  const builder = new ReportBuilder(result.url);
  builder.coverPage(result, criticalIssues, warnings, passedChecks);

  // Executive summary
  builder.sectionTitle('Executive Summary');
  const humanSummary = (result.modules.info?.rawOutput as any)?.human_summary
    || `Security scan of ${result.url} completed on ${new Date(result.timestamp).toLocaleString()}. Overall score: ${result.overallScore}/100 (${result.riskLevel} risk).`;
  builder.paragraph(humanSummary);

  // Key recommendations (deduped, across all modules)
  const allRemediations = Array.from(new Set(
    Object.values(result.modules).flatMap((mod) => mod.remediations)
  ));
  if (allRemediations.length) {
    builder.sectionTitle('Key Recommendations');
    builder.bulletList(allRemediations, { markerColor: COLORS.safe });
  }

  // Detailed findings per module
  builder.sectionTitle('Detailed Findings');
  Object.values(result.modules).forEach((mod) => builder.moduleSection(mod));

  builder.finalizeFooters();

  const hostname = (() => {
    try { return new URL(result.url).hostname; } catch { return result.url; }
  })();
  builder.doc.save(`security-report-${hostname}.pdf`);
}
