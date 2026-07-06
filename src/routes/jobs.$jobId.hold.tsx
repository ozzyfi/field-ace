import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { holdReasonLabel, type HoldReason } from "@/lib/mock-data";
import { holdJob, useJob } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/hold")({
  head: () => ({
    meta: [{ title: "Bekleme · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: HoldScreen,
});

const REASONS: HoldReason[] = [
  "parca_bekliyor",
  "uzman_destegi",
  "onay_bekliyor",
  "guvenlik_erisim",
  "makine_durdurulamiyor",
  "olcum_ekipmani",
  "tekrar_uretilemiyor",
  "diger",
];

function HoldScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();

  const [reason, setReason] = useState<HoldReason | null>(null);
  const [checked, setChecked] = useState("");
  const [whyNot, setWhyNot] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [owner, setOwner] = useState("");
  const [partName, setPartName] = useState("");
  const [partCode, setPartCode] = useState("");
  const [partUrgency, setPartUrgency] = useState<"normal" | "acil" | "kritik">("normal");
  const [partStock, setPartStock] = useState<"stokta_yok" | "siparis" | "onay">("stokta_yok");

  if (!job) return null;

  const hasEvidenceOrNote = job.evidence.length > 0 || checked.trim().length > 0;
  const canSubmit =
    !!reason && whyNot.trim() && nextAction.trim() && owner.trim() && hasEvidenceOrNote;

  return (
    <AppShell
      title="Destek / parça bekliyor"
      subtitle={job.code}
      back
      footer={
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (!reason) return;
            holdJob(job.id, {
              reason,
              checked: checked.trim(),
              whyNotClosing: whyNot.trim(),
              nextAction: nextAction.trim(),
              owner: owner.trim(),
              heldAt: new Date().toISOString(),
            });
            navigate({ to: "/jobs/$jobId/summary", params: { jobId: job.id } });
          }}
          className="btn-primary"
        >
          Beklemeye al
        </button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Sahada ne gördüğünü ve neden kapatamadığını kaydet. En az bir kanıt veya kısa açıklama gerekli.
      </p>

      <div className="mt-4 space-y-4">
        <section>
          <Label>Bekleme nedeni</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REASONS.map((r) => {
              const active = reason === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`card-surface px-3 py-2 text-left text-sm active:scale-[0.99] ${
                    active ? "border-accent bg-accent/15 text-accent-foreground" : ""
                  }`}
                >
                  {holdReasonLabel[r]}
                </button>
              );
            })}
          </div>
        </section>

        <TextField
          label="Şu ana kadar ne kontrol edildi?"
          value={checked}
          onChange={setChecked}
          placeholder="Örn: Kaplin görsel kontrol edildi, hizalama gerekiyor."
          multiline
        />

        <TextField
          label="İş neden kapanmıyor?"
          value={whyNot}
          onChange={setWhyNot}
          placeholder="Örn: Yedek rulman stokta yok."
          multiline
        />

        <TextField
          label="Sonraki aksiyon"
          value={nextAction}
          onChange={setNextAction}
          placeholder="Örn: Depodan rulman talep et, geldiğinde montaj."
          multiline
        />

        <TextField
          label="Sorumlu kişi / ekip"
          value={owner}
          onChange={setOwner}
          placeholder="Örn: Depo · A. Kaya"
        />

        {job.evidence.length === 0 && !checked.trim() ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
            En az bir saha kanıtı ya da açıklama gerekli.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      )}
    </div>
  );
}
