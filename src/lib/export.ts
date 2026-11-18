import type { Data, Rapport } from "./store";
import { contexteRapport } from "./store";
import { ESSAIS, lignesRegistre } from "./normes";
const essaisRows = (r: Rapport) => ESSAIS.map((e) => [e, r.essais?.[e] ? "Conforme" : "Non réalisé"]);

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const fname = (r: Rapport, ext: string) => `Rapport-${r.numero}-${r.type.replace(/\s/g, "_")}.${ext}`;
const fr = (d: string) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

export async function exportPdf(r: Rapport, d: Data) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const c = contexteRapport(r, d);
  const doc = new jsPDF();
  doc.setFillColor(200, 30, 30); doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255); doc.setFontSize(16);
  doc.text(`Rapport SSI — ${r.type}`, 14, 12);
  doc.setFontSize(10); doc.text(`N° ${r.numero} · ${fr(r.date)}`, 14, 20);
  doc.setTextColor(20);
  const head = { fillColor: [40, 40, 40] as [number, number, number] };
  autoTable(doc, {
    startY: 32, theme: "grid", headStyles: head, head: [["Informations", ""]],
    body: [["Technicien", r.technicien], ["Client", r.client], ["Site", c.site], ["Adresse", c.adresse], ["Bâtiment", c.batiment], ...(c.materiels.length ? [] : [["Matériel", c.materiel]])],
  });
  if (c.materiels.length) autoTable(doc, {
    theme: "grid", headStyles: head,
    head: [["Type", "Marque / Modèle", "N° série", "Zone", "Localisation", "NF", "État"]],
    body: c.materiels.map((m) => [m.type, `${m.marque} ${m.modele}`, m.numeroSerie, m.zone ?? "", m.localisation, m.certifNF ? "Oui" : "Non", m.etat]),
  });
  autoTable(doc, { theme: "grid", headStyles: head, head: [["Essais / vérifications", "Résultat"]], body: essaisRows(r) });
  autoTable(doc, { theme: "grid", headStyles: head, head: [["Registre de sécurité (R 123-51)", ""]], body: lignesRegistre(r) });
  autoTable(doc, { theme: "grid", headStyles: head, head: [["Observations"]], body: [[r.observations || "—"]] });
  autoTable(doc, { theme: "grid", headStyles: { fillColor: [200, 30, 30] }, head: [["Anomalies"]], body: [[r.anomalies || "—"]] });
  if (r.pieces.length) autoTable(doc, { theme: "grid", headStyles: head, head: [["Pièce remplacée", "Référence", "Qté"]], body: r.pieces.map((p) => [p.designation, p.reference, p.quantite]) });
  // @ts-expect-error lastAutoTable added by plugin
  let y = doc.lastAutoTable.finalY + 10;
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.text("Signature technicien", 14, y); doc.text("Signature client", 110, y);
  if (r.signatureTechnicien) doc.addImage(r.signatureTechnicien, "PNG", 14, y + 3, 80, 35);
  if (r.signatureClient) doc.addImage(r.signatureClient, "PNG", 110, y + 3, 80, 35);
  doc.rect(14, y + 3, 80, 35); doc.rect(110, y + 3, 80, 35);
  save(doc.output("blob"), fname(r, "pdf"));
}

export async function exportDocx(r: Rapport, d: Data) {
  const D = await import("docx");
  const c = contexteRapport(r, d);
  const cell = (t: string, bold = false) => new D.TableCell({ children: [new D.Paragraph({ children: [new D.TextRun({ text: t || "", bold })] })] });
  const table = (rows: string[][], header?: string[]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    rows: [...(header ? [new D.TableRow({ children: header.map((h) => cell(h, true)) })] : []), ...rows.map((row) => new D.TableRow({ children: row.map((x, i) => cell(x, !header && i === 0)) }))],
  });
  const h = (t: string) => new D.Paragraph({ text: t, heading: D.HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } });
  const img = (data?: string) => {
    if (!data) return new D.Paragraph("—");
    const bin = atob(data.split(",")[1] ?? "");
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new D.Paragraph({ children: [new D.ImageRun({ type: "png", data: bytes, transformation: { width: 240, height: 105 } })] });
  };
  const children: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [
    new D.Paragraph({ text: `Rapport SSI — ${r.type}`, heading: D.HeadingLevel.TITLE }),
    new D.Paragraph(`N° ${r.numero} · ${fr(r.date)}`),
    h("Informations"),
    table([["Technicien", r.technicien], ["Client", r.client], ["Site", c.site], ["Adresse", c.adresse], ["Bâtiment", c.batiment], ...(c.materiels.length ? [] : [["Matériel", c.materiel]])]),
  ];
  if (c.materiels.length) children.push(h("Matériel concerné"), table(c.materiels.map((m) => [m.type, `${m.marque} ${m.modele}`, m.numeroSerie, m.zone ?? "", m.localisation, m.certifNF ? "Oui" : "Non", m.etat]), ["Type", "Marque / Modèle", "N° série", "Zone", "Localisation", "NF", "État"]));
  children.push(h("Essais / vérifications"), table(essaisRows(r), ["Essai", "Résultat"]), h("Registre de sécurité (R 123-51)"), table(lignesRegistre(r)));
  children.push(h("Observations"), new D.Paragraph(r.observations || "—"), h("Anomalies"), new D.Paragraph(r.anomalies || "—"));
  if (r.pieces.length) children.push(h("Pièces remplacées"), table(r.pieces.map((p) => [p.designation, p.reference, p.quantite]), ["Désignation", "Référence", "Qté"]));
  children.push(h("Signature technicien"), img(r.signatureTechnicien), h("Signature client"), img(r.signatureClient));
  const blob = await D.Packer.toBlob(new D.Document({ sections: [{ children }] }));
  save(blob, fname(r, "docx"));
}
