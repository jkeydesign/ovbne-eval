import { useState, useRef } from 'react';

export default function LogoCard({ logo, rating, onRate, onPreview, onHover, onHoverEnd }) {
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef(null);

  const brandScore = rating?.brand_score ?? null;
  const visualScore = rating?.visual_score ?? null;
  const completed = brandScore !== null && visualScore !== null;

  return (
    <div
      ref={cardRef}
      className="bg-white flex flex-col select-none transition-shadow hover:shadow-md"
      style={{ borderRadius: '8px', border: completed ? '2px solid #6b7280' : '2px solid #e5e7eb' }}
    >
      {/* Image — scales with card width */}
      <div
        className="aspect-square bg-gray-50 cursor-pointer overflow-hidden relative"
        style={{ borderRadius: '6px 6px 0 0' }}
        onMouseEnter={() => cardRef.current && onHover(logo, cardRef.current.getBoundingClientRect())}
        onMouseLeave={onHoverEnd}
        onClick={() => onPreview(logo)}
      >
        {!imgError ? (
          <img
            src={logo.imagePath}
            alt={logo.id}
            draggable={false}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-3"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1" />
              <path d="M3 9l4-4 4 4 4-4 4 4" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-400">{logo.id}</span>
          </div>
        )}
        {completed && (
          <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-gray-700 rounded-full flex items-center justify-center" title="평가 완료">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" style={{ width: '9px', height: '9px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Score panel — fixed size regardless of card width */}
      <div className="p-2">
        <p className="text-[10px] font-mono text-gray-400 mb-1.5 text-center tracking-widest">{logo.id}</p>

        {/* B row */}
        <div className="flex items-center gap-0.5 mb-1">
          <span className="text-[11px] font-bold text-gray-800 shrink-0 text-center" style={{ width: '14px' }}>B</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'brand_score', n)}
              className={`flex-1 h-7 rounded transition-colors leading-none
                ${brandScore === n
                  ? 'bg-gray-900 text-white text-sm font-bold'
                  : 'bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 active:bg-gray-300'}`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* V row */}
        <div className="flex items-center gap-0.5">
          <span className="text-[11px] font-bold text-gray-400 shrink-0 text-center" style={{ width: '14px' }}>V</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'visual_score', n)}
              className={`flex-1 h-7 rounded transition-colors leading-none
                ${visualScore === n
                  ? 'bg-gray-500 text-white text-sm font-bold'
                  : 'bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 active:bg-gray-300'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
