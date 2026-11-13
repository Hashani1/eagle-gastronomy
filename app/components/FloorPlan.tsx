// app/components/FloorPlan.tsx
'use client';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface Tavolina {
  id: string;
  emri: string;
  karrige: number;
  statusi: string;
  pozX: number;
  pozY: number;
  forma?: 'katrore' | 'rrethore' | 'drejtkëndëshe';
  madhësia?: 'e_vogël' | 'mesatare' | 'e_madhe';
  gjerësia?: number;
  lartësia?: number;
  kamarierEmri?: string; // 🆕 Emri i kamarierit që e ka zënë
  kamarierId?: string;
}

interface FloorPlanProps {
  tavolinat: Tavolina[];
  editable?: boolean;
  kamarierAktualId?: string; // 🆕 ID e kamarierit që po shikon
  onTavolinaLëviz?: (id: string, x: number, y: number) => void;
  onTavolinaKliko?: (t: Tavolina) => void;
}

// ─── Karriget vizuale rreth tavolinës ───
function Karriget({
  numri,
  forma,
  gjerësia,
  lartësia,
}: {
  numri: number;
  forma: string;
  gjerësia: number;
  lartësia: number;
}) {
  if (numri <= 0) return null;
  const karrigeArray = Array.from({ length: numri });
  const eshteRrethore = forma === 'rrethore';
  const eshteDrejtkëndëshe = forma === 'drejtkëndëshe';

  return (
    <>
      {karrigeArray.map((_, i) => {
        let top = '0px';
        let left = '0px';
        let transform = '';

        if (eshteRrethore) {
          const këndi = (i / numri) * 2 * Math.PI - Math.PI / 2;
          const rrezja = Math.max(gjerësia, lartësia) / 2 + 12;
          const x = Math.cos(këndi) * rrezja;
          const y = Math.sin(këndi) * rrezja;
          top = `calc(50% + ${y}px - 8px)`;
          left = `calc(50% + ${x}px - 8px)`;
        } else if (eshteDrejtkëndëshe) {
          const anët = 2;
          const karrigePërAnë = Math.ceil(numri / anët);
          const anë = Math.floor(i / karrigePërAnë);
          const pozicioniNëAnë = i % karrigePërAnë;
          const pozicioniPërqindje = ((pozicioniNëAnë + 1) / (karrigePërAnë + 1)) * 100;

          if (anë === 0) {
            top = '-20px';
            left = `${pozicioniPërqindje}%`;
            transform = 'translateX(-50%)';
          } else {
            top = `calc(100% + 4px)`;
            left = `${pozicioniPërqindje}%`;
            transform = 'translateX(-50%)';
          }
        } else {
          const anët = 4;
          const karrigePërAnë = Math.ceil(numri / anët);
          const anë = Math.floor(i / karrigePërAnë);
          const pozicioniNëAnë = i % karrigePërAnë;
          const pozicioniPërqindje = ((pozicioniNëAnë + 1) / (karrigePërAnë + 1)) * 100;

          if (anë === 0) {
            top = '-20px';
            left = `${pozicioniPërqindje}%`;
            transform = 'translateX(-50%)';
          } else if (anë === 1) {
            top = `${pozicioniPërqindje}%`;
            left = `calc(100% + 4px)`;
            transform = 'translateY(-50%)';
          } else if (anë === 2) {
            top = `calc(100% + 4px)`;
            left = `${pozicioniPërqindje}%`;
            transform = 'translateX(-50%)';
          } else {
            top = `${pozicioniPërqindje}%`;
            left = '-20px';
            transform = 'translateY(-50%)';
          }
        }

        return (
          <div
            key={i}
            className="absolute w-4 h-4 bg-gray-400 rounded border border-gray-600 shadow-sm"
            style={{ top, left, transform }}
          />
        );
      })}
    </>
  );
}

