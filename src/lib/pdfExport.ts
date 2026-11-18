import { jsPDF } from 'jspdf';
import type { GeneratedSensitivityResult } from '../types';

export function exportSensitivityPdf(params: {
  result: GeneratedSensitivityResult;
  scaleMax: number;
  accuracyFocus: string;
  weapons: string[];
}) {
  const { result, scaleMax, accuracyFocus, weapons } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Dark esports canvas background
  doc.setFillColor(8, 9, 13);
  doc.rect(0, 0, 210, 297, 'F');

  // Header accent bar
  doc.setFillColor(255, 36, 66);
  doc.rect(0, 0, 210, 3, 'F');

  // Brand header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('HEADSHOT LAB', 16, 20);

  doc.setTextColor(255, 36, 66);
  doc.setFontSize(9);
  doc.text('YOUR DEVICE. YOUR AIM. YOUR PRECISION.', 16, 26);

  doc.setTextColor(161, 161, 170);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | Scale: 0 - ${scaleMax}`, 194, 20, { align: 'right' });

  // Device & Profile Banner
  doc.setFillColor(18, 20, 28);
  doc.setDrawColor(45, 48, 62);
  doc.roundedRect(16, 33, 178, 28, 2, 2, 'FD');

  doc.setTextColor(161, 161, 170);
  doc.setFontSize(8);
  doc.text('TARGET SMARTPHONE', 22, 41);
  doc.text('GAMEPLAY STYLE', 95, 41);
  doc.text('ACCURACY FOCUS', 148, 41);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(result.device.slice(0, 34), 22, 48);
  doc.setFontSize(9.5);
  doc.text(result.gameplay_style.slice(0, 28), 95, 48);
  doc.text(accuracyFocus.slice(0, 24), 148, 48);

  doc.setTextColor(167, 139, 250);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Classification: ${result.confidence}`, 22, 56);
  if (weapons.length > 0) {
    doc.text(`Weapons: ${weapons.slice(0, 5).join(', ')}`, 115, 56);
  }

  // Sensitivity Grid (2 cols x 3 rows)
  const items: { label: string; value: number; reason: string }[] = [
    { label: 'GENERAL', value: result.sensitivity.general, reason: result.reasoning.general },
    { label: 'RED DOT', value: result.sensitivity.red_dot, reason: result.reasoning.red_dot },
    { label: '2X SCOPE', value: result.sensitivity.scope_2x, reason: result.reasoning.scope_2x },
    { label: '4X SCOPE', value: result.sensitivity.scope_4x, reason: result.reasoning.scope_4x },
    { label: 'SNIPER SCOPE', value: result.sensitivity.sniper_scope, reason: result.reasoning.sniper_scope },
    { label: 'FREE LOOK', value: result.sensitivity.free_look, reason: result.reasoning.free_look },
  ];

  let y = 70;
  items.forEach((item, idx) => {
    const col = idx % 2;
    const x = col === 0 ? 16 : 108;
    if (col === 0 && idx > 0) y += 36;

    doc.setFillColor(14, 15, 21);
    doc.setDrawColor(42, 45, 58);
    doc.roundedRect(x, y, 86, 32, 2, 2, 'FD');

    doc.setTextColor(161, 161, 170);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(item.label, x + 5, y + 8);

    doc.setTextColor(255, 36, 66);
    doc.setFontSize(18);
    doc.text(String(item.value), x + 81, y + 10, { align: 'right' });

    doc.setTextColor(212, 212, 216);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const wrapped = doc.splitTextToSize(item.reason, 76).slice(0, 3);
    doc.text(wrapped, x + 5, y + 16);
  });

  y += 42;

  // Calibration & Weapon Tips
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('CALIBRATION & WEAPON HANDLING NOTES', 16, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);

  const tips = [...result.calibration_tips, ...result.weapon_recommendations].slice(0, 6);
  tips.forEach((tip) => {
    if (y > 265) return;
    const lines = doc.splitTextToSize(`- ${tip}`, 176);
    doc.text(lines, 16, y);
    y += lines.length * 4.2 + 1.5;
  });

  // Footer Disclaimer
  doc.setDrawColor(42, 45, 58);
  doc.line(16, 276, 194, 276);
  doc.setTextColor(161, 161, 170);
  doc.setFontSize(7.5);
  doc.text(
    'Note: Sensitivity calibrates aim speed and drag control; it does not increase weapon damage or guarantee 100% headshots.',
    16,
    282
  );
  doc.text('HEADSHOT LAB — Free Fire India Sensitivity Engine', 16, 287);

  const safeName = result.device.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`headshot-lab-${safeName}.pdf`);
}
