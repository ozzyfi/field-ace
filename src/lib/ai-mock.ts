// Mock AI diagnosis responses per job.
// Feels like a context-aware field assistant, not a blank chat.

import type { Job } from "./mock-data";

export interface AiSuggestion {
  id: string;
  title: string;
  detail: string;
  source: string;
  confidence: number; // 0..1
}

export interface AiCheck {
  id: string;
  label: string;
  hint?: string;
}

export interface AiBrief {
  intro: string;
  suggestions: AiSuggestion[];
  checks: AiCheck[];
}

export function getAiBrief(job: Job): AiBrief {
  if (job.id === "job-1842") {
    return {
      intro:
        "Bu ekipmanda son 90 günde 3 benzer kayıt var. 2 vakada kaplin hizasızlığı, 1 vakada rulman değişimi görülmüş. Önce kaplin hizası ve yatak sıcaklığını kontrol etmeni öneririm.",
      suggestions: [
        {
          id: "s1",
          title: "Kaplin hizasızlığı",
          detail: "En olası neden. Son çözümlerin %66'sı hizalama ile kapatılmış.",
          source: "Önceki kapanış notu · İE-1809",
          confidence: 0.66,
        },
        {
          id: "s2",
          title: "Yatak / rulman aşınması",
          detail: "38 gün önce rulman değiştirilmiş. Sıcaklık ölçümü ayırt edici.",
          source: "İş emri #1780 · Bakım kılavuzu s.42",
          confidence: 0.28,
        },
        {
          id: "s3",
          title: "Kavitasyon",
          detail: "Emiş basıncı düşükse gündeme gelir. Debi normal olduğu için düşük ihtimal.",
          source: "Bakım kılavuzu s.57",
          confidence: 0.06,
        },
      ],
      checks: [
        { id: "c1", label: "Kaplin hizasını lazerle kontrol et", hint: "≤ 0.05 mm tolerans" },
        { id: "c2", label: "Yatak sıcaklığını ölç", hint: "Referans < 65°C" },
        { id: "c3", label: "Titreşim ölçümü al", hint: "Referans ISO 10816 Zone A/B" },
      ],
    };
  }

  if (job.id === "job-1843") {
    return {
      intro:
        "Bu klimada yıllık bakım dışında kayıt yok. Fan çalışıp soğutmama vakalarında ilk sırada gaz kaçağı ve tıkalı filtre geliyor.",
      suggestions: [
        {
          id: "s1",
          title: "Gaz kaçağı / düşük şarj",
          detail: "Set-ölçüm farkı 5°C ve fan normal ise en olası neden.",
          source: "Servis notları · genel",
          confidence: 0.55,
        },
        {
          id: "s2",
          title: "Tıkalı filtre / evaporatör",
          detail: "Hava akışı azalınca soğutma düşer. Görsel kontrol yeterli.",
          source: "Kullanım kılavuzu s.14",
          confidence: 0.3,
        },
      ],
      checks: [
        { id: "c1", label: "Filtreyi çıkar ve kontrol et" },
        { id: "c2", label: "Dış ünite basınçlarını ölç" },
        { id: "c3", label: "Üfleme sıcaklığını ölç", hint: "İç ünite çıkışında" },
      ],
    };
  }

  return {
    intro:
      "Bu iş için geçmiş kayıt sınırlı. Belirtiye göre önce görsel ve işitsel kontrol, sonra ölçüm önerilir.",
    suggestions: [
      {
        id: "s1",
        title: "Görsel kontrol",
        detail: "Sızıntı, gevşek bağlantı, aşınma izleri.",
        source: "Genel prosedür",
        confidence: 0.4,
      },
      {
        id: "s2",
        title: "Ölçüm al",
        detail: "Sıcaklık, titreşim veya elektriksel değer.",
        source: "Genel prosedür",
        confidence: 0.3,
      },
    ],
    checks: [
      { id: "c1", label: "Görsel kontrol yap" },
      { id: "c2", label: "Referans ölçüm al" },
    ],
  };
}

export function generateClosureDraft(job: Job, note: string): {
  symptom: string;
  rootCause: string;
  action: string;
  partUsed?: string;
  result: string;
  memoryCandidate: string;
} {
  // Very light heuristic to feel "AI-drafted" from a voice/text note.
  const text = note.toLowerCase();
  const partMatch = text.match(/(rulman|kaplin|filtre|conta|kayış|sensör|kart|fan)/);
  return {
    symptom: job.title,
    rootCause: text.includes("hiza")
      ? "Kaplin hizasızlığı"
      : text.includes("rulman")
        ? "Yatak / rulman aşınması"
        : text.includes("filtre")
          ? "Tıkalı filtre"
          : "Belirtiye özel — teknisyen notundan çıkarıldı",
    action: note.trim() || "Saha müdahalesi yapıldı.",
    partUsed: partMatch ? partMatch[1] : undefined,
    result: text.includes("kesildi") || text.includes("normal") || text.includes("çözüldü")
      ? "Belirti giderildi, çalışma normale döndü"
      : "Müdahale tamamlandı",
    memoryCandidate: `${job.equipment}: benzer belirtide ilk kontrol → ${
      text.includes("hiza") ? "kaplin hizası" : "görsel kontrol ve ölçüm"
    }.`,
  };
}
