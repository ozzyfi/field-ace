// Mock data + types for ToolA field technician app.
// Realistic shape without a backend.

export type TaskType = "ariza" | "bakim" | "kurulum" | "test";
export type Priority = "dusuk" | "orta" | "yuksek" | "kritik";
export type JobSource = "dashboard" | "erp" | "manuel" | "qr" | "csv";
export type JobStatus =
  | "atandi"
  | "yoldayim"
  | "sahadayim"
  | "teshis"
  | "beklemede"
  | "tamamlandi";

export type EvidenceType = "foto" | "video" | "ses" | "olcum" | "hata_kodu" | "parca_foto" | "not";

export interface Evidence {
  id: string;
  type: EvidenceType;
  label: string;
  note?: string;
  value?: string; // measurement / error code / note text
  createdAt: string;
}

export type HistoryKind = "bakim" | "ariza" | "parca" | "kontrol" | "test";

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  date: string;
  summary: string;
  rootCause: string;
  action: string;
  partChanged?: string;
}

export const historyKindLabel: Record<HistoryKind, string> = {
  bakim: "Son bakım",
  ariza: "Son arıza",
  parca: "Değişen parça",
  kontrol: "Yapılan kontrol",
  test: "Son test",
};

export interface ClosureSummary {
  symptom: string;
  rootCause: string;
  action: string;
  partUsed?: string;
  result: string;
  testDone: boolean;
  memoryCandidate?: string;
  closedAt: string;
}

export interface HoldSummary {
  reason: HoldReason;
  checked: string;
  whyNotClosing: string;
  nextAction: string;
  owner: string;
  heldAt: string;
}

export type HoldReason =
  | "parca_bekliyor"
  | "uzman_destegi"
  | "onay_bekliyor"
  | "guvenlik_erisim"
  | "makine_durdurulamiyor"
  | "olcum_ekipmani"
  | "tekrar_uretilemiyor"
  | "diger";

export interface Job {
  id: string;
  code: string;
  taskType: TaskType;
  title: string;
  equipment: string;
  location: string;
  description: string;
  priority: Priority;
  status: JobStatus;
  assignedBy: string;
  centralNote?: string;
  source: JobSource;
  createdAt: string;
  dueAt?: string;
  history: HistoryItem[];
  bringItems: string[];
  evidence: Evidence[];
  closure?: ClosureSummary;
  hold?: HoldSummary;
  featured?: boolean;
}

// Fixed base to keep SSR and client renders deterministic.
const now = new Date("2026-07-07T09:00:00Z");
const iso = (offsetHours: number) =>
  new Date(now.getTime() + offsetHours * 3600 * 1000).toISOString();

