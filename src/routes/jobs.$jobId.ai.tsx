import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  PauseCircle,
  Plus,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getAiBrief } from "@/lib/ai-mock";
import { setStatus, useJob } from "@/lib/store";
import type { Job } from "@/lib/mock-data";

export const Route = createFileRoute("/jobs/$jobId/ai")({
  head: () => ({
    meta: [{ title: "AI Teşhis · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: AiScreen,
});

type QuickActionId =
  | "check-done"
  | "issue-confirmed"
  | "issue-rejected"
  | "add-evidence"
  | "go-close"
  | "go-hold";

interface QuickAction {
  id: QuickActionId;
  label: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  source?: string;
  actions?: QuickAction[];
}

const PLACEHOLDERS = [
  "Bu hata kodu ne anlama geliyor?",
  "Önce neyi kontrol etmeliyim?",
  "Bu ölçüm normal mi?",
  "Bu ses rulman mı kaplin mi olabilir?",
  "Bunu nasıl test ederim?",
  "Anlamadım, daha basit açıkla.",
];

const SUGGESTED_QUESTIONS = [
  "Önce neyi kontrol etmeliyim?",
  "Bu ölçüm normal mi?",
  "Bunu nasıl test ederim?",
];

function mockAiReply(job: Job, question: string): ChatMessage {
  const q = question.toLowerCase();
  const id = `ai-${Date.now()}`;

  if (q.includes("filtre") || q.includes("gaz") || q.includes("basınç") || q.includes("basinc")) {
    return {
      id,
      role: "ai",
      text: "Önce filtre durumunu kontrol et. Bu ekipmanda son bakım 1 yıl önce yapılmış ve benzer vakalarda filtre tıkanıklığı soğutma düşüşüne neden olmuş. Filtre temizlendikten sonra gaz basıncını tekrar ölç.",
      source: "Önceki kapanış notu · Bakım kılavuzu s.42",
      actions: [
        { id: "check-done", label: "Filtreyi kontrol ettim" },
        { id: "add-evidence", label: "Gaz basıncı ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
        { id: "go-close", label: "Kapanışa geç" },
      ],
    };
  }

  if (q.includes("ses") || q.includes("titre") || q.includes("rulman") || q.includes("kaplin")) {
    return {
      id,
      role: "ai",
      text: "Metalik ses + titreşim kombinasyonu bu ekipmanda genellikle kaplin hizasızlığına işaret eder. Rulman sorunu olsaydı yatak sıcaklığı 65°C üzerine çıkardı. Önce yatak sıcaklığını ölç: normalse kaplin hizasına bak.",
      source: "İş emri #1780 · ISO 10816 · Bakım kılavuzu s.42",
      actions: [
        { id: "check-done", label: "Sıcaklık ölçümünü yaptım" },
        { id: "add-evidence", label: "Titreşim ölçümü ekle" },
        { id: "issue-confirmed", label: "Sorun bu çıktı" },
        { id: "issue-rejected", label: "Sorun bu değil" },
      ],
    };
  }

  if (q.includes("hata kodu") || q.includes("kod")) {
    return {
      id,
      role: "ai",
      text: "Hata kodunu paylaşırsan üretici kılavuzundaki karşılığını çıkarabilirim. Kısa yol: panelden 'Alarm geçmişi' > son kayıt. Fotoğrafını kanıt olarak ekleyebilirsin, sonra birlikte yorumlarız.",
      source: "Kullanım kılavuzu · alarm tablosu",
      actions: [
        { id: "add-evidence", label: "Hata kodu ekle" },
        { id: "go-hold", label: "Uzman desteği iste" },
      ],
    };
  }

  if (q.includes("basit") || q.includes("anlamadım") || q.includes("anlamadim")) {
    return {
      id,
      role: "ai",
      text: "Tek cümlede: önce en ucuz ve en hızlı kontrolü yap (görsel + sıcaklık), sonra ölçüm cihazına geç. Amaç: sorunu 2-3 adımda daraltmak.",
      actions: [
        { id: "check-done", label: "Görsel kontrolü yaptım" },
        { id: "add-evidence", label: "Ölçüm ekle" },
      ],
    };
  }

  if (q.includes("test") || q.includes("nasıl") || q.includes("nasil")) {
    return {
      id,
      role: "ai",
      text: `${job.equipment} için standart test: 1) Görsel kontrol, 2) Referans ölçüm (sıcaklık/titreşim), 3) Kısa çalışma testi, 4) Sonuçları önceki değerlerle karşılaştır. Sapma %10'un üstündeyse müdahale gerek.`,
      source: "Bakım kılavuzu · test prosedürü",
      actions: [
        { id: "add-evidence", label: "Ölçüm ekle" },
        { id: "check-done", label: "Testi tamamladım" },
      ],
    };
  }

  if (q.includes("normal")) {
    return {
      id,
      role: "ai",
      text: "Ölçtüğün değeri yazarsan referans aralıkla karşılaştırırım. Bu ekipmanın son 3 ölçüm ortalaması geçmiş kayıtlarda mevcut.",
      source: "Ekipman geçmişi · son ölçümler",
      actions: [
        { id: "add-evidence", label: "Ölçümü kaydet" },
      ],
    };
  }

  return {
    id,
    role: "ai",
    text: "Bu ekipmanın geçmişine ve topladığın kanıtlara bakınca en olası yönü söyleyebilirim. Belirtiyi biraz daha netleştirir misin — ne zaman başladı, sürekli mi yoksa aralıklı mı?",
    source: "Ekipman geçmişi · toplanan kanıtlar",
    actions: [
      { id: "check-done", label: "Görsel kontrolü yaptım" },
      { id: "add-evidence", label: "Ek kanıt ekle" },
      { id: "go-close", label: "Kapanışa geç" },
    ],
  };
}

function AiScreen() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  const navigate = useNavigate();
  const brief = useMemo(() => (job ? getAiBrief(job) : null), [job]);
  const [confirmedChecks, setConfirmedChecks] = useState<Set<string>>(new Set());
  const [confirmedCause, setConfirmedCause] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    [],
  );
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (job && job.status !== "teshis" && job.status !== "beklemede" && job.status !== "tamamlandi") {
      setStatus(job.id, "teshis");
    }
  }, [job]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  if (!job || !brief) return null;

  const handleAction = (a: QuickAction) => {
    if (!job) return;
    if (a.id === "go-close") {
      navigate({ to: "/jobs/$jobId/close", params: { jobId: job.id } });
      return;
    }
    if (a.id === "go-hold") {
      navigate({ to: "/jobs/$jobId/hold", params: { jobId: job.id } });
      return;
    }
    if (a.id === "add-evidence") {
      navigate({ to: "/jobs/$jobId/evidence", params: { jobId: job.id } });
      return;
    }
    // Otherwise register as chat turn
    sendMessage(a.label);
  };

  const sendMessage = (text: string) => {
    const clean = text.trim();
    if (!clean || !job) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: clean };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, mockAiReply(job, clean)]);
      setThinking(false);
    }, 650);
  };

  return (
    <AppShell
      title="AI ile Teşhis Et"
      subtitle={job.code}
      back
      footer={
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/jobs/$jobId/hold", params: { jobId: job.id } })}
            className="btn-secondary"
          >
            <PauseCircle className="h-4 w-4" />
            Beklemeye al
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/jobs/$jobId/close", params: { jobId: job.id } })}
            className="btn-primary"
          >
            Kapanışa geç
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          ToolA, topladığın kanıtları, ekipman geçmişini, benzer vakaları ve teknik kaynakları birlikte değerlendirir.
        </p>

        {job.evidence.length > 0 ? (
          <section>
            <SectionTitle>Toplanan kanıtlar</SectionTitle>
            <ul className="mt-2 card-surface divide-y divide-border">
              {job.evidence.map((ev) => (
                <li key={ev.id} className="px-3 py-1.5 text-xs">
                  <span className="font-medium">{ev.label}</span>
                  {ev.value ? `: ${ev.value}` : ev.note ? ` — ${ev.note}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card-surface px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-info">
            <Sparkles className="h-3.5 w-3.5" />
            AI özeti
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{brief.intro}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kaynak: İş emri #{job.code.split("-")[1]} · ekipman geçmişi · geçmiş kapanış notları · bakım kılavuzu
          </p>
        </section>

        <section>
          <SectionTitle>Olası kök nedenler</SectionTitle>
          <ul className="mt-2 space-y-2">
            {brief.suggestions.map((s) => {
              const isYes = confirmedCause === s.id;
              const isNo = confirmedCause === `no-${s.id}`;
              return (
                <li key={s.id} className="card-surface px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.title}</span>
                        <span className="chip bg-secondary text-muted-foreground">
                          %{Math.round(s.confidence * 100)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">↳ {s.source}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmedCause(isYes ? null : s.id)}
                      className={`btn-secondary ${isYes ? "border-success bg-success/10 text-success" : ""}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Sorun bu
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedCause(isNo ? null : `no-${s.id}`)}
                      className={`btn-secondary ${isNo ? "border-danger bg-danger/10 text-danger" : ""}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Bu değil
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <SectionTitle>Önerilen kontroller</SectionTitle>
          <ul className="mt-2 space-y-2">
            {brief.checks.map((c) => {
              const done = confirmedChecks.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(confirmedChecks);
                      if (done) next.delete(c.id);
                      else next.add(c.id);
                      setConfirmedChecks(next);
                    }}
                    className={`card-surface flex w-full items-center gap-3 px-3 py-3 text-left ${
                      done ? "border-success bg-success/5" : ""
                    }`}
                  >
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full border ${
                        done
                          ? "border-success bg-success text-success-foreground"
                          : "border-border"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.hint ? (
                        <div className="text-xs text-muted-foreground">{c.hint}</div>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <SectionTitle>Benzer vakalar</SectionTitle>
          <ul className="mt-2 card-surface divide-y divide-border">
            {job.history.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Kayıt yok.</li>
            ) : (
              job.history.map((h) => (
                <li key={h.id} className="px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.rootCause}</span>
                    <span className="text-xs text-muted-foreground">{h.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {h.summary} → {h.action}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>ToolA'ya sor</SectionTitle>
            <span className="text-[11px] text-muted-foreground">
              {messages.length === 0 ? "Serbest sohbet" : `${messages.length} mesaj`}
            </span>
          </div>

          <div className="mt-2 card-surface p-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Anlamadığın veya emin olmadığın bir şeyi sor. ToolA kanıtlarına ve ekipman geçmişine bakarak cevaplar.
                </p>
                <div className="flex flex-wrap gap-1.5">
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
            ) : (
              <div className="space-y-3">
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-info">
                        <Sparkles className="h-3 w-3" />
                        ToolA
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                      {m.source ? (
                        <p className="text-[11px] text-muted-foreground">↳ {m.source}</p>
                      ) : null}
                      {m.actions && m.actions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.actions.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleAction(a)}
                              className="chip border border-border bg-background text-xs text-foreground hover:bg-secondary"
                            >
                              {a.id === "add-evidence" ? (
                                <Plus className="h-3 w-3" />
                              ) : a.id === "issue-confirmed" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : a.id === "issue-rejected" ? (
                                <XCircle className="h-3 w-3" />
                              ) : null}
                              {a.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ),
                )}
                {thinking ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    ToolA düşünüyor…
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="mt-3 flex items-end gap-2 border-t border-border pt-3"
            >
              <textarea
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
                className="min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="btn-primary h-10 w-10 shrink-0 p-0 disabled:opacity-40"
                aria-label="Gönder"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h2>
  );
}
