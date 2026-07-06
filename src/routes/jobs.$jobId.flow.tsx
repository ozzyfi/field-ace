import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, CheckCircle2, PauseCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useJob } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId/flow")({
  head: () => ({
    meta: [{ title: "Akış seç · ToolA" }, { name: "robots", content: "noindex" }],
  }),
  component: FlowChoice,
});

function FlowChoice() {
  const { jobId } = Route.useParams();
  const job = useJob(jobId);
  if (!job) return null;

  return (
    <AppShell title="Nasıl ilerleyelim?" subtitle={job.code} back>
      <p className="text-sm text-muted-foreground">
        Sahaya vardın ve {job.evidence.length} kanıt topladın. Şimdi ne yapmak istiyorsun?
      </p>

      <div className="mt-5 space-y-3">
        <FlowCard
          to="/jobs/$jobId/close"
          jobId={job.id}
          tone="primary"
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Çözdüm, hızlı kapat"
          desc="Arızayı çözdün. Kök nedeni ve yaptığını kısaca gir, ToolA yapılandırılmış kapanışa çevirsin."
        />
        <FlowCard
          to="/jobs/$jobId/ai"
          jobId={job.id}
          tone="info"
          icon={<Brain className="h-5 w-5" />}
          title="Kanıt topla, AI ile teşhis et"
          desc="Kök nedenden emin değilsen. Geçmiş vakalar ve önerilen kontrollerle ilerle."
        />
        <FlowCard
          to="/jobs/$jobId/hold"
          jobId={job.id}
          tone="warning"
          icon={<PauseCircle className="h-5 w-5" />}
          title="Destek veya parça bekliyorum"
          desc="İşi şu an kapatamıyorsan. Neden kapanmadığını ve sonraki aksiyonu kaydet."
        />
      </div>
    </AppShell>
  );
}

function FlowCard({
  to,
  jobId,
  icon,
  title,
  desc,
  tone,
}: {
  to: "/jobs/$jobId/close" | "/jobs/$jobId/ai" | "/jobs/$jobId/hold";
  jobId: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: "primary" | "info" | "warning";
}) {
  const toneMap = {
    primary: "bg-accent/20 text-accent-foreground",
    info: "bg-info/15 text-info",
    warning: "bg-warning/25 text-warning-foreground",
  };
  return (
    <Link
      to={to}
      params={{ jobId }}
      className="card-surface block px-4 py-4 active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
