import type { Rapport, Reglement } from "./store";

export const TYPES_ERP = ["J", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "W", "X", "Y", "CTS", "EF", "GA", "OA", "PA", "PS", "REF", "SG", "IGH", "ERT", "Habitation"];
export const CATEGORIES_ERP = ["1ère", "2ème", "3ème", "4ème", "5ème"];
export const CATEGORIES_SSI = ["A", "B", "C", "D", "E"];
export const ZONES = ["ZD (détection)", "ZS (mise en sécurité)", "ZA (alarme)", "ZC (compartiment)"];

/** Types d'équipement d'alarme / centrale (NF S 61-936, MS 61-62) */
export type TypeCentrale = "1" | "2a" | "2b" | "3" | "4";
export const TYPES_CENTRALE: TypeCentrale[] = ["1", "2a", "2b", "3", "4"];

interface Exigence { libelle: string; categoriesSsi: string[]; requis: { nom: string; types: string[] }[]; contrat: boolean; triennale: boolean }
export const EXIGENCES: Record<TypeCentrale, Exigence> = {
  "1": { libelle: "Type 1 — SDI + CMSI (SSI cat. A)", categoriesSsi: ["A"], contrat: true, triennale: true, requis: [
    { nom: "Détection automatique", types: ["Détecteur de fumée", "Détecteur de chaleur"] },
    { nom: "Centrale SDI / ECS", types: ["SDI", "Centrale / ECS"] },
    { nom: "CMSI", types: ["CMSI"] },
    { nom: "Déclencheurs manuels", types: ["Déclencheur manuel"] },
    { nom: "Diffuseurs sonores", types: ["Diffuseur sonore", "BAAS"] }] },
  "2a": { libelle: "Type 2a — CMSI + DM (SSI cat. B)", categoriesSsi: ["B"], contrat: true, triennale: true, requis: [
    { nom: "CMSI / UGA", types: ["CMSI", "UGA"] },
    { nom: "Déclencheurs manuels", types: ["Déclencheur manuel"] },
    { nom: "Diffuseurs sonores", types: ["Diffuseur sonore", "BAAS"] }] },
  "2b": { libelle: "Type 2b — BAAS Ma + DM", categoriesSsi: ["C", "D", "E"], contrat: false, triennale: false, requis: [
    { nom: "Déclencheurs manuels", types: ["Déclencheur manuel"] },
    { nom: "BAAS Ma", types: ["BAAS"] }] },
  "3": { libelle: "Type 3 — BAAS Sa/Ma ou équipement autonome", categoriesSsi: ["C", "D", "E"], contrat: false, triennale: false, requis: [
    { nom: "Diffuseurs sonores / BAAS", types: ["BAAS", "Diffuseur sonore"] }] },
  "4": { libelle: "Type 4 — Dispositif sonore autonome (cloche, sirène…)", categoriesSsi: ["E"], contrat: false, triennale: false, requis: [
    { nom: "Dispositif sonore", types: ["Diffuseur sonore", "BAAS"] }] },
};

/** Essais cochables ; `types` = types de centrale concernés (absent = tous) */
const TOUS = TYPES_CENTRALE;
const ESSAIS_DEF: { e: string; types: TypeCentrale[] }[] = [
  { e: "Essai fonctionnel des détecteurs (MS 56)", types: ["1"] },
  { e: "Contrôle de la centrale SDI / ECS (signalisations, dérangements)", types: ["1"] },
  { e: "Essai des déclencheurs manuels", types: ["1", "2a", "2b"] },
  { e: "Essai des DAS / corrélations ZD-ZS (CMSI)", types: ["1", "2a"] },
  { e: "Essai de l'UGA / processus d'alarme générale", types: ["1", "2a"] },
  { e: "Essai des diffuseurs d'alarme (DS / BAAS)", types: TOUS },
  { e: "Contrôle des alimentations de sécurité (AES / batteries)", types: ["1", "2a", "2b", "3"] },
  { e: "Contrôle de l'éclairage de sécurité (BAES)", types: TOUS },
  { e: "Stock de petites fournitures vérifié (MS 69)", types: TOUS },
  { e: "Registre de sécurité renseigné (R 123-51)", types: TOUS },
];
export const ESSAIS = ESSAIS_DEF.map((x) => x.e);
export const essaisPour = (t?: string) => ESSAIS_DEF.filter((x) => !t || x.types.includes(t as TypeCentrale)).map((x) => x.e);

const ans = (iso: string | undefined, now: Date) =>
  iso ? (now.getTime() - new Date(iso).getTime()) / (365.25 * 864e5) : Infinity;

/** Obligations réglementaires non respectées pour un bâtiment */
export function alertesBatiment(s: Reglement, now = new Date(), materielTypes?: string[]): string[] {
  const a: string[] = [];
  const ex = s.typeCentrale ? EXIGENCES[s.typeCentrale as TypeCentrale] : undefined;
  const ab = s.categorieSsi === "A" || s.categorieSsi === "B" || !!ex?.contrat;
  if (ex && s.categorieSsi && !ex.categoriesSsi.includes(s.categorieSsi)) a.push(`Catégorie SSI ${s.categorieSsi} incohérente avec une centrale type ${s.typeCentrale} (attendu : ${ex.categoriesSsi.join("/")})`);
  if (ex && materielTypes) ex.requis.forEach((r) => { if (!r.types.some((t) => materielTypes.includes(t))) a.push(`Matériel requis manquant pour type ${s.typeCentrale} : ${r.nom}`); });
  if (ans(s.derniereVerifAnnuelle, now) > 1) a.push("Vérification annuelle dépassée ou non renseignée (MS 73 §2)");
  if (ab && ans(s.derniereVerifTriennale, now) > 3) a.push("Vérification triennale par organisme agréé requise (SSI cat. A/B — types 1/2a, MS 73 §2)");
  if (ab && !s.contratEntretien?.trim()) a.push("Contrat d'entretien obligatoire pour SSI cat. A/B — types 1/2a (MS 68)");
  return a;
}

/** Lignes « registre de sécurité » du rapport, communes au PDF et au Word */
export function lignesRegistre(r: Rapport): string[][] {
  const hs = r.horsService;
  return [
    ["Type de centrale", r.typeCentrale ? EXIGENCES[r.typeCentrale as TypeCentrale].libelle : "—"],
    ["Opérateur / qualification", r.qualification || "—"],
    ["Mise hors service", hs?.debut ? `du ${hs.debut} au ${hs.fin || "—"}` : "Aucune"],
    ["Mesures compensatoires", hs?.mesures || "—"],
  ];
}
