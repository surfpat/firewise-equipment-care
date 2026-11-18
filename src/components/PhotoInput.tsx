import type { Photo } from "@/lib/store";

/** Réduit la photo (max 1000 px, JPEG) pour tenir dans la mémoire de l'appareil */
async function reduire(f: File): Promise<Photo> {
  const url = URL.createObjectURL(f);
  const img = new Image(); img.src = url; await img.decode();
  const k = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return { src: c.toDataURL("image/jpeg", 0.6), w: c.width, h: c.height };
}

export function PhotoInput({ label, photos, onChange, multiple = true }: { label: string; photos: Photo[]; onChange: (p: Photo[]) => void; multiple?: boolean }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img src={p.src} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
            <button type="button" aria-label="Retirer la photo" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-primary text-xs text-primary-foreground" onClick={() => onChange(photos.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {(multiple || photos.length === 0) && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-xs text-muted-foreground">
            📷<span>Ajouter</span>
            <input type="file" accept="image/*" multiple={multiple} className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files ?? []); e.target.value = "";
              const nouv = await Promise.all(files.map(reduire));
              onChange(multiple ? [...photos, ...nouv] : nouv.slice(0, 1));
            }} />
          </label>
        )}
      </div>
    </div>
  );
}
