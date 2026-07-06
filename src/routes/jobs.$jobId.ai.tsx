import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PauseCircle,
  Plus,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { setStatus, useJob } from "@/lib/store";
import type { Job } from "@/lib/mock-data";

export const Route = createFileRoute("/jobs/$jobId/ai")({
  head: () => ({
    meta: [{ title: "AI ile Teşhis Et · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: AiScreen,
});

type QuickActionId =
  | "check-done"
  | "issue-confirmed"
  | "issue-rejected"
  | "add-evidence"
  | "add-measurement"
  | "go-close"
  | "go-hold"
  | "ask";

interface QuickAction {
  id: QuickActionId;
  label: string;
  payload?: string;
}

interface SourceRef {
  label: string;
  detail: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: SourceRef[];
  actions?: QuickAction[];
}

const PLACEHOLDERS = [
  "Bu ölçüm normal mi?",
  "Önce neyi kontrol etmeliyim?",
  "Bu hata kodu ne anlama geliyor?",
  "Filtre temiz ama hâlâ soğutmuyor, sırada neye bakayım?",
  "Bu ses rulman mı kaplin mi olabilir?",
  "Anlamadım, daha basit açıkla.",
  "Bu işi kapatmak için yeterli kanıtım var mı?",
];

const SUGGESTED_QUESTIONS = [
  "Önce neyi kontrol etmeliyim?",
  "Bu ölçüm normal mi?",
  "Anlamadım, daha basit açıkla.",
  "Kapatmak için yeterli kanıtım var mı?",
];

function initialMessage(job: Job): ChatMessage {
  const lastMaint = job.history.find((h) => h.kind === "bakim");
  const similar = job.history.find((h) => h.kind === "ariza");

  const sources: SourceRef[] = [];
  if (lastMaint) {
    sources.push({
      label: "Ekipman geçmişi",
      detail: `Son bakım · ${lastMaint.date} — ${lastMaint.summary}`,
    });
  }
  if (similar) {
    sources.push({
      label: "Benzer vaka",
      detail: `${similar.summary} → ${similar.action}`,
    });
  }
  sources.push({ label: "Teknik kaynak", detail: "Bakım kılavuzu s.42" });

  let text: string;
  if (job.id === "job-1843") {
    text = `Topladığın kanıtlara göre bu iş ${job.equipment} için ${job.title.toLowerCase()} gibi görünüyor. Ekipman geçmişinde son bakım 1 yıl önce yapılmış ve filtre + gaz kontrolü kaydı var. Benzer vakalarda filtre tıkanıklığı, düşük gaz basıncı ve dış ünite kontaktör arızası öne çıkmış. İlk olarak filtre durumunu, gaz basıncını ve dış ünite çalışma değerlerini kontrol etmeni öneririm.`;
  } else if (job.id === "job-1842") {
    text = `Kanıtlara ve ${job.equipment} geçmişine bakınca bu ${job.title.toLowerCase()} son 90 günde 3. kez tekrar ediyor. Vakaların 2'si kaplin hizasızlığı, 1'i rulman değişimi ile kapanmış. İlk olarak yatak sıcaklığını ölç, sonra kaplin hizasına lazerle bak.`;
  } else {
    text = `${job.equipment} için topladığın kanıtları değerlendirdim. Ekipman geçmişi ve benzer vakalara bakınca önce görsel + işitsel kontrol, sonra referans ölçüm önerilir. Sapma %10'un üstündeyse müdahale gerekir.`;
  }

  return {
    id: `ai-init-${job.id}`,
    role: "ai",
    text,
    sources,
    actions: [
      { id: "check-done", label: "Bu kontrolü yaptım" },
      { id: "add-measurement", label: "Ölçüm ekle" },
      { id: "ask", label: "Anlamadım, daha basit anlat", payload: "Anlamadım, daha basit anlat." },
    ],
  };
}

function aiReply(job: Job, question: string): ChatMessage {
  const q = question.toLowerCase();
  const id = `ai-${Date.now()}`;

  if (q.includes("basit") || q.includes("anlamad")) {
    return {
      id,
      role: "ai",
      text: "Önce klimanın gazı yeterli mi ona bak. Gaz düşükse klima soğutmaz. Gaz düşükse kaçak olabilir. Basınç değerini ölç ve dış ünitede yağlı/ıslak iz var mı kontrol et.",
      sources: [{ label: "Bakım kılavuzu", detail: "s.42 · basit teşhis akışı" }],
      actions: [
        { id: "add-measurement", label: "Gaz basıncı ölçümü ekle" },
        { id: "check-done", label: "Kaçak izi yok" },
        { id: "issue-confirmed", label: "Kaçak izi var" },
      ],
    };
  }

  if (q.includes("filtre") || q.includes("gaz") || q.includes("basınç") || q.includes("basinc")) {
    return {
      id,
      role: "ai",
      text: "Filtre temizse sıradaki kontrol gaz basıncı ve kaçak ihtimali olmalı. Düşük gaz basıncı soğutma performansını düşürür. Önce basınç değerini ölçüm olarak ekle, sonra dış ünitede kaçak izi veya bağlantı noktalarında yağlanma olup olmadığını kontrol et.",
      sources: [
        { label: "Bakım kılavuzu", detail: "s.42 · gaz basıncı referans aralığı" },
        { label: "Benzer vaka", detail: "Klima Oda 218 · düşük gaz basıncı" },
      ],
      actions: [
        { id: "add-measurement", label: "Gaz basıncı ölçümü ekle" },
        { id: "issue-confirmed", label: "Kaçak izi var" },
        { id: "check-done", label: "Kaçak izi yok" },
        { id: "go-close", label: "Kapanışa geç" },
        { id: "go-hold", label: "Destek/parça bekliyorum" },
      ],
    };
  }

  if (q.includes("ses") || q.includes("titre") || q.includes("rulman") || q.includes("kaplin")) {
    return {
      id,
      role: "ai",
      text: "Metalik ses + titreşim kombinasyonu bu ekipmanda genellikle kaplin hizasızlığına işaret eder. Rulman sorunu olsaydı yatak sıcaklığı 65°C üzerine çıkardı. Önce yatak sıcaklığını ölç: normalse kaplin hizasına lazerle bak.",
      sources: [
        { label: "Önceki kapanış", detail: "İş emri #1780 · kaplin hizası" },
        { label: "Standart", detail: "ISO 10816 titreşim referansı" },
      ],
      actions: [
        { id: "add-measurement", label: "Sıcaklık ölçümü ekle" },
        { id: "add-measurement", label: "Titreşim ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
        { id: "issue-rejected", label: "Sorun bu değil" },
      ],
    };
  }

  if (q.includes("hata kodu") || q.includes("kod")) {
    return {
      id,
      role: "ai",
      text: "Hata kodunu paylaşırsan üretici kılavuzundaki karşılığını çıkarabilirim. Kısa yol: panelden 'Alarm geçmişi' > son kayıt. Fotoğrafını kanıt olarak ekle, birlikte yorumlayalım.",
      sources: [{ label: "Kullanım kılavuzu", detail: "alarm tablosu" }],
      actions: [
        { id: "add-evidence", label: "Hata kodu fotoğrafı ekle" },
        { id: "go-hold", label: "Destek/parça bekliyorum" },
      ],
    };
  }

  if (q.includes("yeterli") || q.includes("kapat")) {
    const hasPhoto = job.evidence.some((e) => e.type === "foto" || e.type === "parca_foto");
    const hasMeasure = job.evidence.some((e) => e.type === "olcum");
    if (hasPhoto && hasMeasure) {
      return {
        id,
        role: "ai",
        text: "Evet, elinde fotoğraf ve ölçüm kanıtı var. Kök nedeni ve yaptığın işlemi kısaca girersen kapanışı hemen oluşturabiliriz.",
        actions: [
          { id: "go-close", label: "Kapanışa geç" },
          { id: "add-evidence", label: "Yine de ek kanıt ekle" },
        ],
      };
    }
    return {
      id,
      role: "ai",
      text: "Kapanış için en az bir fotoğraf ve bir ölçüm önerilir. Şu an eksik olan kanıt tipini ekle, sonra kapanışa geçelim.",
      actions: [
        { id: "add-evidence", label: "Fotoğraf ekle" },
        { id: "add-measurement", label: "Ölçüm ekle" },
      ],
    };
  }

  if (q.includes("kontrolü yaptım") || q.includes("kontrolu yaptim")) {
    return {
      id,
      role: "ai",
      text: "Güzel. Sıradaki kontrol: referans bir ölçüm al (sıcaklık ya da basınç) ve önceki değerlerle karşılaştır. Sapma %10 üstündeyse müdahale, altındaysa normal çalışma sayılır.",
      sources: [{ label: "Bakım kılavuzu", detail: "test prosedürü · sapma eşiği" }],
      actions: [
        { id: "add-measurement", label: "Ölçüm ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
        { id: "issue-rejected", label: "Sorun bu değil" },
      ],
    };
  }

  if (q.includes("sorun bu çıktı") || q.includes("sorun bu cikti")) {
    return {
      id,
      role: "ai",
      text: "Tamam, kök nedeni doğruladık. Yaptığın müdahaleyi kısaca yaz, ToolA yapılandırılmış bir kapanış özetine çevirsin.",
      actions: [
        { id: "go-close", label: "Kapanışa geç" },
        { id: "add-evidence", label: "Kapanış öncesi fotoğraf ekle" },
      ],
    };
  }

  if (q.includes("sorun bu değil") || q.includes("sorun bu degil")) {
    return {
      id,
      role: "ai",
      text: "Anladım, ilk hipotezi eliyoruz. Sıradaki olası kök neden: elektriksel/kontaktör tarafı. Dış ünitede kontaktörün çekip çekmediğine ve besleme voltajına bak. Değerleri ölçüm olarak eklersen daha kesin ilerleyebiliriz.",
      sources: [
        { label: "Bakım kılavuzu", detail: "s.58 · elektriksel kontrol" },
        { label: "Benzer vaka", detail: "Oda 112 · kontaktör arızası" },
      ],
      actions: [
        { id: "add-measurement", label: "Voltaj ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
        { id: "go-hold", label: "Parça bekliyorum" },
      ],
    };
  }

  return {
    id,
    role: "ai",
    text: "Belirtiyi biraz daha netleştirir misin — ne zaman başladı, sürekli mi yoksa aralıklı mı? Bu arada mevcut kanıtlarına bakıp en olası yönü daraltayım.",
    sources: [{ label: "Bağlam", detail: "toplanan kanıtlar + ekipman geçmişi" }],
    actions: [
      { id: "add-evidence", label: "Ek kanıt ekle" },
      { id: "check-done", label: "Görsel kontrolü yaptım" },
      { id: "go-close", label: "Kapanışa geç" },
    ],
  };
}

function AiScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    [],
  );
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (job && job.status !== "teshis" && job.status !== "beklemede" && job.status !== "tamamlandi") {
      setStatus(job.id, "teshis");
    }
  }, [job]);

  useEffect(() => {
    if (job && messages.length === 0) {
      setMessages([initialMessage(job)]);
    }
  }, [job, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!job) return null;

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: clean };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, aiReply(job, clean)]);
      setThinking(false);
      inputRef.current?.focus();
    }, 650);
  };

  const handleAction = (a: QuickAction) => {
    if (a.id === "go-close") {
      navigate({ to: "/jobs/$jobId/close", params: { jobId: job.id } });
      return;
    }
    if (a.id === "go-hold") {
      navigate({ to: "/jobs/$jobId/hold", params: { jobId: job.id } });
      return;
    }
    if (a.id === "add-evidence" || a.id === "add-measurement") {
      navigate({ to: "/jobs/$jobId/evidence", params: { jobId: job.id } });
      return;
    }
    sendMessage(a.payload ?? a.label);
  };

  return (
    <AppShell
      title="AI ile Teşhis Et"
      subtitle={job.code}
      back
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder={placeholder}
            className="min-h-[42px] max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="btn-primary h-[42px] w-[42px] shrink-0 p-0 disabled:opacity-40"
            aria-label="Gönder"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ToolA, topladığın kanıtları, ekipman geçmişini, benzer vakaları ve teknik kaynakları kullanarak sana adım adım yardımcı olur.
        </p>

        <ContextCard job={job} open={contextOpen} onToggle={() => setContextOpen((v) => !v)} />

        <div className="space-y-4 pb-2">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                  {m.text}
                </div>
              </div>
            ) : (
              <AiBubble key={m.id} msg={m} onAction={handleAction} />
            ),
          )}

          {thinking ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 animate-pulse text-info" />
              ToolA düşünüyor…
            </div>
          ) : null}

          {messages.length <= 1 && !thinking ? (
            <div className="pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hızlı soru
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="chip border border-border bg-background text-xs text-foreground hover:bg-secondary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>
      </div>
    </AppShell>
  );
}

