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

interface DetailSection {
  title: string;
  items: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  details?: DetailSection[];
  sources?: SourceRef[];
  actions?: QuickAction[];
}

// --- Job-context helpers -------------------------------------------------

type JobKind = "pompa" | "klima" | "jenerator" | "sensor" | "konveyor" | "genel";

function jobKind(job: Job): JobKind {
  const s = `${job.equipment} ${job.title}`.toLowerCase();
  if (s.includes("pompa")) return "pompa";
  if (s.includes("klima")) return "klima";
  if (s.includes("jenerat")) return "jenerator";
  if (s.includes("sensör") || s.includes("sensor")) return "sensor";
  if (s.includes("konveyör") || s.includes("konveyor") || s.includes("switch")) return "konveyor";
  return "genel";
}

const PLACEHOLDERS_BY_KIND: Record<JobKind, string[]> = {
  pompa: [
    "Titreşim ölçümü yüksek, sırada neyi kontrol edeyim?",
    "Kaplin hizası normal çıktı, başka neye bakayım?",
    "Bu titreşim değeri normal mi?",
    "Yatak sıcaklığı 62°C, normal mi?",
  ],
  klima: [
    "Filtre temiz ama hâlâ soğutmuyor, sırada ne var?",
    "Gaz basıncı düşük çıktı, sıradaki adım ne?",
    "Bu üfleme sıcaklığı normal mi?",
  ],
  jenerator: [
    "Akü voltajı 11.8V, değişmeli mi?",
    "Yağ seviyesi düşük — devreye almadan önce ne yapmalıyım?",
    "Yakıt filtresini de değiştirmeli miyim?",
  ],
  sensor: [
    "Sensör sinyal vermiyor, önce neyi kontrol edeyim?",
    "Kablo bağlantısı doğru mu?",
    "Devreye alma için hangi test gerekli?",
  ],
  konveyor: [
    "Acil stop test etti ama pull-cord yanıt vermiyor.",
    "Switch kontağı ölçüldü, sıradaki adım ne?",
    "Test etiketine ne yazmalıyım?",
  ],
  genel: [
    "Önce neyi kontrol etmeliyim?",
    "Bu ölçüm normal mi?",
    "Kapatmak için yeterli kanıtım var mı?",
  ],
};

const SUGGESTED_BY_KIND: Record<JobKind, string[]> = {
  pompa: [
    "Kaplin mi rulman mı nasıl ayırt ederim?",
    "Titreşim değeri normal mi?",
    "Kapanış için hangi ölçüm gerekli?",
    "Rulman değişimi gerekir mi?",
  ],
  klima: [
    "Önce filtre mi gaz mı kontrol edeyim?",
    "Gaz basıncı ne olmalı?",
    "Kaçak izini nasıl anlarım?",
    "Kapanış için hangi ölçüm gerekli?",
  ],
  jenerator: [
    "Akü sağlıklı mı nasıl anlarım?",
    "Test çalıştırması ne kadar sürmeli?",
    "Yağ değişimi ne zaman gerekir?",
    "Kapanış için hangi kontroller yeter?",
  ],
  sensor: [
    "Sinyal seviyesi ne olmalı?",
    "Kablolamayı nasıl doğrularım?",
    "Devreye alma testi nasıl yapılır?",
    "Kapanış için hangi kanıt gerekli?",
  ],
  konveyor: [
    "Hangi switch'leri sırayla test etmeliyim?",
    "Ölçüm değerleri ne olmalı?",
    "Kayıt için hangi foto gerekli?",
    "Test etiketine ne yazayım?",
  ],
  genel: [
    "Önce neyi kontrol etmeliyim?",
    "Bu ölçüm normal mi?",
    "Anlamadım, daha basit anlat.",
    "Kapatmak için yeterli kanıtım var mı?",
  ],
};

