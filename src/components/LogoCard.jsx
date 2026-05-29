import { useState, useRef } from 'react';

export default function LogoCard({ logo, rating, onRate, onPreview, onHover, onHoverEnd }) {
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef(null);

  const brandScore = rating?.brand_score ?? null;
  const visualScore = rating?.visual_score ?? null;
  const completed = brandScore !== null && visualScore !== null;

  const handleImageMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onHover(logo, rect);
    }
  };

  const handleImageMouseLeave = () => {
    onHoverEnd();
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-lg border-2 flex flex-col select-none transition-shadow hover:shadow-md
        ${completed ? 'border-gray-500' : 'border-gray-200'}`}
    >
      {/* Image */}
      <div
        className="aspect-square bg-gray-50 cursor-pointer overflow-hidden rounded-t-lg relative"
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
        onClick={() => onPreview(logo)}
      >
        {!imgError ? (
          <img
            src={logo.imagePath}
            alt={logo.id}
            draggable={false}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1" />
              <path d="M3 9l4-4 4 4 4-4 4 4" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="text-sm text-gray-400">{logo.id}</span>
          </div>
        )}
        {completed && (
          <div className="absolute top-2 right-2 w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center" title="평가 완료">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div className="p-4 pt-3">
        <p className="text-sm font-mono text-gray-400 mb-3 text-center tracking-widest">{logo.id}</p>

        {/* Brand score row */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm font-bold text-gray-800 w-6 shrink-0 text-center">B</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'brand_score', n)}
              className={`flex-1 h-10 text-sm font-semibold rounded transition-colors leading-none
                ${brandScore === n
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Visual score row */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-gray-400 w-6 shrink-0 text-center">V</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'visual_score', n)}
              className={`flex-1 h-10 text-sm font-semibold rounded transition-colors leading-none
                ${visualScore === n
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
