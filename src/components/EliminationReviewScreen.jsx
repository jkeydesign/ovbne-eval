import { useState } from 'react';
import { LOGOS } from '../data/logos';

const LIMIT = 23;

function MiniCard({ logo, eliminated, dragging, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white overflow-hidden cursor-grab active:cursor-grabbing select-none transition-opacity ${
        eliminated ? 'border-red-200' : 'border-green-200'
      } ${dragging ? 'opacity-40 scale-95' : 'hover:shadow-md'}`}
      title="드래그하여 이동"
    >
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        <img
          src={logo.imagePath}
          alt={logo.id}
          className={`w-full h-full object-contain p-1.5 ${eliminated ? 'opacity-50' : ''}`}
        />
        <div
          className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${
            eliminated ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {eliminated ? (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <p className="text-[9px] font-mono text-center text-gray-400 py-0.5">{logo.id}</p>
    </div>
  );
}

export default function EliminationReviewScreen({ eliminatedIds, onEliminate, onBack, onNext }) {
  const [dragId, setDragId]     = useState(null);
  const [dragOver, setDragOver] = useState(null); // 'elim' | 'pass'

  const eliminated = LOGOS.filter(l => eliminatedIds.includes(l.id));
  const passing    = LOGOS.filter(l => !eliminatedIds.includes(l.id));
  const isExact    = eliminatedIds.length === LIMIT;

  /* ── drag handlers ── */
  const handleDragStart = (id) => setDragId(id);
  const handleDragEnd   = () => { setDragId(null); setDragOver(null); };

  const handleDragOver = (zone, e) => {
    e.preventDefault();
    setDragOver(zone);
  };

  const handleDrop = (zone) => {
    if (!dragId) return;
    const inElim = eliminatedIds.includes(dragId);
    if (zone === 'elim' && !inElim) {
      onEliminate([...eliminatedIds, dragId]);
    } else if (zone === 'pass' && inElim) {
      onEliminate(eliminatedIds.filter(id => id !== dragId));
    }
    setDragId(null);
    setDragOver(null);
  };

  const zoneClass = (zone) =>
    `rounded-lg p-4 border-2 transition-all min-h-[120px] ${
      dragOver === zone
        ? zone === 'elim'
          ? 'border-red-400 bg-red-50'
          : 'border-green-400 bg-green-50'
        : zone === 'elim'
          ? 'border-red-200 bg-white'
          : 'border-green-200 bg-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* 헤더 */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">시안 선별 확인</p>
          <h1 className="text-xl font-semibold text-gray-900">선별 결과를 확인해 주세요</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            카드를 드래그하여 탈락/평가 박스 사이에서 직접 옮길 수 있습니다.
            탈락 시안이 정확히 <strong>23개</strong>일 때 평가를 시작할 수 있습니다.
          </p>
        </div>

        {/* 현재 카운트 표시 */}
        {!isExact && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
            <span>⚠</span>
            <span>
              현재 탈락 시안 <strong>{eliminatedIds.length}개</strong> — 정확히 23개여야 합니다
              {eliminatedIds.length < LIMIT
                ? ` (${LIMIT - eliminatedIds.length}개 더 탈락으로 이동 필요)`
                : ` (${eliminatedIds.length - LIMIT}개 평가로 이동 필요)`}
            </span>
          </div>
        )}

        {/* 탈락 시안 드롭존 */}
        <div
          className={zoneClass('elim')}
          onDragOver={(e) => handleDragOver('elim', e)}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop('elim')}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
            <h2 className="text-sm font-semibold text-red-700">
              탈락 시안 — {eliminated.length}개
              {eliminated.length !== LIMIT && (
                <span className="ml-2 text-xs font-normal text-red-400">(23개 필요)</span>
              )}
            </h2>
            <span className="text-xs text-red-300 ml-auto">본실험에서 제외 · 여기로 드래그</span>
          </div>
          {eliminated.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-red-300 border-2 border-dashed border-red-200 rounded-lg">
              카드를 이곳으로 드래그하세요
            </div>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {eliminated.map(logo => (
                <MiniCard
                  key={logo.id}
                  logo={logo}
                  eliminated
                  dragging={dragId === logo.id}
                  onDragStart={() => handleDragStart(logo.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* 평가 대상 드롭존 */}
        <div
          className={zoneClass('pass')}
          onDragOver={(e) => handleDragOver('pass', e)}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop('pass')}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            <h2 className="text-sm font-semibold text-green-700">
              평가 대상 시안 — {passing.length}개
            </h2>
            <span className="text-xs text-green-400 ml-auto">이 시안들을 평가합니다 · 여기로 드래그</span>
          </div>
          {passing.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-green-300 border-2 border-dashed border-green-200 rounded-lg">
              카드를 이곳으로 드래그하세요
            </div>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {passing.map(logo => (
                <MiniCard
                  key={logo.id}
                  logo={logo}
                  eliminated={false}
                  dragging={dragId === logo.id}
                  onDragStart={() => handleDragStart(logo.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={onBack}
            className="flex-1 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            ← 수정하기
          </button>
          <button
            onClick={onNext}
            disabled={!isExact}
            className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${
              isExact
                ? 'bg-gray-900 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isExact ? '평가 시작하기 →' : `탈락 ${eliminatedIds.length} / 23 — 조건 미충족`}
          </button>
        </div>

      </div>
    </div>
  );
}