function initialMessage(job: Job): ChatMessage {
  const kind = jobKind(job);
  const evCount = job.evidence.length;
  const evPart =
    evCount === 0
      ? "Henüz kanıt yok"
      : `Topladığın ${evCount} kanıt`;

  let text: string;
  const details: DetailSection[] = [];
  const sources: SourceRef[] = [];
  let actions: QuickAction[] = [];

  if (kind === "pompa") {
    text = `${evPart} ve ekipman geçmişine göre en olası neden **kaplin hizasızlığı** görünüyor. Önce yatak sıcaklığını, kaplin hizasını ve titreşim değerini kontrol etmeni öneririm.`;
    details.push(
      {
        title: "Olası nedenler",
        items: [
          "Kaplin hizasızlığı — %66",
          "Yatak / rulman aşınması — %28",
          "Kavitasyon — düşük ihtimal",
        ],
      },
      {
        title: "Önerilen kontroller",
        items: [
          "Yatak sıcaklığı (< 65°C)",
          "Kaplin hizası, lazer (≤ 0.05 mm)",
          "Titreşim (ISO 10816 Zone A/B)",
        ],
      },
      {
        title: "Benzer vakalar",
        items: [
          "12 gün önce: yüksek titreşim → lazer hizalama",
          "38 gün önce: ses/ısınma → rulman değişimi",
        ],
      },
    );
    sources.push(
      { label: "Önceki kapanış", detail: "İE-1809 · kaplin hizası" },
      { label: "İş emri", detail: "#1780 · rulman değişimi" },
      { label: "Kılavuz", detail: "Bakım kılavuzu s.42" },
    );
    actions = [
      { id: "check-done", label: "Bu kontrolü yaptım" },
      { id: "add-measurement", label: "Ölçüm ekle" },
      { id: "issue-confirmed", label: "Sorun bu çıktı" },
      { id: "issue-rejected", label: "Sorun bu değil" },
    ];
  } else if (kind === "klima") {
    text = `${evPart} ve ekipman geçmişine göre soğutmama en çok **düşük gaz basıncı** ya da **tıkalı filtre** kaynaklı oluyor. Önce filtreyi kontrol et, sonra gaz basıncını ölç.`;
    details.push(
      {
        title: "Olası nedenler",
        items: [
          "Gaz kaçağı / düşük şarj — %55",
          "Tıkalı filtre / evaporatör — %30",
          "Kontaktör / elektriksel — düşük",
        ],
      },
      {
        title: "Önerilen kontroller",
        items: [
          "Filtre görsel kontrol",
          "Gaz basıncı ölçümü (dış ünite)",
          "İç ünite üfleme sıcaklığı",
        ],
      },
    );
    sources.push(
      { label: "Kılavuz", detail: "Kullanım kılavuzu s.14" },
      { label: "Servis notu", detail: "Klima · genel arıza akışı" },
    );
    actions = [
      { id: "check-done", label: "Filtreyi kontrol ettim" },
      { id: "add-measurement", label: "Gaz basıncı ölçümü ekle" },
      { id: "issue-confirmed", label: "Sorun bu çıktı" },
      { id: "issue-rejected", label: "Sorun bu değil" },
    ];
  } else {
    text = `${evPart} ile başlıyoruz. Bu ekipmanda geçmiş kayıt sınırlı; önce görsel + işitsel kontrol, sonra bir referans ölçüm mantıklı.`;
    details.push({
      title: "Önerilen kontroller",
      items: ["Görsel kontrol", "Referans ölçüm al ve önceki değerle karşılaştır"],
    });
    sources.push({ label: "Prosedür", detail: "Genel teşhis akışı" });
    actions = [
      { id: "check-done", label: "Görsel kontrolü yaptım" },
      { id: "add-measurement", label: "Ölçüm ekle" },
      { id: "issue-confirmed", label: "Sorun bu çıktı" },
    ];
  }

  return {
    id: `ai-init-${job.id}`,
    role: "ai",
    text,
    details,
    sources,
    actions,
  };
}

