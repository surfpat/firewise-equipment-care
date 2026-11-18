import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { controleDepuis, controlesDe, etatApresControle, observationsDe, setData, uid, useData, type Controle, type Rapport, type StatutControle, type TypeRapport } from "@/lib/store";
import { PhotoInput } from "@/components/PhotoInput";
import { TYPES as TYPES_MAT } from "./sites";
import { exportDocx, exportPdf } from "@/lib/export";
import { essaisPour, EXIGENCES, TYPES_CENTRALE, type TypeCentrale } from "@/lib/normes";
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
  useEffect(() => { const ex = d.rapports.find((x) => x.id === id); setR(ex ? { ...ex, controles: controlesDe(ex, d), observationsList: observationsDe(ex) } : neuf(d.rapports.length + 1)); setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const up = (p: Partial<Rapport>) => setR({ ...r, ...p });
  const commit = () => {
    const nouveaux: typeof d.materiels = [];
    const controles = (r.controles ?? []).map((c) => {
      if (c.materielId || !c.ajouterBase || r.mode !== "base" || !r.batimentId) return c;
      const id = uid();
      nouveaux.push({ id, batimentId: r.batimentId, type: c.type, marque: c.marque, modele: c.modele, numeroSerie: c.numeroSerie, localisation: c.localisation, dateMiseEnService: "", etat: etatApresControle(c.statut, "Fonctionnel") });
      return { ...c, materielId: id, ajouterBase: false };
    });
    const base = { ...r, controles, materielIds: controles.flatMap((c) => (c.materielId ? [c.materielId] : [])), observations: (r.observationsList ?? []).map((o) => o.texte).join("\n") };
    const fin = base.id ? base : { ...base, id: uid() };
    setData((x) => ({ ...x,
      materiels: [...x.materiels.map((m) => { const c = controles.find((k) => k.materielId === m.id); return c ? { ...m, etat: etatApresControle(c.statut, m.etat) } : m; }), ...nouveaux],
      rapports: x.rapports.some((y) => y.id === fin.id) ? x.rapports.map((y) => (y.id === fin.id ? fin : y)) : [...x.rapports, fin] })); setR(fin); return fin; };
  const bats = d.batiments.filter((b) => b.siteId === r.siteId);
  const mats = d.materiels.filter((m) => m.batimentId === r.batimentId);
  const T = (k: "anomalies", l: string) => (
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
              <select className="input" value={r.siteId ?? ""} onChange={(e) => up({ siteId: e.target.value, batimentId: undefined, materielIds: [], controles: (r.controles ?? []).filter((c) => !c.materielId) })}>
                <option value="">— Site —</option>{d.sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</select>
              <select className="input" value={r.batimentId ?? ""} onChange={(e) => { const bt = d.batiments.find((b) => b.id === e.target.value); up({ batimentId: e.target.value, materielIds: [], controles: [...d.materiels.filter((m) => m.batimentId === e.target.value).map(controleDepuis), ...(r.controles ?? []).filter((c) => !c.materielId)], ...(bt?.typeCentrale ? { typeCentrale: bt.typeCentrale } : {}) }); }} disabled={!r.siteId}>
                <option value="">— Bâtiment —</option>{bats.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}</select>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {(["site", "adresse", "batiment", "materiel"] as const).map((k) => (
              <label key={k}><span className="label">{{ site: "Site", adresse: "Adresse", batiment: "Bâtiment", materiel: "Matériel (type, marque, modèle, n° série…)" }[k]}</span>
                <input className="input" value={r.manuel[k]} onChange={(e) => up({ manuel: { ...r.manuel, [k]: e.target.value } })} /></label>))}
          </div>
        )}
      </section>
      <Controles r={r} up={up} peutAjouterBase={r.mode === "base" && !!r.batimentId} />
      <section className="panel grid gap-4 md:grid-cols-2">
        <PhotoInput label="Photo à l'arrivée" multiple={false} photos={r.photoArrivee ? [r.photoArrivee] : []} onChange={(p) => setR((x) => ({ ...x, photoArrivee: p[0] }))} />
        <PhotoInput label="Photo au départ" multiple={false} photos={r.photoDepart ? [r.photoDepart] : []} onChange={(p) => setR((x) => ({ ...x, photoDepart: p[0] }))} />
      </section>
      <section className="panel space-y-3">
        <span className="label">Observations</span>
        {(r.observationsList ?? []).map((o, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Observation {i + 1}</span>
              <button className="text-xs text-primary underline" onClick={() => setR((x) => ({ ...x, observationsList: (x.observationsList ?? []).filter((_, j) => j !== i) }))}>Supprimer</button></div>
            <textarea rows={3} className="input" value={o.texte} onChange={(e) => setR((x) => ({ ...x, observationsList: (x.observationsList ?? []).map((q, j) => (j === i ? { ...q, texte: e.target.value } : q)) }))} />
            <PhotoInput label="Photos" photos={o.photos} onChange={(p) => setR((x) => ({ ...x, observationsList: (x.observationsList ?? []).map((q, j) => (j === i ? { ...q, photos: p } : q)) }))} />
          </div>
        ))}
        <button className="btn-ghost text-xs" onClick={() => setR((x) => ({ ...x, observationsList: [...(x.observationsList ?? []), { texte: "", photos: [] }] }))}>+ Ajouter une observation</button>
        {T("anomalies", "Anomalies constatées")}
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
        <label className="block"><span className="label">Type de centrale</span>
          <select className="input" value={r.typeCentrale ?? ""} onChange={(e) => up({ typeCentrale: e.target.value })}>
            <option value="">— Tous les essais —</option>{TYPES_CENTRALE.map((t) => <option key={t} value={t}>{EXIGENCES[t as TypeCentrale].libelle}</option>)}</select></label>
        <div className="grid gap-1 md:grid-cols-2">
          {essaisPour(r.typeCentrale).map((e) => <label key={e} className="flex items-center gap-2 rounded bg-muted p-2 text-sm">
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

const STATUTS: StatutControle[] = ["Non testé", "Bon fonctionnement", "Défaut"];
const statutCls: Record<StatutControle, string> = { "Non testé": "btn-ghost", "Bon fonctionnement": "btn-dark", "Défaut": "btn-primary" };

function Controles({ r, up, peutAjouterBase }: { r: Rapport; up: (p: Partial<Rapport>) => void; peutAjouterBase: boolean }) {
  const list = r.controles ?? [];
  const set = (i: number, p: Partial<Controle>) => up({ controles: list.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const ok = list.filter((c) => c.statut === "Bon fonctionnement").length;
  const def = list.filter((c) => c.statut === "Défaut").length;
  return (
    <section className="panel space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-bold">Validation du bon fonctionnement</h2>
        <span className="text-xs text-muted-foreground">{ok} OK · {def} défaut(s) · {list.length - ok - def} non testé(s)</span>
        {list.length > 0 && <button className="btn-ghost text-xs" onClick={() => up({ controles: list.map((c) => (c.statut === "Non testé" ? { ...c, statut: "Bon fonctionnement" } : c)) })}>Tout valider</button>}
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Choisissez un bâtiment pour charger son matériel, ou ajoutez des éléments ci-dessous.</p>}
      {list.map((c, i) => (
        <div key={c.id} className="space-y-2 rounded-md border border-border p-3">
          {c.materielId ? (
            <div className="text-sm"><b>{c.type}</b> — {c.marque} {c.modele} · S/N {c.numeroSerie || "—"} · {c.localisation}</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-3">
              <select className="input" value={c.type} onChange={(e) => set(i, { type: e.target.value })}>{TYPES_MAT.map((t) => <option key={t}>{t}</option>)}</select>
              {(["marque", "modele", "numeroSerie", "localisation"] as const).map((k) => (
                <input key={k} className="input" placeholder={{ marque: "Marque", modele: "Modèle", numeroSerie: "N° de série", localisation: "Localisation" }[k]} value={c[k]} onChange={(e) => set(i, { [k]: e.target.value })} />))}
              <button className="text-xs text-primary underline" onClick={() => up({ controles: list.filter((_, j) => j !== i) })}>Retirer</button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1">
            {STATUTS.map((s) => <button key={s} type="button" className={`${c.statut === s ? statutCls[s] : "btn-ghost opacity-60"} px-2 text-xs`} onClick={() => set(i, { statut: s })}>{s === "Bon fonctionnement" ? "✔ OK" : s === "Défaut" ? "✖ Défaut" : "Non testé"}</button>)}
          </div>
          <input className="input" placeholder="Commentaire" value={c.commentaire} onChange={(e) => set(i, { commentaire: e.target.value })} />
          {!c.materielId && peutAjouterBase && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!c.ajouterBase} onChange={(e) => set(i, { ajouterBase: e.target.checked })} /> Ajouter aussi à la base du bâtiment</label>}
        </div>
      ))}
      <button className="btn-ghost text-xs" onClick={() => up({ controles: [...list, { id: uid(), type: "Détecteur de fumée", marque: "", modele: "", numeroSerie: "", localisation: "", statut: "Non testé", commentaire: "", ajouterBase: peutAjouterBase }] })}>+ Ajouter un élément</button>
    </section>
  );
}