// ─── Tavolinë e tërheqshme ───
function TavolinaDraggable({
  tavolina,
  editable,
  onKliko,
}: {
  tavolina: Tavolina;
  editable: boolean;
  onKliko?: (t: Tavolina) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tavolina.id,
      disabled: !editable,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: `${tavolina.pozX}px`,
    top: `${tavolina.pozY}px`,
    zIndex: isDragging ? 50 : 1,
    cursor: editable ? 'grab' : 'pointer',
  };

  const ngjyra =
    tavolina.statusi === 'E_LIRË'
      ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
      : tavolina.statusi === 'E_ZËNË'
      ? 'bg-red-100 border-red-500 text-red-800'
      : 'bg-amber-100 border-amber-500 text-amber-800';

  const forma = tavolina.forma || 'katrore';
  const madhësia = tavolina.madhësia || 'mesatare';

  const madhësitë = {
    e_vogël: { w: 64, h: 64 },
    mesatare: { w: 88, h: 88 },
    e_madhe: { w: 120, h: 120 },
  };

  let gjerësia = madhësitë[madhësia].w;
  let lartësia = madhësitë[madhësia].h;

  if (forma === 'drejtkëndëshe') {
    gjerësia = Math.round(madhësitë[madhësia].w * 1.6);
    lartësia = madhësitë[madhësia].h;
  }

  if (tavolina.gjerësia) gjerësia = tavolina.gjerësia;
  if (tavolina.lartësia) lartësia = tavolina.lartësia;

  const formaKlasa =
    forma === 'rrethore'
      ? 'rounded-full'
      : forma === 'drejtkëndëshe'
      ? 'rounded-xl'
      : 'rounded-2xl';

  function handleClick() {
    if (!editable && onKliko) {
      onKliko(tavolina);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editable ? { ...listeners, ...attributes } : {})}
      onClick={handleClick}
      className="absolute select-none"
    >
      <Karriget
        numri={tavolina.karrige}
        forma={forma}
        gjerësia={gjerësia}
        lartësia={lartësia}
      />
      <div
        className={`border-2 flex flex-col items-center justify-center transition-shadow ${ngjyra} ${formaKlasa} ${
          isDragging ? 'shadow-2xl opacity-80' : 'shadow-md'
        }`}
        style={{ width: `${gjerësia}px`, height: `${lartësia}px` }}
      >
        <span className="font-bold text-xs text-center px-1 leading-tight">
          {tavolina.emri}
        </span>
        <span className="text-[10px] opacity-75 mt-0.5">
          {tavolina.karrige} vende
        </span>
        {tavolina.kamarierEmri && (
          <span className="text-[9px] mt-0.5 font-bold opacity-90">
            👤 {tavolina.kamarierEmri.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kanavacë e planimetrisë ───
export default function FloorPlan({
  tavolinat,
  editable = false,
  onTavolinaLëviz,
  onTavolinaKliko,
}: FloorPlanProps) {
  const { setNodeRef } = useDroppable({ id: 'floorplan' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!onTavolinaLëviz) return;
    const { active, delta } = event;
    const tavolina = tavolinat.find((t) => t.id === active.id);
    if (!tavolina) return;

    const xIRi = Math.max(0, tavolina.pozX + delta.x);
    const yIRi = Math.max(0, tavolina.pozY + delta.y);
    onTavolinaLëviz(tavolina.id, xIRi, yIRi);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        ref={setNodeRef}
        className="relative bg-white rounded-2xl border-2 border-dashed border-gray-300 overflow-auto"
        style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          minHeight: '700px',
          minWidth: '100%',
        }}
      >
        {tavolinat.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <p className="text-5xl mb-2">🪑</p>
              <p className="text-sm">Nuk ka tavolina në këtë zonë.</p>
              {editable && (
                <p className="text-xs mt-1">Kliko "Shto tavolinë" për të filluar.</p>
              )}
            </div>
          </div>
        )}

        {tavolinat.map((t) => (
          <TavolinaDraggable
            key={t.id}
            tavolina={t}
            editable={editable}
            onKliko={onTavolinaKliko}
          />
        ))}
      </div>
    </DndContext>
  );
}