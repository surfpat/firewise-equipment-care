import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setData, uid, useData, type Etat, type Materiel, type Site } from "@/lib/store";
import { alertesSite, CATEGORIES_ERP, CATEGORIES_SSI, TYPES_ERP, ZONES } from "@/lib/normes";

export const Route = createFileRoute("/sites")({
  head: () => ({ meta: [
    { title: "Base matériel SSI — Sites et bâtiments" },
    { name: "description", content: "Sites, bâtiments et équipements de sécurité incendie." },
    { property: "og:title", content: "Base matériel SSI" },
    { property: "og:description", content: "Sites, bâtiments et équipements SSI." },
  ] }),
  component: Sites,
});

const ETATS: Etat[] = ["Fonctionnel", "À surveiller", "Défectueux", "Hors service"];
export const TYPES = ["Détecteur de fumée", "Détecteur de chaleur", "Déclencheur manuel", "Centrale / ECS", "CMSI", "Diffuseur sonore", "Diffuseur lumineux", "BAES", "Extincteur", "Clapet coupe-feu", "Volet de désenfumage", "Ventouse / DAS", "BAAS", "UGA", "DCM / DCMR", "SDI", "Autre"];
const etatCls: Record<Etat, string> = { "Fonctionnel": "bg-chart-3/15 text-chart-3", "À surveiller": "bg-accent/30 text-foreground", "Défectueux": "bg-primary/15 text-primary", "Hors service": "bg-secondary text-secondary-foreground" };

function Sites() {
  const d = useData();
  const [nom, setNom] = useState(""); const [adr, setAdr] = useState("");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Base matériel</h1>
      <form className="panel grid gap-2 md:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); if (!nom) return; setData((x) => ({ ...x, sites: [...x.sites, { id: uid(), nom, adresse: adr }] })); setNom(""); setAdr(""); }}>
        <input className="input" placeholder="Nom du site" value={nom} onChange={(e) => setNom(e.target.value)} />
        <input className="input" placeholder="Adresse" value={adr} onChange={(e) => setAdr(e.target.value)} />
        <button className="btn-primary">+ Ajouter un site</button>
      </form>
      {d.sites.length === 0 && <p className="text-muted-foreground">Aucun site. Commencez par en ajouter un.</p>}
      {d.sites.map((s) => <SiteCard key={s.id} id={s.id} />)}
    </div>
  );
}

function SiteCard({ id }: { id: string }) {
  const d = useData(); const s = d.sites.find((x) => x.id === id)!;
  const [bat, setBat] = useState("");
  const bats = d.batiments.filter((b) => b.siteId === id);
  return (
    <details open className="panel">
      <summary className="flex cursor-pointer items-center gap-2">
        <span className="font-display text-2xl font-bold">{s.nom}</span>
        <span className="text-sm text-muted-foreground">{s.adresse}</span>
        <button className="ml-auto text-xs text-primary underline" onClick={(e) => { e.preventDefault(); if (!confirm("Supprimer ce site et tout son contenu ?")) return;
          const bIds = bats.map((b) => b.id);
          setData((x) => ({ ...x, sites: x.sites.filter((y) => y.id !== id), batiments: x.batiments.filter((b) => b.siteId !== id), materiels: x.materiels.filter((m) => !bIds.includes(m.batimentId)) })); }}>Supprimer</button>
      </summary>
      <ReglementSite s={s} />
      <div className="mt-3 space-y-3">
        {bats.map((b) => <BatCard key={b.id} id={b.id} />)}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!bat) return; setData((x) => ({ ...x, batiments: [...x.batiments, { id: uid(), siteId: id, nom: bat }] })); setBat(""); }}>
          <input className="input" placeholder="Nouveau bâtiment" value={bat} onChange={(e) => setBat(e.target.value)} />
          <button className="btn-dark shrink-0">+ Bâtiment</button>
        </form>
      </div>
    </details>
  );
}

