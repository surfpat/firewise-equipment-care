import type { Data, Photo, Rapport } from "./store";
import { contexteRapport, controlesDe, observationsDe } from "./store";
import { essaisPour, lignesRegistre } from "./normes";
const essaisRows = (r: Rapport) => essaisPour(r.typeCentrale).map((e) => [e, r.essais?.[e] ? "Conforme" : "Non réalisé"]);

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const fname = (r: Rapport, ext: string) => `Rapport-${r.numero}-${r.type.replace(/\s/g, "_")}.${ext}`;
const fr = (d: string) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

/** Toutes les photos du rapport, dans l'ordre : arrivée, départ, puis celles de chaque observation */
function photosDuRapport(r: Rapport) {
  const out: { p: Photo; label: string }[] = [];
  if (r.photoArrivee) out.push({ p: r.photoArrivee, label: "Photo à l'arrivée" });
  if (r.photoDepart) out.push({ p: r.photoDepart, label: "Photo au départ" });
  observationsDe(r).forEach((o, i) => o.photos.forEach((p, j) => out.push({ p, label: `Observation ${i + 1}${o.photos.length > 1 ? ` — photo ${j + 1}` : ""}` })));
  return out;
}
const controlesRows = (r: Rapport, d: Data) => controlesDe(r, d).map((c) => [c.type, `${c.marque} ${c.modele}`.trim(), c.numeroSerie, c.localisation, c.statut, c.commentaire]);
const CONTroles_HEAD = ["Élément", "Marque / Modèle", "N° série", "Localisation", "Bon fonctionnement", "Commentaire"];

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
  const conts = controlesRows(r, d);
  if (conts.length) autoTable(doc, { theme: "grid", headStyles: head, head: [CONTroles_HEAD], body: conts });
  autoTable(doc, { theme: "grid", headStyles: head, head: [["Essais / vérifications", "Résultat"]], body: essaisRows(r) });
  autoTable(doc, { theme: "grid", headStyles: head, head: [["Registre de sécurité (R 123-51)", ""]], body: lignesRegistre(r) });
  // Place la section suivante : nouvelle page si l'espace restant est trop juste (évite un titre orphelin)
  const place = (m: number) => {
    // @ts-expect-error lastAutoTable added by plugin
    if (doc.lastAutoTable.finalY + m > 280) { doc.addPage(); return 20; }
    // @ts-expect-error lastAutoTable added by plugin
    return doc.lastAutoTable.finalY + 8;
  };
  autoTable(doc, { startY: place(30), theme: "grid", pageBreak: "avoid", headStyles: head, head: [["Observations"]], body: [[r.observations || "—"]] });
  autoTable(doc, { startY: place(30), theme: "grid", pageBreak: "avoid", headStyles: { fillColor: [200, 30, 30] }, head: [["Anomalies"]], body: [[r.anomalies || "—"]] });
  if (r.pieces.length) autoTable(doc, { startY: place(30), theme: "grid", pageBreak: "avoid", headStyles: head, head: [["Pièce remplacée", "Référence", "Qté"]], body: r.pieces.map((p) => [p.designation, p.reference, p.quantite]) });

  // Photos : une par bloc, avec son titre, en gardant les proportions
  const photo = (p: Photo, label: string, y: number) => {
    const k = Math.min(120 / p.w, 90 / p.h, 1);
    const w = Math.round(p.w * k), h = Math.round(p.h * k);
    let yy = y;
    if (yy + h + 8 > 285) { doc.addPage(); yy = 18; }
    doc.setFontSize(9); doc.text(label, 14, yy);
    doc.addImage(p.src, "JPEG", 14, yy + 2, w, h);
    return yy + h + 8;
  };
  // @ts-expect-error lastAutoTable added by plugin
  let y = doc.lastAutoTable.finalY + 10;
  const photos = photosDuRapport(r);
  if (photos.length) {
    if (y > 270) { doc.addPage(); y = 18; }
    doc.setFontSize(12); doc.text("Photos", 14, y); y += 6;
    for (const { p, label } of photos) y = photo(p, label, y);
    y += 4;
  }
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
  const octets = (data: string) => Uint8Array.from(atob(data.split(",")[1] ?? ""), (ch) => ch.charCodeAt(0));
  const genre = (data: string) => (data.startsWith("data:image/png") ? "png" : "jpg") as "png" | "jpg";
  const img = (data?: string) => {
    if (!data) return new D.Paragraph("—");
    return new D.Paragraph({ children: [new D.ImageRun({ type: genre(data), data: octets(data), transformation: { width: 240, height: 105 } })] });
  };
  const photo = (p: Photo) => {
    const k = Math.min(1, 420 / p.w, 300 / p.h);
    return new D.Paragraph({ children: [new D.ImageRun({ type: genre(p.src), data: octets(p.src), transformation: { width: Math.round(p.w * k), height: Math.round(p.h * k) } })] });
  };
  const children: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [
    new D.Paragraph({ text: `Rapport SSI — ${r.type}`, heading: D.HeadingLevel.TITLE }),
    new D.Paragraph(`N° ${r.numero} · ${fr(r.date)}`),
    h("Informations"),
    table([["Technicien", r.technicien], ["Client", r.client], ["Site", c.site], ["Adresse", c.adresse], ["Bâtiment", c.batiment], ...(c.materiels.length ? [] : [["Matériel", c.materiel]])]),
  ];
  if (c.materiels.length) children.push(h("Matériel concerné"), table(c.materiels.map((m) => [m.type, `${m.marque} ${m.modele}`, m.numeroSerie, m.zone ?? "", m.localisation, m.certifNF ? "Oui" : "Non", m.etat]), ["Type", "Marque / Modèle", "N° série", "Zone", "Localisation", "NF", "État"]));
  const conts = controlesRows(r, d);
  if (conts.length) children.push(h("Validation du SSI"), table(conts, CONTroles_HEAD));
  children.push(h("Essais / vérifications"), table(essaisRows(r), ["Essai", "Résultat"]), h("Registre de sécurité (R 123-51)"), table(lignesRegistre(r)));
  children.push(h("Observations"), new D.Paragraph(r.observations || "—"), h("Anomalies"), new D.Paragraph(r.anomalies || "—"));
  if (r.pieces.length) children.push(h("Pièces remplacées"), table(r.pieces.map((p) => [p.designation, p.reference, p.quantite]), ["Désignation", "Référence", "Qté"]));
  const photos = photosDuRapport(r);
  if (photos.length) {
    children.push(h("Photos"));
    for (const { p, label } of photos) children.push(new D.Paragraph({ children: [new D.TextRun({ text: label, bold: true })] }), photo(p));
  }
  children.push(h("Signature technicien"), img(r.signatureTechnicien), h("Signature client"), img(r.signatureClient));
  const blob = await D.Packer.toBlob(new D.Document({ sections: [{ children }] }));
  save(blob, fname(r, "docx"));
}