export const initialJobs: Job[] = [
  {
    id: "job-1842",
    code: "İE-1842",
    taskType: "ariza",
    title: "Pompa P-204 yüksek ses ve titreşim",
    equipment: "Santrifüj Pompa P-204",
    location: "Ünite 2 · Pompa Odası",
    description:
      "Vardiya operatörü sabah 07:20'de olağandışı metalik ses ve titreşim bildirdi. Debi normal, sıcaklık artışı yok.",
    priority: "yuksek",
    status: "atandi",
    assignedBy: "Merkez Bakım · E. Yıldız",
    centralNote:
      "Son 90 gün içinde 3 benzer kayıt var. Kaplin hizası ve yatak sıcaklığı öncelikli kontrol edilsin.",
    source: "dashboard",
    createdAt: iso(-2),
    dueAt: iso(4),
    featured: true,
    history: [
      {
        id: "h1",
        kind: "ariza",
        date: "12 gün önce",
        summary: "Yüksek titreşim",
        rootCause: "Kaplin hizasızlığı",
        action: "Lazer hizalama yapıldı",
      },
      {
        id: "h2",
        kind: "parca",
        date: "38 gün önce",
        summary: "Ses ve ısınma",
        rootCause: "Rulman aşınması",
        action: "Rulman değiştirildi",
        partChanged: "SKF 6208-2RS",
      },
      {
        id: "h3",
        kind: "kontrol",
        date: "71 gün önce",
        summary: "Titreşim uyarısı",
        rootCause: "Kaplin hizasızlığı",
        action: "Hizalama",
      },
    ],
    bringItems: [
      "Titreşim ölçer",
      "Lazer hizalama seti",
      "Termal kamera / sıcaklık ölçer",
      "Alyan ve anahtar seti",
      "Yedek kaplin elemanı",
    ],
    evidence: [],
  },
  {
    id: "job-1843",
    code: "İE-1843",
    taskType: "ariza",
    title: "Klima Oda 304 soğutmuyor",
    equipment: "Split Klima 12k · Oda 304",
    location: "İdari Blok · 3. Kat",
    description: "Set 22°C, ölçülen 27°C. Fan çalışıyor, dış ünite sesi normal.",
    priority: "orta",
    status: "atandi",
    assignedBy: "Merkez Bakım · E. Yıldız",
    source: "erp",
    createdAt: iso(-4),
    dueAt: iso(8),
    history: [
      {
        id: "h1",
        kind: "bakim",
        date: "1 yıl önce",
        summary: "Yıllık bakım",
        rootCause: "Rutin",
        action: "Filtre + gaz kontrolü",
      },
    ],
    bringItems: [
      "Manometre seti",
      "Filtre kontrol ekipmanı",
      "Multimetre",
      "Temizlik spreyi",
      "Gaz kontrol ekipmanı",
    ],
    evidence: [],
  },
  {
    id: "job-1844",
    code: "BK-1844",
    taskType: "bakim",
    title: "Jeneratör G-12 haftalık kontrol",
    equipment: "Jeneratör G-12 · 250 kVA",
    location: "Enerji Merkezi",
    description: "Haftalık rutin: yağ, yakıt, akü, çalıştırma testi.",
    priority: "dusuk",
    status: "atandi",
    assignedBy: "Planlı Bakım",
    source: "dashboard",
    createdAt: iso(-6),
    dueAt: iso(24),
    history: [
      {
        id: "h1",
        kind: "bakim",
        date: "7 gün önce",
        summary: "Haftalık kontrol",
        rootCause: "Rutin",
        action: "Yağ, yakıt, akü kontrolü",
      },
    ],
    bringItems: [
      "Multimetre",
      "Akü test cihazı",
      "Yağ seviye çubuğu",
      "Temiz bez ve eldiven",
    ],
    evidence: [],
  },
  {
    id: "job-1845",
    code: "KR-1845",
    taskType: "kurulum",
    title: "Titreşim sensörü montajı · Hat 2",
    equipment: "IFM VSA001",
    location: "Üretim Hat 2 · Motor M-07",
    description: "Yeni sensörün montajı, kablo çekimi, devreye alma testi.",
    priority: "orta",
    status: "atandi",
    assignedBy: "Reliability",
    source: "manuel",
    createdAt: iso(-8),
    history: [],
    bringItems: [
      "Sensör (IFM VSA001)",
      "M8 konnektör ve kablo",
      "Delme / matkap seti",
      "Multimetre",
      "Kablo bağı ve etiket",
    ],
    evidence: [],
  },
  {
    id: "job-1846",
    code: "TS-1846",
    taskType: "test",
    title: "Konveyör güvenlik switch testi",
    equipment: "Konveyör K-3",
    location: "Paketleme · Hat 3",
    description: "Acil stop ve pull-cord switch testi. Aylık rutin.",
    priority: "orta",
    status: "atandi",
    assignedBy: "İSG",
    source: "dashboard",
    createdAt: iso(-10),
    history: [
      {
        id: "h1",
        kind: "test",
        date: "30 gün önce",
        summary: "Aylık güvenlik testi",
        rootCause: "Rutin",
        action: "Tüm switch'ler test edildi · sonuç OK",
      },
    ],
    bringItems: [
      "Multimetre",
      "Test etiketi",
      "İSG kilit-etiket (LOTO) seti",
      "El feneri",
    ],
    evidence: [],
  },
];

export const priorityLabel: Record<Priority, string> = {
  dusuk: "Düşük",
  orta: "Orta",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

export const taskTypeLabel: Record<TaskType, string> = {
  ariza: "Arıza",
  bakim: "Bakım",
  kurulum: "Kurulum",
  test: "Test",
};

export const statusLabel: Record<JobStatus, string> = {
  atandi: "Atandı",
  yoldayim: "Yolda",
  sahadayim: "Sahada",
  teshis: "AI Teşhis",
  beklemede: "Beklemede",
  tamamlandi: "Tamamlandı",
};

export const sourceLabel: Record<JobSource, string> = {
  dashboard: "Dashboard",
  erp: "ERP",
  manuel: "Manuel",
  qr: "QR",
  csv: "CSV",
};

export const holdReasonLabel: Record<HoldReason, string> = {
  parca_bekliyor: "Parça bekliyor",
  uzman_destegi: "Uzman desteği gerekiyor",
  onay_bekliyor: "Amir onayı bekleniyor",
  guvenlik_erisim: "Güvenlik / erişim engeli",
  makine_durdurulamiyor: "Makine durdurulamıyor",
  olcum_ekipmani: "Ölçüm/test ekipmanı gerekiyor",
  tekrar_uretilemiyor: "Arıza tekrar üretilemiyor",
  diger: "Diğer",
};

export const evidenceTypeLabel: Record<EvidenceType, string> = {
  foto: "Fotoğraf",
  video: "Video",
  ses: "Sesli not",
  olcum: "Ölçüm",
  hata_kodu: "Hata kodu",
  parca_foto: "Parça fotoğrafı",
  not: "Yazılı gözlem",
};
