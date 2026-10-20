import jsPDF from "jspdf";
import type { LocalScan } from "./db";
import { DISEASE_INFO } from "./detector";

// ── helpers ────────────────────────────────────────────────────────────────────
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function sectionHeader(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 80, 30);
  doc.text(title, x, y);
  return y + 7;
}

function bulletList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  maxWidth: number
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 4);
    doc.text(lines, x + 3, y);
    y += lines.length * 5 + 1.5;
  }
  return y + 2;
}

function numberedList(
  doc: jsPDF,
  items: string[],
  x: number,
  y: number,
  maxWidth: number
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  items.forEach((item, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, maxWidth - 4);
    doc.text(lines, x + 3, y);
    y += lines.length * 5 + 1.5;
  });
  return y + 2;
}

function divider(doc: jsPDF, y: number, margin: number, pageW: number): number {
  doc.setDrawColor(200, 230, 200);
  doc.line(margin, y, pageW - margin, y);
  return y + 6;
}

function checkPageBreak(doc: jsPDF, y: number, needed = 20): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 18) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ── main export ────────────────────────────────────────────────────────────────
export async function generatePDF(scan: LocalScan): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(34, 100, 40);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("FarmGPT — Field Health Report", margin, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MyAI Future Hackathon 2026 · Track 1: PADI & PLATES", margin, 22);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 22, { align: "right" });
  y = 38;

  // ── Scan ID + AI badge ──────────────────────────────────────────────────────
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Scan ID: ${scan.localId}`, margin, y);
  if (scan.llmAnalysis) {
    doc.setFillColor(34, 100, 40);
    doc.roundedRect(pageW - margin - 28, y - 5, 28, 7, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("⚡ AI Enhanced", pageW - margin - 14, y - 0.5, { align: "center" });
  }
  y += 6;

  doc.setDrawColor(200, 230, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Image + result summary ──────────────────────────────────────────────────
  const imgH = 55;
  const imgW = 73;
  if (scan.imageDataUrl) {
    try {
      doc.addImage(scan.imageDataUrl, "JPEG", margin, y, imgW, imgH);
    } catch { /* skip if image fails */ }
  }

  const boxX = scan.imageDataUrl ? margin + imgW + 5 : margin;
  const boxW = scan.imageDataUrl ? contentW - imgW - 5 : contentW;

  doc.setFillColor(242, 250, 243);
  doc.roundedRect(boxX, y, boxW, imgH, 3, 3, "F");

  // Disease name
  doc.setTextColor(20, 70, 25);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(scan.diseaseName ?? "Unknown", boxW - 8);
  doc.text(nameLines, boxX + 4, y + 10);
  let boxY = y + 10 + nameLines.length * 6;

  // Severity badge
  const severity = scan.severity ?? "healthy";
  const sevColors: Record<string, [number, number, number]> = {
    healthy: [22, 163, 74], mild: [202, 138, 4], moderate: [234, 88, 12], severe: [220, 38, 38],
  };
  const [sr, sg, sb] = sevColors[severity] ?? [100, 100, 100];
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(boxX + 4, boxY, 32, 7, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(severity.toUpperCase(), boxX + 20, boxY + 5, { align: "center" });
  boxY += 11;

  // Confidence
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Confidence: ${Math.round((scan.confidence ?? 0) * 100)}%`, boxX + 4, boxY);
  boxY += 6;
  if (scan.cropVariety) { doc.text(`Variety: ${scan.cropVariety}`, boxX + 4, boxY); boxY += 5; }
  if (scan.fieldId) { doc.text(`Field ID: ${scan.fieldId}`, boxX + 4, boxY); boxY += 5; }

  // Urgency (LLM)
  if (scan.llmAnalysis?.urgency) {
    const urgencyLabels: Record<string, string> = {
      monitor: "Monitor", treat_soon: "Treat Soon", treat_immediately: "Treat Immediately",
    };
    const urgencyColors: Record<string, [number, number, number]> = {
      monitor: [37, 99, 235], treat_soon: [234, 88, 12], treat_immediately: [220, 38, 38],
    };
    const [ur, ug, ub] = urgencyColors[scan.llmAnalysis.urgency] ?? [100, 100, 100];
    doc.setFillColor(ur, ug, ub);
    const urgLabel = `⚠ ${urgencyLabels[scan.llmAnalysis.urgency] ?? scan.llmAnalysis.urgency}`;
    doc.roundedRect(boxX + 4, boxY, 50, 7, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(urgLabel, boxX + 29, boxY + 5, { align: "center" });
  }

  y += imgH + 5;

  // Metadata line
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  const meta = [
    `Date: ${new Date(scan.scannedAt).toLocaleDateString()}`,
    scan.latitude ? `GPS: ${scan.latitude.toFixed(4)}, ${scan.longitude?.toFixed(4)}` : null,
    scan.notes ? `Notes: ${scan.notes}` : null,
    scan.synced ? "✓ Cloud synced" : "⏳ Pending sync",
  ].filter(Boolean).join("   ·   ");
  y = addWrappedText(doc, meta, margin, y, contentW, 4.5);
  y += 2;
  y = divider(doc, y, margin, pageW);

  // ── AI Confidence Note ──────────────────────────────────────────────────────
  if (scan.llmAnalysis?.confidenceAdjustment) {
    y = checkPageBreak(doc, y, 18);
    doc.setFillColor(240, 253, 244);
    const noteLines = doc.splitTextToSize(scan.llmAnalysis.confidenceAdjustment, contentW - 10);
    const noteH = noteLines.length * 5 + 8;
    doc.roundedRect(margin, y, contentW, noteH, 2, 2, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(noteLines, margin + 5, y + 6);
    y += noteH + 5;
  }

  // ── About this disease ──────────────────────────────────────────────────────
  const info = DISEASE_INFO[scan.diseaseKey ?? "healthy"];
  if (info?.description) {
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "About This Disease", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    y = addWrappedText(doc, info.description, margin, y, contentW);
    y += 4;
  }

  // ── Observed Symptoms ──────────────────────────────────────────────────────
  const symptoms = scan.llmAnalysis?.symptoms ?? info?.symptoms;
  if (symptoms && symptoms.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Observed Symptoms", margin, y);
    y = bulletList(doc, symptoms, margin, y, contentW);
  }

  // ── Immediate Actions (LLM only) ───────────────────────────────────────────
  if (scan.llmAnalysis?.immediateActions && scan.llmAnalysis.immediateActions.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Immediate Actions Required", margin, y);
    y = numberedList(doc, scan.llmAnalysis.immediateActions, margin, y, contentW);
  }

  // ── Treatment Plan (LLM) ───────────────────────────────────────────────────
  if (scan.llmAnalysis?.treatmentPlan) {
    y = checkPageBreak(doc, y, 30);
    y = sectionHeader(doc, "Treatment Plan", margin, y);
    const tp = scan.llmAnalysis.treatmentPlan;
    const planItems = [
      { label: "Chemical", value: tp.chemical, color: [180, 30, 30] as [number, number, number] },
      { label: "Biological", value: tp.biological, color: [22, 101, 52] as [number, number, number] },
      { label: "Cultural", value: tp.cultural, color: [37, 99, 235] as [number, number, number] },
    ];
    for (const item of planItems) {
      y = checkPageBreak(doc, y, 14);
      const [pr, pg, pb] = item.color;
      doc.setFillColor(pr, pg, pb);
      doc.roundedRect(margin, y - 4, 22, 6, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(item.label, margin + 11, y + 0.5, { align: "center" });
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(item.value, contentW - 28);
      doc.text(lines, margin + 26, y);
      y += Math.max(lines.length * 5, 7) + 3;
    }
    y += 2;
  } else if (severity !== "healthy" && info?.treatments && info.treatments.length > 0) {
    // Fallback to static treatments
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Treatment Recommendations", margin, y);
    y = numberedList(doc, info.treatments, margin, y, contentW);
  }

  // ── Yield Impact & Spread Risk (LLM) ──────────────────────────────────────
  if (scan.llmAnalysis?.yieldImpact || scan.llmAnalysis?.spreadRisk) {
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Risk Assessment", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    if (scan.llmAnalysis.yieldImpact) {
      doc.text(`Estimated Yield Impact: ${scan.llmAnalysis.yieldImpact}`, margin + 3, y);
      y += 6;
    }
    if (scan.llmAnalysis.spreadRisk) {
      const riskColors: Record<string, [number, number, number]> = {
        low: [22, 163, 74], medium: [234, 88, 12], high: [220, 38, 38],
      };
      const [rr, rg, rb] = riskColors[scan.llmAnalysis.spreadRisk] ?? [100, 100, 100];
      doc.text("Spread Risk: ", margin + 3, y);
      doc.setFillColor(rr, rg, rb);
      doc.roundedRect(margin + 30, y - 4.5, 20, 6, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(scan.llmAnalysis.spreadRisk.toUpperCase(), margin + 40, y, { align: "center" });
      y += 7;
    }
    y += 2;
  }

  // ── Prevention Tips ────────────────────────────────────────────────────────
  const prevention = scan.llmAnalysis?.preventionTips ?? info?.prevention;
  if (prevention && prevention.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = sectionHeader(doc, "Prevention Measures", margin, y);
    y = bulletList(doc, prevention, margin, y, contentW);
  }

  // ── Additional Notes (LLM) ─────────────────────────────────────────────────
  if (scan.llmAnalysis?.additionalNotes) {
    y = checkPageBreak(doc, y, 18);
    y = sectionHeader(doc, "Additional Observations", margin, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    y = addWrappedText(doc, scan.llmAnalysis.additionalNotes, margin, y, contentW);
    y += 4;
  }

  // ── Footer (all pages) ─────────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(34, 100, 40);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(
      "FarmGPT · MyAI Future Hackathon 2026 · Track 1: PADI & PLATES",
      pageW / 2,
      pageH - 4.5,
      { align: "center" }
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 4.5, { align: "right" });
  }

  const filename = `ricescan_${scan.diseaseKey ?? "result"}_${new Date(scan.scannedAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
