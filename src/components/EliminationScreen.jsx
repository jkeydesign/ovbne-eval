import { useState, useEffect } from 'react';
import { LOGOS } from '../data/logos';

const LIMIT = 23;

export default function EliminationScreen({
  eliminatedIds,
  onEliminate,
  onNext,
  onBack,
  timestampElimStart,
  cardSize = 180,
  onCardSize,
}) {
  const count = eliminatedIds.length;
  const isComplete = count === LIMIT;
  const canAdd = count < LIMIT;

  const calcMin = (ts) => ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 60000) : 0;
  const [elimMin, setElimMin] = useState(() => calcMin(timestampElimStart));
  useEffect(() => {
    const id = setInterval(() => setElimMin(calcMin(timestampElimStart)), 30000);
    return () => clearInterval(id);
  }, [timestampElimStart]);

  const toggle = (id) => {
    if (eliminatedIds.includes(id)) {
      onEliminate(eliminatedIds.filter(x => x !== id));
    } else if (canAdd) {
      onEliminate([...eliminatedIds, id]);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-0">

      {/* 상단 고정 바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0"
          >
            ← 이전
          </button>

          <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
            탈락 선택:{' '}
            <span className={`font-bold ${isComplete ? 'text-red-600' : 'text-gray-900'}`}>{count}</span>
            <span className="text-gray-400"> / {LIMIT}</span>
          </div>

          <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${isComplete ? 'bg-red-500' : 'bg-red-300'}`}
              style={{ width: `${(count / LIMIT) * 100}%` }}
            />
          </div>

          {isComplete && (
            <span className="text-xs font-semibold text-red-600 whitespace-nowrap shrink-0">✓ 23개 선택 완료</span>
          )}

          {/* 경과 시간 */}
          {timestampElimStart && (
            <div className={`text-xs whitespace-nowrap shrink-0 px-2 py-1 rounded ${elimMin < 5 ? 'text-amber-600 bg-amber-50' : 'text-gray-400'}`}>
              탈락 선별 <span className="font-semibold">{elimMin}분</span> 경과
              {elimMin < 5 && <span className="ml-1 text-[10px]">(5분 이상 권장)</span>}
            </div>
          )}

          <button
            onClick={onNext}
            disabled={!isComplete}
            className={`px-4 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-colors ${
              isComplete
                ? 'bg-gray-900 text-white hover:bg-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={!isComplete ? `${LIMIT - count}개 더 선택해 주세요` : undefined}
          >
            선별 확인 →
          </button>
        </div>

        <div className="px-4 pb-2 flex items-center gap-2 border-t border-gray-100 pt-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-gray-400 shrink-0">카드 크기</span>
            <input
              type="range"
              min="100"
              max="600"
              step="10"
              value={cardSize}
              onChange={e => onCardSize?.(Number(e.target.value))}
              className="w-28 accent-gray-800 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{cardSize}px</span>
          </div>
        </div>
      </div>

      {/* 안내 배너 */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <p className="text-sm text-amber-800 leading-relaxed">
          본실험에서 제외할 로고 시안 <strong>23개</strong>를 선택해 주세요.
          정확히 23개를 선택해야 다음 단계로 진행됩니다.
          {!isComplete && count > 0 && (
            <span className="ml-2 font-medium">— {LIMIT - count}개 더 선택 필요</span>
          )}
        </p>
      </div>

      {/* 그리드 */}
      <div className="flex-1 p-4">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
            gap: cardSize < 150 ? '6px' : '10px',
          }}
        >
          {LOGOS.map(logo => {
            const isElim = eliminatedIds.includes(logo.id);
            return (
              <div
                key={logo.id}
                className={`bg-white rounded-lg flex flex-col select-none transition-all ${
                  isElim ? 'border-2 border-red-400' : 'border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden relative cursor-pointer"
                  onClick={() => toggle(logo.id)}
                >
                  <img
                    src={logo.imagePath}
                    alt={logo.id}
                    className={`w-full h-full object-contain p-2 transition-opacity ${isElim ? 'opacity-35' : ''}`}
                  />
                  {isElim && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-xs font-mono text-gray-500 text-center mb-1 font-medium">{logo.id}</p>
                  <button
                    onClick={() => toggle(logo.id)}
                    disabled={!isElim && !canAdd}
                    className={`w-full py-1 text-xs font-medium rounded transition-colors ${
                      isElim
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : canAdd
                          ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                    }`}
                  >
                    {isElim ? '취소' : '탈락'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
