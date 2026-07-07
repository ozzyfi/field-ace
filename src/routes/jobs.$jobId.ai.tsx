import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
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
  "ToolA'ya sor: bu ölçüm normal mi?",
  "Önce neyi kontrol etmeliyim?",
  "Bu hata kodu ne anlama geliyor?",
  "Filtre temiz ama hâlâ soğutmuyor, sırada ne var?",
  "Bu ses rulman mı kaplin mi olabilir?",
  "Kapatmak için yeterli kanıtım var mı?",
];

const SUGGESTED_QUESTIONS = [
  "Önce neyi kontrol etmeliyim?",
  "Bu ölçüm normal mi?",
  "Anlamadım, daha basit anlat.",
  "Kapatmak için yeterli kanıtım var mı?",
];

function initialMessage(job: Job): ChatMessage {
  const evCount = job.evidence.length;
  const evSummary =
    evCount === 0
      ? "Henüz kanıt yok — konuşurken birlikte toplayabiliriz."
      : `${evCount} kanıt topladın (${job.evidence
          .slice(0, 3)
          .map((e) => e.label)
          .join(", ")}${evCount > 3 ? ", …" : ""}).`;

  const lastMaint = job.history.find((h) => h.kind === "bakim");
  const similar = job.history.filter((h) => h.kind === "ariza" || h.kind === "parca");

  let body: string;
  let causes: string[];
  let checks: string[];
  const sources: SourceRef[] = [];

  if (job.id === "job-1842") {
    body = `**${job.equipment}** için topladığın verilere ve ekipman geçmişine baktım. Bu ekipmanda son 90 günde 3 benzer kayıt var; vakaların 2'si **kaplin hizasızlığı**, 1'i **rulman değişimi** ile kapanmış. Debinin normal olması kavitasyon ihtimalini düşürüyor.`;
    causes = [
      "Kaplin hizasızlığı — en olası (%66)",
      "Yatak / rulman aşınması — %28",
      "Kavitasyon — düşük ihtimal",
    ];
    checks = [
      "Yatak sıcaklığını ölç (referans < 65°C)",
      "Kaplin hizasını lazerle kontrol et (≤ 0.05 mm)",
      "Titreşim ölçümü al (ISO 10816 · Zone A/B)",
    ];
    sources.push(
      { label: "Önceki kapanış", detail: "İE-1809 · kaplin hizası" },
      { label: "İş emri", detail: "#1780 · rulman değişimi" },
      { label: "Kılavuz", detail: "Bakım kılavuzu s.42" },
    );
  } else if (job.id === "job-1843") {
    body = `**${job.equipment}** için topladığın kanıtlara baktım. Fan çalışıyor ama set-ölçüm farkı 5°C. ${
      lastMaint ? `Son bakım ${lastMaint.date} (${lastMaint.action}). ` : ""
    }Benzer vakalarda ilk sırada **düşük gaz basıncı** ve **tıkalı filtre** geliyor.`;
    causes = [
      "Gaz kaçağı / düşük şarj — %55",
      "Tıkalı filtre veya evaporatör — %30",
      "Kontaktör / elektriksel — düşük",
    ];
    checks = [
      "Filtreyi çıkar ve görsel kontrol et",
      "Dış ünitede gaz basıncını ölç",
      "İç ünite üfleme sıcaklığını ölç",
    ];
    sources.push(
      { label: "Kılavuz", detail: "Kullanım kılavuzu s.14" },
      { label: "Servis notu", detail: "Klima · genel arıza akışı" },
    );
  } else {
    body = `**${job.equipment}** için topladığın kanıtları değerlendirdim. Geçmiş kayıt sınırlı; önce görsel + işitsel kontrol, sonra referans ölçüm mantıklı görünüyor.`;
    causes = ["Belirtiye özel — kanıt geldikçe daraltacağım"];
    checks = ["Görsel kontrol yap", "Referans ölçüm al ve önceki değerle karşılaştır"];
    sources.push({ label: "Prosedür", detail: "Genel teşhis akışı" });
  }

  const text = [
    `📋 **Kanıt değerlendirmesi**\n${evSummary}`,
    `🧩 **Olası kök nedenler**\n${causes.map((c) => `• ${c}`).join("\n")}`,
    `🔧 **Önerilen ilk kontroller**\n${checks.map((c) => `• ${c}`).join("\n")}`,
    similar.length > 0
      ? `📚 **Benzer vakalar**\n${similar
          .slice(0, 2)
          .map((h) => `• ${h.date}: ${h.summary} → ${h.action}`)
          .join("\n")}`
      : "",
    body,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: `ai-init-${job.id}`,
    role: "ai",
    text,
    sources,
    actions: [
      { id: "check-done", label: "Bu kontrolü yaptım" },
      { id: "add-measurement", label: "Ölçüm ekle" },
      { id: "issue-confirmed", label: "Sorun bu çıktı" },
      { id: "issue-rejected", label: "Sorun bu değil" },
      { id: "ask", label: "Daha basit anlat", payload: "Anlamadım, daha basit anlat." },
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
      text: "Kısaca: önce klimanın gazı yeterli mi ona bak. Gaz düşükse klima soğutmaz ve genelde kaçak vardır. Basınç değerini ölç, dış ünitede yağlı/ıslak iz var mı kontrol et.",
      sources: [{ label: "Kılavuz", detail: "s.42 · basit teşhis akışı" }],
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
      text: "Filtre temizse sıradaki adım gaz basıncı ve kaçak ihtimali. Önce basıncı ölçüm olarak ekle, sonra dış ünitede kaçak izi veya bağlantılarda yağlanma var mı bak.",
      sources: [
        { label: "Kılavuz", detail: "s.42 · gaz basıncı referansı" },
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
      text: "Metalik ses + titreşim genellikle kaplin hizasızlığına işaret eder. Rulman olsaydı yatak sıcaklığı 65°C üzerine çıkardı. Önce sıcaklığı ölç, normalse kaplin hizasına lazerle bak.",
      sources: [
        { label: "Önceki kapanış", detail: "İş emri #1780 · kaplin hizası" },
        { label: "Standart", detail: "ISO 10816 titreşim" },
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
      sources: [{ label: "Kılavuz", detail: "alarm tablosu" }],
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
        text: "Evet — fotoğraf ve ölçüm kanıtın var. Kök nedeni ve yaptığın işlemi kısaca girersen kapanışı hemen oluşturabiliriz.",
        actions: [
          { id: "go-close", label: "Kapanışa geç" },
          { id: "add-evidence", label: "Yine de ek kanıt ekle" },
        ],
      };
    }
    return {
      id,
      role: "ai",
      text: "Kapanış için en az bir fotoğraf ve bir ölçüm önerilir. Eksik olan kanıt tipini ekle, sonra kapanışa geçelim.",
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
      text: "Güzel. Sıradaki adım: referans bir ölçüm al (sıcaklık ya da basınç) ve önceki değerle karşılaştır. Sapma %10 üstündeyse müdahale, altındaysa normal sayılır.",
      sources: [{ label: "Kılavuz", detail: "test prosedürü · sapma eşiği" }],
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
      text: "Tamam, kök nedeni doğruladık. Yaptığın müdahaleyi kısaca yaz, ToolA yapılandırılmış kapanış özetine çevirsin.",
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
      text: "Anladım, ilk hipotezi eliyoruz. Sıradaki olası kök neden: elektriksel/kontaktör tarafı. Dış ünitede kontaktörün çekip çekmediğine ve besleme voltajına bak.",
      sources: [
        { label: "Kılavuz", detail: "s.58 · elektriksel kontrol" },
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

// Very small inline markdown for **bold** within chat text.
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function AiScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
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

  const lastHistory = job.history[0];
  const historyNote = lastHistory
    ? `${lastHistory.date}: ${lastHistory.summary} → ${lastHistory.action}`
    : "Geçmiş kayıt yok";

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
      <div className="space-y-3">
        {/* Compact context card — doesn't dominate the screen */}
        <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-xs">
          <div className="text-sm font-semibold text-foreground leading-snug">{job.title}</div>
          <div className="mt-0.5 text-muted-foreground">
            {job.equipment} · {job.location}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip border border-border bg-background text-[11px] text-foreground/80">
              {job.evidence.length} kanıt
            </span>
            <span className="chip border border-border bg-background text-[11px] text-foreground/80">
              📜 {historyNote}
            </span>
          </div>
        </div>

        {/* Chat body */}
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
      <div className="rounded-2xl rounded-tl-sm bg-secondary/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {renderInline(msg.text)}
      </div>
      {msg.sources && msg.sources.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {msg.sources.map((s, i) => (
            <span
              key={i}
              className="chip border border-border bg-background/60 text-[10.5px] text-muted-foreground"
              title={s.detail}
            >
              ↳ <span className="font-medium text-foreground/80">{s.label}:</span>&nbsp;{s.detail}
            </span>
          ))}
        </div>
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