function aiReply(job: Job, question: string): ChatMessage {
  const q = question.toLowerCase();
  const kind = jobKind(job);
  const id = `ai-${Date.now()}`;

  if (q.includes("basit") || q.includes("anlamad")) {
    return {
      id,
      role: "ai",
      text:
        kind === "pompa"
          ? "Kısaca: önce yatak sıcak mı ona bak. Sıcaksa rulman zorlanıyor demektir. Değilse kaplin hizası bozulmuş olabilir; lazerle ölçmek gerekir."
          : "Kısaca: önce basit görsel kontrol yap, sonra bir ölçüm al ve önceki değerle karşılaştır. Sapma büyükse müdahale gerekir.",
      sources: [{ label: "Kılavuz", detail: "s.42 · basit teşhis akışı" }],
      actions: [
        { id: "add-measurement", label: "Ölçüm ekle" },
        { id: "check-done", label: "Kontrolü yaptım" },
      ],
    };
  }

  if (kind === "pompa" && (q.includes("kaplin") || q.includes("rulman"))) {
    return {
      id,
      role: "ai",
      text: "Ayırt etmenin en hızlı yolu yatak sıcaklığı. Rulman aşınmışsa yatak 65°C üzerine çıkar. Sıcaklık normalse büyük ihtimalle kaplin hizasızlığıdır — lazerle 0.05 mm üstü sapma anlamlıdır.",
      sources: [
        { label: "Önceki kapanış", detail: "#1780 · rulman değişimi" },
        { label: "Standart", detail: "ISO 10816 titreşim" },
      ],
      actions: [
        { id: "add-measurement", label: "Sıcaklık ölçümü ekle" },
        { id: "add-measurement", label: "Titreşim ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
      ],
    };
  }

  if (kind === "pompa" && q.includes("titreş")) {
    return {
      id,
      role: "ai",
      text: "ISO 10816 Zone A/B içindeyse normal, C'ye giriyorsa müdahale. Ölçtüğün değeri paylaş, birlikte yorumlayalım.",
      sources: [{ label: "Standart", detail: "ISO 10816 sınır tablosu" }],
      actions: [
        { id: "add-measurement", label: "Titreşim ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
      ],
    };
  }

  if (kind === "klima" && (q.includes("gaz") || q.includes("basınç") || q.includes("basinc") || q.includes("filtre"))) {
    return {
      id,
      role: "ai",
      text: "Filtre temizse sıradaki adım gaz basıncı ve kaçak ihtimali. Basıncı ölçüm olarak ekle, sonra dış ünitede kaçak izi / yağlanma var mı bak.",
      sources: [
        { label: "Kılavuz", detail: "s.42 · gaz basıncı referansı" },
        { label: "Benzer vaka", detail: "Klima Oda 218 · düşük gaz" },
      ],
      actions: [
        { id: "add-measurement", label: "Gaz basıncı ölçümü ekle" },
        { id: "issue-confirmed", label: "Kaçak izi var" },
        { id: "check-done", label: "Kaçak izi yok" },
      ],
    };
  }

  if (q.includes("yeterli") || q.includes("kapat") || q.includes("kapanış") || q.includes("kapanis")) {
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
      text:
        kind === "pompa"
          ? "Tamam, kaplin hipotezini eliyoruz. Sıradaki olası neden rulman/yatak. Sıcaklık ve titreşim spektrumu bir arada anlamlı — ikisini de ölçelim."
          : "Anladım, ilk hipotezi eliyoruz. Sıradaki olası kök nedene bakalım — bir sonraki ölçümü alıp paylaş.",
      actions: [
        { id: "add-measurement", label: "Ölçüm ekle" },
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
  const placeholder = useMemo(() => {
    if (!job) return "ToolA'ya sor…";
    const list = PLACEHOLDERS_BY_KIND[jobKind(job)];
    return list[Math.floor(Math.random() * list.length)];
  }, [job]);
  const suggestedQuestions = useMemo(
    () => (job ? SUGGESTED_BY_KIND[jobKind(job)] : []),
    [job],
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
                {suggestedQuestions.map((q) => (
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
      {msg.details && msg.details.length > 0 ? (
        <div className="ml-1 space-y-1.5">
          {msg.details.map((d, i) => (
            <details
              key={i}
              open={i === 0}
              className="rounded-lg border border-border bg-background/40 px-2.5 py-1.5 text-xs"
            >
              <summary className="cursor-pointer select-none font-medium text-foreground/90">
                {d.title}
              </summary>
              <ul className="mt-1.5 space-y-1 pl-1 text-muted-foreground">
                {d.items.map((it, j) => (
                  <li key={j}>• {it}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      ) : null}
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
