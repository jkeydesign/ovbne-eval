import { useMemo, useState } from 'react';
import LogoCard from './LogoCard';
import { calcTotalScore, isCompleted } from '../utils/scoring';

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'incomplete', label: '미완료' },
  { value: 'completed', label: '완료' },
];

const SORTS = [
  { value: 'default', label: '기본 순서' },
  { value: 'brand_desc', label: '브랜드 점수 높은 순' },
  { value: 'visual_desc', label: '시각 점수 높은 순' },
  { value: 'total_desc', label: '종합 점수 높은 순' },
  { value: 'incomplete_first', label: '미완료 우선' },
];

export default function LogoGrid({
  logos,
  ratings,
  filter,
  sort,
  onFilter,
  onSort,
  onRate,
  onPreview,
  onHover,
  onHoverEnd,
}) {
  const [cardSize, setCardSize] = useState(180);

  const filtered = useMemo(() => {
    let items = [...logos];

    if (filter === 'incomplete') {
      items = items.filter(l => !isCompleted(ratings[l.id]));
    } else if (filter === 'completed') {
      items = items.filter(l => isCompleted(ratings[l.id]));
    }

    if (sort === 'brand_desc') {
      items.sort((a, b) => (ratings[b.id]?.brand_score ?? 0) - (ratings[a.id]?.brand_score ?? 0));
    } else if (sort === 'visual_desc') {
      items.sort((a, b) => (ratings[b.id]?.visual_score ?? 0) - (ratings[a.id]?.visual_score ?? 0));
    } else if (sort === 'total_desc') {
      items.sort((a, b) => {
        const ra = ratings[a.id], rb = ratings[b.id];
        const ta = isCompleted(ra) ? calcTotalScore(ra.brand_score, ra.visual_score) : 0;
        const tb = isCompleted(rb) ? calcTotalScore(rb.brand_score, rb.visual_score) : 0;
        return tb - ta;
      });
    } else if (sort === 'incomplete_first') {
      items.sort((a, b) => {
        const ca = isCompleted(ratings[a.id]) ? 1 : 0;
        const cb = isCompleted(ratings[b.id]) ? 1 : 0;
        return ca - cb;
      });
    }

    return items;
  }, [logos, ratings, filter, sort]);

  return (
    <div className="p-3 sm:p-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                filter === f.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => onSort(e.target.value)}
          className="text-xs px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:border-gray-400"
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length}개 표시 중
        </span>
      </div>

      {/* Card size slider */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-gray-400 shrink-0">카드 크기</span>
        <input
          type="range"
          min="100"
          max="600"
          step="10"
          value={cardSize}
          onChange={e => setCardSize(Number(e.target.value))}
          className="flex-1 max-w-[200px] accent-gray-800 cursor-pointer"
        />
        <span className="text-[10px] text-gray-400 w-12 shrink-0">{cardSize}px</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[10px] text-gray-400">
        <span>
          <span className="inline-block w-3 h-3 bg-gray-900 rounded-sm mr-1 align-middle" />
          B = 브랜드 적합도
        </span>
        <span>
          <span className="inline-block w-3 h-3 bg-gray-500 rounded-sm mr-1 align-middle" />
          V = 시각 완성도
        </span>
        <span>
          <span className="inline-block w-2.5 h-2.5 bg-gray-700 rounded-full mr-1 align-middle" />
          평가 완료
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          해당 조건의 로고가 없습니다.
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
            gap: cardSize < 150 ? '6px' : '10px',
          }}
        >
          {filtered.map(logo => (
            <LogoCard
              key={logo.id}
              logo={logo}
              rating={ratings[logo.id]}
              onRate={onRate}
              onPreview={onPreview}
              onHover={onHover}
              onHoverEnd={onHoverEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
