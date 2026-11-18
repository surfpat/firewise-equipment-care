import { createFileRoute, Link } from "@tanstack/react-router";
import { setData, useData } from "@/lib/store";
import { alertesBatiment } from "@/lib/normes";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SSI Gestion — Tableau de bord" },
    { name: "description", content: "Suivi des sites, bâtiments, matériel SSI et rapports d'intervention." },
    { property: "og:title", content: "SSI Gestion — Tableau de bord" },
    { property: "og:description", content: "Suivi du matériel de sécurité incendie et rapports." },
  ] }),
  component: Index,
});

function Index() {
  const d = useData();
  const defect = d.materiels.filter((m) => m.etat === "Défectueux" || m.etat === "Hors service").length;
  const stats = [["Sites", d.sites.length], ["Bâtiments", d.batiments.length], ["Matériels", d.materiels.length], ["Rapports", d.rapports.length]];
  const exportJson = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
    a.download = `sauvegarde-ssi-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  const importJson = async (f?: File) => {
    if (!f) return;
    try { const j = JSON.parse(await f.text()); if (confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) setData(() => j); }
    catch { alert("Fichier invalide"); }
  };
  return (
    <div className="space-y-6">
      <section className="panel bg-secondary text-secondary-foreground">
        <h1 className="text-4xl font-bold">Sécurité incendie, sous contrôle.</h1>
        <p className="mt-1 text-sm opacity-80">Gérez votre parc SSI et éditez vos rapports d'intervention.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/rapports/nouveau" search={{}} className="btn-primary">+ Nouveau rapport</Link>
          <Link to="/sites" className="btn-ghost text-foreground">Gérer le matériel</Link>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, n]) => (
          <div key={l} className="panel"><div className="label">{l}</div><div className="font-display text-4xl font-bold">{n}</div></div>
        ))}
      </div>
      {d.batiments.flatMap((s) => alertesBatiment(s).map((a) => <div key={s.id + a} className="panel border-primary text-sm"><b>{d.sites.find((x) => x.id === s.siteId)?.nom} · {s.nom}</b> — <span className="text-primary">{a}</span></div>))}
      {defect > 0 && <div className="panel border-primary text-primary font-semibold">⚠ {defect} matériel(s) défectueux ou hors service</div>}
      <section className="panel">
        <h2 className="text-xl font-bold">Sauvegarde</h2>
        <p className="mb-3 text-sm text-muted-foreground">Les données sont enregistrées sur cet appareil. Téléchargez une sauvegarde régulièrement, ou pour transférer vers un autre appareil.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-dark" onClick={exportJson}>Télécharger la sauvegarde</button>
          <label className="btn-ghost cursor-pointer">Restaurer une sauvegarde<input type="file" accept=".json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} /></label>
        </div>
      </section>
    </div>
  );
}