function ReglementSite({ s }: { s: Site }) {
  const up = (p: Partial<Site>) => setData((x) => ({ ...x, sites: x.sites.map((y) => (y.id === s.id ? { ...y, ...p } : y)) }));
  const al = alertesSite(s);
  const sel = (k: keyof Site, l: string, opts: string[]) => (
    <label className="block"><span className="label">{l}</span>
      <select className="input" value={(s[k] as string) ?? ""} onChange={(e) => up({ [k]: e.target.value })}><option value="">—</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>);
  const inp = (k: keyof Site, l: string, type = "text") => (
    <label className="block"><span className="label">{l}</span><input type={type} className="input" value={(s[k] as string) ?? ""} onChange={(e) => up({ [k]: e.target.value })} /></label>);
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {sel("typeErp", "Type d'établissement", TYPES_ERP)}{sel("categorieErp", "Catégorie ERP", CATEGORIES_ERP)}{sel("categorieSsi", "Catégorie SSI", CATEGORIES_SSI)}
        {inp("contratEntretien", "Contrat d'entretien (prestataire)")}{inp("derniereVerifAnnuelle", "Dernière vérif. annuelle", "date")}{inp("derniereVerifTriennale", "Dernière vérif. triennale", "date")}
      </div>
      {al.length > 0 ? al.map((a) => <p key={a} className="text-sm font-semibold text-primary">⚠ {a}</p>) : <p className="text-sm font-semibold text-chart-3">✔ Obligations de vérification à jour</p>}
    </div>
  );
}

const vide = (batimentId: string): Materiel => ({ id: "", batimentId, type: "Détecteur de fumée", marque: "", modele: "", numeroSerie: "", localisation: "", dateMiseEnService: "", etat: "Fonctionnel" });

function BatCard({ id }: { id: string }) {
  const d = useData(); const b = d.batiments.find((x) => x.id === id)!;
  const mats = d.materiels.filter((m) => m.batimentId === id);
  const [edit, setEdit] = useState<Materiel | null>(null);
  const save = () => { if (!edit) return;
    setData((x) => ({ ...x, materiels: edit.id ? x.materiels.map((m) => (m.id === edit.id ? edit : m)) : [...x.materiels, { ...edit, id: uid() }] })); setEdit(null); };
  const f = (k: keyof Materiel, label: string, type = "text") => (
    <label className="block"><span className="label">{label}</span>
      <input type={type} className="input" value={edit![k] as string} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} /></label>
  );
  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold">🏢 {b.nom}</h3>
        <span className="text-xs text-muted-foreground">{mats.length} matériel(s)</span>
        <button className="ml-auto text-xs text-primary underline" onClick={() => confirm("Supprimer ce bâtiment ?") && setData((x) => ({ ...x, batiments: x.batiments.filter((y) => y.id !== id), materiels: x.materiels.filter((m) => m.batimentId !== id) }))}>Supprimer</button>
      </div>
      <div className="mt-2 space-y-2">
        {mats.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2 rounded bg-card p-2 text-sm">
            <span className="font-semibold">{m.type}</span>
            <span className="text-muted-foreground">{m.marque} {m.modele} · S/N {m.numeroSerie || "—"} · {m.localisation}{m.zone && ` · ${m.zone}`}{m.certifNF ? " · NF" : " · ⚠ non NF"}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${etatCls[m.etat]}`}>{m.etat}</span>
            <span className="ml-auto flex gap-3 text-xs">
              <button className="underline" onClick={() => setEdit(m)}>Modifier</button>
              <button className="text-primary underline" onClick={() => setData((x) => ({ ...x, materiels: x.materiels.filter((y) => y.id !== m.id) }))}>Suppr.</button>
            </span>
          </div>
        ))}
      </div>
      {edit ? (
        <div className="mt-3 grid gap-2 rounded bg-card p-3 md:grid-cols-2">
          <label className="block"><span className="label">Type d'équipement</span>
            <select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          {f("marque", "Marque")}{f("modele", "Modèle")}{f("numeroSerie", "N° de série")}{f("localisation", "Localisation")}{f("dateMiseEnService", "Date de mise en service", "date")}
          <label className="block"><span className="label">Zone (dossier d'identité SSI)</span>
            <select className="input" value={edit.zone ?? ""} onChange={(e) => setEdit({ ...edit, zone: e.target.value })}><option value="">—</option>{ZONES.map((z) => <option key={z}>{z}</option>)}</select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.certifNF} onChange={(e) => setEdit({ ...edit, certifNF: e.target.checked })} /> Matériel admis à la marque NF (MS 58)</label>
          <label className="block"><span className="label">État</span>
            <select className="input" value={edit.etat} onChange={(e) => setEdit({ ...edit, etat: e.target.value as Etat })}>{ETATS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <div className="flex items-end gap-2"><button className="btn-primary" onClick={save}>Enregistrer</button><button className="btn-ghost" onClick={() => setEdit(null)}>Annuler</button></div>
        </div>
      ) : <button className="btn-ghost mt-2 text-xs" onClick={() => setEdit(vide(id))}>+ Ajouter du matériel</button>}
    </div>
  );
}
