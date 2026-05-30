import { useMemo } from 'react';
import LogoCard from './LogoCard';
import { calcTotalScore, isCompleted } from '../utils/scoring';

export default function LogoGrid({
  logos,
  ratings,
  filter,
  sort,
  cardSize,
  onRate,
  onPreview,
}) {
  const size = cardSize ?? 180;

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
            gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
            gap: size < 150 ? '6px' : '10px',
          }}
        >
          {filtered.map(logo => (
            <LogoCard
              key={logo.id}
              logo={logo}
              rating={ratings[logo.id]}
              onRate={onRate}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
