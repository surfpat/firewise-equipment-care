import { useSyncExternalStore } from "react";

export type Etat = "Fonctionnel" | "À surveiller" | "Défectueux" | "Hors service";
export interface Site { id: string; nom: string; adresse: string }
export interface Reglement {
  typeCentrale?: string | undefined; typeErp?: string | undefined; categorieErp?: string | undefined; categorieSsi?: string | undefined;
  contratEntretien?: string | undefined; derniereVerifAnnuelle?: string | undefined; derniereVerifTriennale?: string | undefined;
}
export interface Batiment extends Reglement { id: string; siteId: string; nom: string }
export interface Materiel {
  id: string; batimentId: string; type: string; marque: string; modele: string;
  numeroSerie: string; localisation: string; dateMiseEnService: string; etat: Etat;
  zone?: string | undefined; certifNF?: boolean | undefined;
}
export interface Photo { src: string; w: number; h: number }
export type StatutControle = "Non testé" | "Bon fonctionnement" | "Défaut";
export interface Controle {
  id: string; materielId?: string | undefined; ajouterBase?: boolean | undefined;
  type: string; marque: string; modele: string; numeroSerie: string; localisation: string;
  statut: StatutControle; commentaire: string;
}
export interface Observation { texte: string; photos: Photo[] }
export type TypeRapport = "Maintenance" | "Dépannage" | "Mise en service" | "Rapport journalier";
export interface Piece { designation: string; reference: string; quantite: string }
export interface Rapport {
  id: string; numero: string; type: TypeRapport; date: string; technicien: string; client: string;
  mode: "base" | "manuel"; siteId?: string | undefined; batimentId?: string | undefined; materielIds: string[];
  manuel: { site: string; adresse: string; batiment: string; materiel: string };
  observations: string; anomalies: string; pieces: Piece[];
  typeCentrale?: string | undefined; qualification?: string | undefined; essais?: Record<string, boolean> | undefined;
  horsService?: { debut: string; fin: string; mesures: string } | undefined;
  controles?: Controle[] | undefined; observationsList?: Observation[] | undefined;
  photoArrivee?: Photo | undefined; photoDepart?: Photo | undefined;
  signatureTechnicien?: string | undefined; signatureClient?: string | undefined;
}
export interface Data { sites: Site[]; batiments: Batiment[]; materiels: Materiel[]; rapports: Rapport[] }

const KEY = "ssi-gestion-v1";
const EMPTY: Data = { sites: [], batiments: [], materiels: [], rapports: [] };
let cache: Data | null = null;
const listeners = new Set<() => void>();

function load(): Data {
  if (cache) return cache;
  try {
    const d: Data = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    // Ancien format : infos réglementaires stockées sur le site → recopiées sur ses bâtiments
    const champs = ["typeErp", "categorieErp", "categorieSsi", "contratEntretien", "derniereVerifAnnuelle", "derniereVerifTriennale"] as const;
    d.batiments = d.batiments.map((b) => {
      const s = d.sites.find((x) => x.id === b.siteId) as Record<string, string | undefined> | undefined;
      const nb: Batiment = { ...b };
      champs.forEach((k) => { if (!nb[k] && s?.[k]) nb[k] = s[k]; });
      return nb;
    });
    d.sites = d.sites.map(({ id, nom, adresse }) => ({ id, nom, adresse }));
    cache = d;
  }
  catch { cache = EMPTY; }
  return cache!;
}
export function setData(fn: (d: Data) => Data) {
  const next = fn(load());
  try { localStorage.setItem(KEY, JSON.stringify(next)); }
  catch { alert("Mémoire de l'appareil pleine : retirez des photos ou téléchargez une sauvegarde puis supprimez d'anciens rapports."); return; }
  cache = next;
  listeners.forEach((l) => l());
}
export function useData(): Data {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    load,
    () => EMPTY,
  );
}
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const controleDepuis = (m: Materiel): Controle => ({
  id: uid(), materielId: m.id, type: m.type, marque: m.marque, modele: m.modele, numeroSerie: m.numeroSerie, localisation: m.localisation, statut: "Non testé", commentaire: "",
});
/** Contrôles du rapport (anciens rapports : reconstruits depuis le matériel coché) */
export const controlesDe = (r: Rapport, d: Data): Controle[] =>
  r.controles ?? d.materiels.filter((m) => r.materielIds.includes(m.id)).map(controleDepuis);
export const observationsDe = (r: Rapport): Observation[] =>
  r.observationsList ?? (r.observations ? [{ texte: r.observations, photos: [] }] : []);
/** État du matériel en base après un contrôle */
export const etatApresControle = (s: StatutControle, actuel: Etat): Etat =>
  s === "Bon fonctionnement" ? "Fonctionnel" : s === "Défaut" ? "Défectueux" : actuel;

export function contexteRapport(r: Rapport, d: Data) {
  if (r.mode === "manuel") return { ...r.manuel, materiels: [] as Materiel[] };
  const site = d.sites.find((s) => s.id === r.siteId);
  const bat = d.batiments.find((b) => b.id === r.batimentId);
  const materiels = d.materiels.filter((m) => r.materielIds.includes(m.id));
  return {
    site: site?.nom ?? "", adresse: site?.adresse ?? "", batiment: bat ? `${bat.nom}${bat.typeErp ? ` — ERP type ${bat.typeErp}` : ""}${bat.categorieErp ? ` ${bat.categorieErp} cat.` : ""}${bat.categorieSsi ? ` — SSI cat. ${bat.categorieSsi}` : ""}` : "",
    materiel: materiels.map((m) => `${m.type} ${m.marque} ${m.modele} (S/N ${m.numeroSerie}${m.zone ? `, ${m.zone}` : ""})`).join(", "),
    materiels,
  };
}
