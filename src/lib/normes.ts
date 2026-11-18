import type { Rapport, Site } from "./store";

export const TYPES_ERP = ["J", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "W", "X", "Y", "CTS", "EF", "GA", "OA", "PA", "PS", "REF", "SG", "IGH", "ERT", "Habitation"];
export const CATEGORIES_ERP = ["1ère", "2ème", "3ème", "4ème", "5ème"];
export const CATEGORIES_SSI = ["A", "B", "C", "D", "E"];
export const ZONES = ["ZD (détection)", "ZS (mise en sécurité)", "ZA (alarme)", "ZC (compartiment)"];

/** Essais fonctionnels (MS 56 / MS 69 / MS 73) cochables dans le rapport */
export const ESSAIS = [
  "Essai fonctionnel des détecteurs (MS 56)",
  "Essai des déclencheurs manuels",
  "Essai des diffuseurs d'alarme (DS / BAAS)",
  "Essai des DAS / corrélations ZD-ZS (CMSI)",
  "Contrôle des alimentations de sécurité (secteur / batteries)",
  "Contrôle de l'éclairage de sécurité (BAES)",
  "Stock de petites fournitures vérifié (MS 69)",
  "Registre de sécurité renseigné (R 123-51)",
];

const ans = (iso: string | undefined, now: Date) =>
  iso ? (now.getTime() - new Date(iso).getTime()) / (365.25 * 864e5) : Infinity;

/** Obligations réglementaires non respectées pour un site */
export function alertesSite(s: Site, now = new Date()): string[] {
  const a: string[] = [];
  const ab = s.categorieSsi === "A" || s.categorieSsi === "B";
  if (ans(s.derniereVerifAnnuelle, now) > 1) a.push("Vérification annuelle dépassée ou non renseignée (MS 73 §2)");
  if (ab && ans(s.derniereVerifTriennale, now) > 3) a.push("Vérification triennale par organisme agréé requise (SSI cat. A/B, MS 73 §2)");
  if (ab && !s.contratEntretien?.trim()) a.push("Contrat d'entretien obligatoire pour SSI cat. A/B (MS 68)");
  return a;
}

/** Lignes « registre de sécurité » du rapport, communes au PDF et au Word */
export function lignesRegistre(r: Rapport): string[][] {
  const hs = r.horsService;
  return [
    ["Opérateur / qualification", r.qualification || "—"],
    ["Mise hors service", hs?.debut ? `du ${hs.debut} au ${hs.fin || "—"}` : "Aucune"],
    ["Mesures compensatoires", hs?.mesures || "—"],
  ];
}
