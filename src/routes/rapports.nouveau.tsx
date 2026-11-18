import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setData, uid, useData, type Rapport, type TypeRapport } from "@/lib/store";
import { exportDocx, exportPdf } from "@/lib/export";
import { ESSAIS } from "@/lib/normes";
import { SignaturePad } from "@/components/SignaturePad";

export const Route = createFileRoute("/rapports/nouveau")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? (s["id"] as string) : undefined } as { id?: string | undefined }),
  head: () => ({ meta: [
    { title: "Rédiger un rapport SSI" },
    { name: "description", content: "Créer un rapport de maintenance, dépannage, mise en service ou journalier." },
    { property: "og:title", content: "Rédiger un rapport SSI" },
    { property: "og:description", content: "Formulaire de rapport d'intervention SSI." },
  ] }),
  component: Form,
});

const TYPES: TypeRapport[] = ["Maintenance", "Dépannage", "Mise en service", "Rapport journalier"];
const neuf = (n: number): Rapport => ({ id: "", numero: `${new Date().getFullYear()}-${String(n).padStart(4, "0")}`, type: "Maintenance", date: new Date().toISOString().slice(0, 10), technicien: "", client: "", mode: "base", materielIds: [], manuel: { site: "", adresse: "", batiment: "", materiel: "" }, observations: "", anomalies: "", pieces: [] });

