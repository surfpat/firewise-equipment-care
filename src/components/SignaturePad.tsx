import { useEffect, useRef } from "react";

export function SignaturePad({ label, value, onChange }: { label: string; value?: string | undefined; onChange: (v?: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    if (value) { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0); i.src = value; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pos = (e: React.PointerEvent): [number, number] => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  const ctx = () => { const x = ref.current!.getContext("2d")!; x.lineWidth = 2.5; x.lineCap = "round"; x.strokeStyle = "#111"; return x; };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="label">{label}</span>
        <button type="button" className="text-xs text-primary underline" onClick={() => {
          const c = ref.current!; const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); onChange(undefined);
        }}>Effacer</button>
      </div>
      <canvas ref={ref} width={500} height={220} className="h-36 w-full touch-none rounded-md border-2 border-dashed border-border bg-card"
        onPointerDown={(e) => { drawing.current = true; const [x, y] = pos(e); const c = ctx(); c.beginPath(); c.moveTo(x, y); ref.current!.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drawing.current) return; const [x, y] = pos(e); const c = ctx(); c.lineTo(x, y); c.stroke(); }}
        onPointerUp={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }} />
    </div>
  );
}
