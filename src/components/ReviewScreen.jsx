import { useState } from 'react';
import { isCompleted, calcTotalScore } from '../utils/scoring';

/* ── helpers ─────────────────────────────────────────── */
function avg(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100;
}

function distOf(arr) {
  const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  arr.forEach(v => { d[v] = (d[v] || 0) + 1; });
  return d;
}

function formatDuration(sec) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

/* ── sub-components ──────────────────────────────────── */
function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function DistributionChart({ title, distribution, warn }) {
  const max = Math.max(...Object.values(distribution), 1);
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  const LABELS = { 1: '전혀\n그렇지\n않다', 2: '그렇지\n않다', 3: '보통\n이다', 4: '그렇다', 5: '매우\n그렇다' };
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${warn ? 'text-amber-600' : 'text-gray-400'}`}>
        {title}{warn && ' ⚠'}
      </p>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(n => {
          const count = distribution[n] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barPct = (count / max) * 100;
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4 shrink-0 text-right font-mono">{n}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`h-4 rounded-full transition-all duration-300 ${count >= 40 ? 'bg-amber-400' : 'bg-gray-700'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-14 shrink-0 text-right">
                {count}개 ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WarnBox({ children }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 leading-relaxed">
      {children}
    </div>
  );
}

/* ── main component ──────────────────────────────────── */
export default function ReviewScreen({ logos: logoProp, ratings, timestampStart, onBack, onSubmit }) {
  const [confirmed, setConfirmed] = useState(false);

  // logos prop = 27개 평가 대상 로고 배열
  const logos = logoProp.map(l => l.id);
  const completedIds = logos.filter(id => isCompleted(ratings[id]));
  const incompleteIds = logos.filter(id => !isCompleted(ratings[id]));
  const allDone = incompleteIds.length === 0;

  const brandScores  = completedIds.map(id => ratings[id].brand_score);
  const visualScores = completedIds.map(id => ratings[id].visual_score);
  const totalScores  = completedIds.map(id =>
    calcTotalScore(ratings[id].brand_score, ratings[id].visual_score)
  );

  const brandAvg  = avg(brandScores);
  const visualAvg = avg(visualScores);
  const totalAvg  = avg(totalScores);

  const brandDist  = distOf(brandScores);
  const visualDist = distOf(visualScores);

  const brandMax  = Math.max(...Object.values(brandDist));
  const visualMax = Math.max(...Object.values(visualDist));
  const brandWarn  = completedIds.length >= 40 && brandMax >= 40;
  const visualWarn = completedIds.length >= 40 && visualMax >= 40;
  const sameScoreWarn = brandWarn || visualWarn;

  const durationSec = Math.round((Date.now() - new Date(timestampStart).getTime()) / 1000);
  const fastWarn = durationSec < 300;

  const canSubmit = allDone && confirmed;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* 헤더 */}
        <div className="mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">제출 전 확인</p>
          <h1 className="text-xl font-semibold text-gray-900">제출 전 평가 내용 확인</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            아래 내용은 응답 누락과 입력 오류를 줄이기 위한 확인 절차입니다.
            평가 결과를 수정하려면 '평가 화면으로 돌아가기'를 눌러 주세요.
          </p>
        </div>

        {/* 경고 메시지 */}
        {(fastWarn || sameScoreWarn || !allDone) && (
          <div className="space-y-2">
            {!allDone && (
              <WarnBox>
                아직 평가가 완료되지 않은 로고가 있습니다. 미완료 로고를 확인한 뒤 제출해 주세요.
              </WarnBox>
            )}
            {fastWarn && (
              <WarnBox>
                평가 시간이 비교적 짧게 기록되었습니다. 모든 로고 시안을 충분히 확인했는지 제출 전 다시 확인해 주세요.
              </WarnBox>
            )}
            {sameScoreWarn && (
              <WarnBox>
                대부분의 시안에 동일하거나 매우 유사한 점수가 입력되었습니다. 의도한 평가인지 제출 전 한 번 더 확인해 주세요.
              </WarnBox>
            )}
          </div>
        )}

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="평가 완료" value={`${completedIds.length} / ${logos.length}`} highlight={!allDone} />
          <StatCard label="브랜드 평균" value={brandAvg ?? '—'} />
          <StatCard label="시각 평균"   value={visualAvg ?? '—'} />
          <StatCard label="종합 평균"   value={totalAvg ?? '—'} />
        </div>

        {/* 소요 시간 */}
        <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">평가 소요 시간</span>
          <span className={`text-sm font-semibold ${fastWarn ? 'text-amber-600' : 'text-gray-900'}`}>
            {formatDuration(durationSec)}
            {fastWarn && <span className="text-amber-500 ml-1">⚠</span>}
          </span>
        </div>

        {/* 미완료 로고 목록 */}
        {incompleteIds.length > 0 && (
          <div className="bg-white border border-red-200 rounded-md p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">
              미완료 로고 ({incompleteIds.length}개)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {incompleteIds.map(id => (
                <span
                  key={id}
                  className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200 font-mono"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 점수 분포 차트 */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <DistributionChart
              title="브랜드 점수 분포"
              distribution={brandDist}
              warn={brandWarn}
            />
            <DistributionChart
              title="시각 점수 분포"
              distribution={visualDist}
              warn={visualWarn}
            />
          </div>
          {sameScoreWarn && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1">동일 점수 반복 감지</p>
              {brandWarn && (
                <p className="text-xs text-amber-700">• 브랜드 점수: 최빈값 {brandMax}개 집중</p>
              )}
              {visualWarn && (
                <p className="text-xs text-amber-700">• 시각 점수: 최빈값 {visualMax}개 집중</p>
              )}
            </div>
          )}
        </div>

        {/* 확인 체크박스 */}
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
              style={{ accentColor: '#111827' }}
            />
            <span className={`text-sm leading-relaxed transition-colors ${confirmed ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {logos.length}개 로고 시안을 모두 확인하고, 브랜드 브리프와 판단 기준에 따라 평가했음을 확인합니다.
            </span>
          </label>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={onBack}
            className="flex-1 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            ← 평가 화면으로 돌아가기
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${
              canSubmit
                ? 'bg-gray-900 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            최종 제출하기
          </button>
        </div>

      </div>
    </div>
  );
}