function Form() {
  const d = useData(); const { id } = Route.useSearch(); const nav = useNavigate();
  const [r, setR] = useState<Rapport>(() => neuf(1));
  const [ready, setReady] = useState(false);
  useEffect(() => { const ex = d.rapports.find((x) => x.id === id); setR(ex ?? neuf(d.rapports.length + 1)); setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const up = (p: Partial<Rapport>) => setR({ ...r, ...p });
  const commit = () => { const fin = r.id ? r : { ...r, id: uid() };
    setData((x) => ({ ...x, rapports: x.rapports.some((y) => y.id === fin.id) ? x.rapports.map((y) => (y.id === fin.id ? fin : y)) : [...x.rapports, fin] })); setR(fin); return fin; };
  const bats = d.batiments.filter((b) => b.siteId === r.siteId);
  const mats = d.materiels.filter((m) => m.batimentId === r.batimentId);
  const T = (k: "observations" | "anomalies", l: string) => (
    <label className="block"><span className="label">{l}</span><textarea rows={4} className="input" value={r[k]} onChange={(e) => up({ [k]: e.target.value })} /></label>);
  if (!ready) return null;
  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-3xl font-bold">{r.id ? "Modifier le rapport" : "Nouveau rapport"}</h1>
      <section className="panel space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TYPES.map((t) => <button key={t} type="button" onClick={() => up({ type: t })} className={r.type === t ? "btn-primary" : "btn-ghost"}>{t}</button>)}
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <label><span className="label">N° rapport</span><input className="input" value={r.numero} onChange={(e) => up({ numero: e.target.value })} /></label>
          <label><span className="label">Date</span><input type="date" className="input" value={r.date} onChange={(e) => up({ date: e.target.value })} /></label>
          <label><span className="label">Technicien</span><input className="input" value={r.technicien} onChange={(e) => up({ technicien: e.target.value })} /></label>
          <label><span className="label">Client</span><input className="input" value={r.client} onChange={(e) => up({ client: e.target.value })} /></label>
        </div>
      </section>
      <section className="panel space-y-3">
        <div className="flex gap-2">
          <button type="button" className={r.mode === "base" ? "btn-dark" : "btn-ghost"} onClick={() => up({ mode: "base" })}>Depuis la base</button>
          <button type="button" className={r.mode === "manuel" ? "btn-dark" : "btn-ghost"} onClick={() => up({ mode: "manuel" })}>Saisie manuelle</button>
        </div>
        {r.mode === "base" ? (
          <div className="space-y-2">
            {d.sites.length === 0 && <p className="text-sm text-muted-foreground">La base est vide — utilisez la saisie manuelle ou ajoutez des sites.</p>}
            <div className="grid gap-2 md:grid-cols-2">
              <select className="input" value={r.siteId ?? ""} onChange={(e) => up({ siteId: e.target.value, batimentId: undefined, materielIds: [] })}>
                <option value="">— Site —</option>{d.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
              <select className="input" value={r.batimentId ?? ""} onChange={(e) => up({ batimentId: e.target.value, materielIds: [] })} disabled={!r.siteId}>
                <option value="">— Bâtiment —</option>{bats.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}</select>
            </div>
            {mats.length > 0 && <div className="space-y-1"><span className="label">Matériel concerné</span>
              {mats.map((m) => <label key={m.id} className="flex items-center gap-2 rounded bg-muted p-2 text-sm">
                <input type="checkbox" checked={r.materielIds.includes(m.id)} onChange={(e) => up({ materielIds: e.target.checked ? [...r.materielIds, m.id] : r.materielIds.filter((x) => x !== m.id) })} />
                {m.type} — {m.marque} {m.modele} · S/N {m.numeroSerie} · {m.localisation}</label>)}</div>}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {(["site", "adresse", "batiment", "materiel"] as const).map((k) => (
              <label key={k}><span className="label">{{ site: "Site", adresse: "Adresse", batiment: "Bâtiment", materiel: "Matériel (type, marque, modèle, n° série…)" }[k]}</span>
                <input className="input" value={r.manuel[k]} onChange={(e) => up({ manuel: { ...r.manuel, [k]: e.target.value } })} /></label>))}
          </div>
        )}
      </section>
      <section className="panel space-y-3">
        {T("observations", "Observations")}{T("anomalies", "Anomalies constatées")}
        <div><span className="label">Pièces remplacées</span>
          {r.pieces.map((p, i) => (
            <div key={i} className="mt-1 grid grid-cols-[1fr_1fr_4rem_auto] gap-1">
              {(["designation", "reference", "quantite"] as const).map((k) => (
                <input key={k} className="input" placeholder={{ designation: "Désignation", reference: "Référence", quantite: "Qté" }[k]} value={p[k]}
                  onChange={(e) => up({ pieces: r.pieces.map((q, j) => (j === i ? { ...q, [k]: e.target.value } : q)) })} />))}
              <button className="px-2 text-primary" onClick={() => up({ pieces: r.pieces.filter((_, j) => j !== i) })}>✕</button>
            </div>))}
          <button className="btn-ghost mt-2 text-xs" onClick={() => up({ pieces: [...r.pieces, { designation: "", reference: "", quantite: "1" }] })}>+ Ajouter une pièce</button>
        </div>
      </section>
      <section className="panel space-y-3">
        <h2 className="text-xl font-bold">Essais et registre de sécurité</h2>
        <div className="grid gap-1 md:grid-cols-2">
          {ESSAIS.map((e) => <label key={e} className="flex items-center gap-2 rounded bg-muted p-2 text-sm">
            <input type="checkbox" checked={!!r.essais?.[e]} onChange={(ev) => up({ essais: { ...r.essais, [e]: ev.target.checked } })} />{e}</label>)}
        </div>
        <label className="block"><span className="label">Opérateur / qualification (ex. APSAD, habilitation)</span><input className="input" value={r.qualification ?? ""} onChange={(e) => up({ qualification: e.target.value })} /></label>
        <div className="grid gap-2 md:grid-cols-2">
          {(["debut", "fin"] as const).map((k) => <label key={k}><span className="label">Mise hors service — {k === "debut" ? "début" : "fin"}</span>
            <input type="datetime-local" className="input" value={r.horsService?.[k] ?? ""} onChange={(e) => up({ horsService: { debut: "", fin: "", mesures: "", ...r.horsService, [k]: e.target.value } })} /></label>)}
        </div>
        <label className="block"><span className="label">Mesures compensatoires prises</span><textarea rows={2} className="input" value={r.horsService?.mesures ?? ""} onChange={(e) => up({ horsService: { debut: "", fin: "", ...r.horsService, mesures: e.target.value } })} /></label>
      </section>
      <section className="panel grid gap-4 md:grid-cols-2">
        <SignaturePad key={`t${r.id}`} label="Signature technicien" value={r.signatureTechnicien} onChange={(v) => setR((x) => ({ ...x, signatureTechnicien: v }))} />
        <SignaturePad key={`c${r.id}`} label="Signature client" value={r.signatureClient} onChange={(v) => setR((x) => ({ ...x, signatureClient: v }))} />
      </section>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card p-3">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={() => { commit(); nav({ to: "/rapports" }); }}>Enregistrer</button>
          <button className="btn-primary" onClick={() => exportPdf(commit(), d)}>Exporter PDF</button>
          <button className="btn-dark" onClick={() => exportDocx(commit(), d)}>Exporter Word</button>
        </div>
      </div>
    </div>
  );
}
