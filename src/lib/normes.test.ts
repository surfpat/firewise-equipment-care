import { describe, expect, it } from "vitest";
import { alertesBatiment } from "./normes";

const now = new Date("2026-11-18");
const base = {};

describe("obligations SSI", () => {
  it("alerte si la vérification annuelle a plus d'un an", () => {
    expect(alertesBatiment({ ...base, derniereVerifAnnuelle: "2025-10-01" }, now)).toHaveLength(1);
    expect(alertesBatiment({ ...base, derniereVerifAnnuelle: "2026-01-01" }, now)).toHaveLength(0);
  });
  it("SSI cat. A exige triennale (< 3 ans) et contrat d'entretien", () => {
    const a = alertesBatiment({ ...base, categorieSsi: "A", derniereVerifAnnuelle: "2026-06-01", derniereVerifTriennale: "2022-01-01" }, now);
    expect(a.some((x) => x.includes("triennale"))).toBe(true);
    expect(a.some((x) => x.includes("Contrat"))).toBe(true);
  });
  it("SSI cat. C n'exige ni triennale ni contrat", () => {
    expect(alertesBatiment({ ...base, categorieSsi: "C", derniereVerifAnnuelle: "2026-06-01" }, now)).toHaveLength(0);
  });
});