function AiBubble({ msg, onAction }: { msg: ChatMessage; onAction: (a: QuickAction) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-info">
        <Sparkles className="h-3 w-3" />
        ToolA
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-secondary/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
        {msg.text}
      </div>
      {msg.sources && msg.sources.length > 0 ? (
        <ul className="space-y-0.5 pl-1">
          {msg.sources.map((s, i) => (
            <li key={i} className="text-[11px] text-muted-foreground">
              ↳ <span className="font-medium text-foreground/80">{s.label}:</span> {s.detail}
            </li>
          ))}
        </ul>
      ) : null}
      {msg.actions && msg.actions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {msg.actions.map((a, i) => (
            <button
              key={`${a.id}-${i}`}
              type="button"
              onClick={() => onAction(a)}
              className="chip border border-border bg-background text-xs text-foreground hover:bg-secondary"
            >
              {a.id === "add-evidence" || a.id === "add-measurement" ? (
                <Plus className="h-3 w-3" />
              ) : a.id === "issue-confirmed" ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : a.id === "issue-rejected" ? (
                <XCircle className="h-3 w-3 text-danger" />
              ) : a.id === "go-hold" ? (
                <PauseCircle className="h-3 w-3 text-warning" />
              ) : null}
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContextCard({
  job,
  open,
  onToggle,
}: {
  job: Job;
  open: boolean;
  onToggle: () => void;
}) {
  const evCount = job.evidence.length;
  const histCount = job.history.length;
  return (
    <div className="card-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bağlam · {evCount} kanıt · {histCount} geçmiş kayıt
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
          <div>
            <div className="font-semibold text-foreground/80">Toplanan kanıtlar</div>
            {evCount === 0 ? (
              <p className="mt-0.5 text-muted-foreground">Kanıt yok.</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {job.evidence.map((ev) => (
                  <li key={ev.id} className="text-muted-foreground">
                    • <span className="text-foreground/90">{ev.label}</span>
                    {ev.value ? `: ${ev.value}` : ev.note ? ` — ${ev.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="font-semibold text-foreground/80">Ekipman geçmişi</div>
            {histCount === 0 ? (
              <p className="mt-0.5 text-muted-foreground">Kayıt yok.</p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {job.history.slice(0, 4).map((h) => (
                  <li key={h.id} className="text-muted-foreground">
                    • <span className="text-foreground/90">{h.rootCause}</span> — {h.summary}{" "}
                    <span className="text-muted-foreground/70">({h.date})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
