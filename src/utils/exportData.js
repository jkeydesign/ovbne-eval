import { calcTotalScore } from './scoring';

export function buildResponseData(participantId, ratings, timestampStart) {
  const now = new Date();
  const nowISO = now.toISOString();
  const logos = [];

  for (let i = 1; i <= 50; i++) {
    const logoId = `L-${i}`;
    const r = ratings[logoId];
    const brandScore  = r?.brand_score  ?? null;
    const visualScore = r?.visual_score ?? null;
    const completed   = brandScore !== null && visualScore !== null;

    logos.push({
      logo_id: logoId,
      brand_score: brandScore,
      visual_score: visualScore,
      total_score: completed ? calcTotalScore(brandScore, visualScore) : null,
      completed,
      updated_at: r?.updated_at ?? null,
    });
  }

  const done = logos.filter(l => l.completed);

  const avg = (key) =>
    done.length
      ? Math.round((done.reduce((s, l) => s + l[key], 0) / done.length) * 100) / 100
      : null;

  const top27 = [...done]
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 27)
    .map(l => l.logo_id);

  // ── quality_check ────────────────────────────────────
  const durationSeconds = Math.round((now - new Date(timestampStart)) / 1000);

  const distOf = (key) => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    done.forEach(l => { if (l[key] !== null) d[l[key]]++; });
    return d;
  };

  const brandDist  = distOf('brand_score');
  const visualDist = distOf('visual_score');
  const brandMax   = Math.max(...Object.values(brandDist));
  const visualMax  = Math.max(...Object.values(visualDist));

  const quality_check = {
    duration_seconds: durationSeconds,
    completed_count: done.length,
    incomplete_logo_ids: logos.filter(l => !l.completed).map(l => l.logo_id),
    brand_score_distribution:  brandDist,
    visual_score_distribution: visualDist,
    brand_same_score_warning:  done.length >= 40 && brandMax  >= 40,
    visual_same_score_warning: done.length >= 40 && visualMax >= 40,
    fast_completion_warning:   durationSeconds < 300,
  };

  return {
    participant_id:   participantId,
    timestamp_start:  timestampStart,
    timestamp_submit: nowISO,
    logos,
    summary: {
      completed_count: done.length,
      brand_average:   avg('brand_score'),
      visual_average:  avg('visual_score'),
      total_average:   avg('total_score'),
      top_27_logo_ids: top27,
    },
    quality_check,
  };
}

export function downloadJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `ovbne_eval_${data.participant_id}.json`);
}

export function downloadCSV(data) {
  const cols = [
    'participant_id',
    'logo_id',
    'brand_score',
    'visual_score',
    'total_score',
    'completed',
    'updated_at',
    'timestamp_submit',
    'duration_seconds',
    'brand_same_score_warning',
    'visual_same_score_warning',
    'fast_completion_warning',
  ];

  const qc = data.quality_check || {};

  const rows = data.logos.map(l => [
    data.participant_id,
    l.logo_id,
    l.brand_score  ?? '',
    l.visual_score ?? '',
    l.total_score  ?? '',
    l.completed,
    l.updated_at   ?? '',
    data.timestamp_submit,
    qc.duration_seconds ?? '',
    qc.brand_same_score_warning  ?? '',
    qc.visual_same_score_warning ?? '',
    qc.fast_completion_warning   ?? '',
  ]);

  const csv = [cols, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `ovbne_eval_${data.participant_id}.csv`);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
