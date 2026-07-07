import { createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BottomTabs } from "@/components/BottomTabs";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Asistan · ToolA Teknisyen" },
      {
        name: "description",
        content:
          "ToolA saha asistanı: prosedür sor, ekipman geçmişi ara, benzer vakalara bak.",
      },
    ],
  }),
  component: AssistantScreen,
});

interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: { label: string; detail: string }[];
}

const SUGGESTIONS = [
  "Pompa titreşim eşiği ne kadar olmalı?",
  "Klima gaz basıncı düşükse ne kontrol edilir?",
  "Jeneratör akü testinde geçerli değer aralığı?",
  "Aktif işim için kapanışa yeterli kanıtım var mı?",
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "ai",
      text: "Merhaba, ben ToolA. Aktif işin dışında da prosedür, ekipman geçmişi veya benzer vakalar hakkında sorabilirsin.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "ai",
          text: mockAnswer(q),
          sources: [
            { label: "Bakım kılavuzu s.42", detail: "İlgili prosedür bölümü" },
            { label: "Benzer vaka #1783", detail: "Son 90 gün · aynı ekipman ailesi" },
          ],
        },
      ]);
      setThinking(false);
    }, 700);
  }

  return (
    <div className="app-shell flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            ToolA
          </p>
          <h1 className="text-xl font-bold tracking-tight">Asistan</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Prosedür, ekipman geçmişi, benzer vakalar
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-3 px-4 pb-4 pt-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {msg.role === "ai" ? (
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> ToolA
                </div>
              ) : null}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              {msg.sources ? (
                <div className="mt-2 space-y-1">
                  {msg.sources.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-md bg-background/60 px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      <span className="font-semibold text-foreground">{s.label}</span>
                      <span className="ml-1">· {s.detail}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
              ToolA yazıyor…
            </div>
          </div>
        ) : null}

        {messages.length <= 1 ? (
          <div className="pt-2">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Örnek sorular
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="chip bg-secondary text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div ref={endRef} />
      </main>

      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur">
        <div className="border-t border-border px-3 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-md items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ToolA'ya sor…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              disabled={!input.trim()}
              aria-label="Gönder"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
        <BottomTabs />
      </div>
    </div>
  );
}

function mockAnswer(q: string): string {
  const s = q.toLowerCase();
  if (s.includes("titreşim") || s.includes("pompa"))
    return "Santrifüj pompalarda genel eşik: yatay/dikey RMS < 4.5 mm/s normal, 4.5–7.1 mm/s uyarı, >7.1 mm/s müdahale. Kaplin hizası ve yatak durumu birlikte değerlendirilmeli.";
  if (s.includes("klima") || s.includes("gaz"))
    return "Gaz basıncı düşükse önce kaçak testi (köpük veya elektronik dedektör), ardından şarj miktarı kontrol edilir. Filtre ve evaporatör hava akışı da doğrulanmalı.";
  if (s.includes("kanıt") || s.includes("kapan"))
    return "Kapanış için genelde: belirti fotoğrafı, ölçüm, müdahale sonrası fotoğraf ve test sonucu gerekir. Aktif işine geçtiğinde eksik kanıtları listeleyebilirim.";
  return "Elimdeki prosedürlere ve benzer vakalara göre birlikte adım adım ilerleyelim. Ekipman veya vaka numarası verirsen daha spesifik yanıtlayabilirim.";
}
