import { createFileRoute, Link } from "@tanstack/react-router";
import { contexteRapport, setData, useData } from "@/lib/store";
import { exportDocx, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/rapports/")({
  head: () => ({ meta: [
    { title: "Rapports d'intervention SSI" },
    { name: "description", content: "Liste des rapports de maintenance, dépannage, mise en service et journaliers." },
    { property: "og:title", content: "Rapports d'intervention SSI" },
    { property: "og:description", content: "Rapports SSI exportables en PDF et Word." },
  ] }),
  component: Liste,
});

function Liste() {
  const d = useData();
  const list = [...d.rapports].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-4">
      <div className="flex items-center"><h1 className="mr-auto text-3xl font-bold">Rapports</h1><Link to="/rapports/nouveau" search={{}} className="btn-primary">+ Nouveau</Link></div>
      {list.length === 0 && <p className="text-muted-foreground">Aucun rapport pour l'instant.</p>}
      {list.map((r) => { const c = contexteRapport(r, d); return (
        <div key={r.id} className="panel flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <div className="flex items-center gap-2"><span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{r.type}</span><span className="text-xs text-muted-foreground">N° {r.numero} · {new Date(r.date).toLocaleDateString("fr-FR")}</span></div>
            <div className="mt-1 font-semibold">{c.site || "—"} {c.batiment && `· ${c.batiment}`}</div>
            <div className="text-sm text-muted-foreground">Technicien : {r.technicien || "—"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/rapports/nouveau" search={{ id: r.id }} className="btn-ghost">Modifier</Link>
            <button className="btn-primary" onClick={() => exportPdf(r, d)}>PDF</button>
            <button className="btn-dark" onClick={() => exportDocx(r, d)}>Word</button>
            <button className="btn-ghost text-primary" onClick={() => confirm("Supprimer ce rapport ?") && setData((x) => ({ ...x, rapports: x.rapports.filter((y) => y.id !== r.id) }))}>✕</button>
          </div>
        </div>); })}
    </div>
  );
}
