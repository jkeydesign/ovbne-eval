import { useState, useRef, useEffect } from 'react';

export default function LogoCard({ logo, rating, onRate, onPreview, onHover, onHoverEnd }) {
  const [imgError, setImgError] = useState(false);
  const [cardW, setCardW] = useState(300);
  const cardRef = useRef(null);

  const brandScore = rating?.brand_score ?? null;
  const visualScore = rating?.visual_score ?? null;
  const completed = brandScore !== null && visualScore !== null;

  // Track rendered card width to scale UI proportionally
  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver(entries => {
      setCardW(entries[0].contentRect.width);
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, []);

  // Three size tiers: small < 150, medium 150–299, large ≥ 300
  const sm = cardW < 150;
  const lg = cardW >= 300;

  const imgPad   = sm ? '4px'  : lg ? '24px' : '10px';
  const wrapPad  = sm ? '3px 5px 5px' : lg ? '12px 16px 16px' : '6px 10px 10px';
  const btnH     = sm ? '14px' : lg ? '40px' : '22px';
  const fontSize = sm ? '8px'  : lg ? '14px' : '11px';
  const labelW   = sm ? '10px' : lg ? '22px' : '14px';
  const rowGap   = sm ? '2px'  : lg ? '6px'  : '3px';
  const rowMb    = sm ? '2px'  : lg ? '8px'  : '4px';
  const dotSize  = sm ? '7px'  : lg ? '16px' : '10px';
  const dotPos   = sm ? '3px'  : lg ? '8px'  : '4px';

  return (
    <div
      ref={cardRef}
      className={`bg-white flex flex-col select-none transition-shadow hover:shadow-md`}
      style={{
        borderRadius: '8px',
        border: completed ? '2px solid #6b7280' : '2px solid #e5e7eb',
      }}
    >
      {/* Image area */}
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
            className="w-full h-full object-contain"
            style={{ padding: imgPad }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: '#d1d5db' }}>
            {!sm && (
              <svg
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ width: lg ? '48px' : '28px', height: lg ? '48px' : '28px', marginBottom: '6px' }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1" />
                <path d="M3 9l4-4 4 4 4-4 4 4" strokeWidth="1" strokeLinecap="round" />
              </svg>
            )}
            <span style={{ fontSize, color: '#9ca3af' }}>{logo.id}</span>
          </div>
        )}

        {/* Completion badge */}
        {completed && (
          <div
            className="absolute bg-gray-700 rounded-full flex items-center justify-center"
            style={{ top: dotPos, right: dotPos, width: dotSize, height: dotSize }}
            title="평가 완료"
          >
            {!sm && (
              <svg fill="none" stroke="white" viewBox="0 0 24 24" style={{ width: '60%', height: '60%' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Score panel */}
      <div style={{ padding: wrapPad }}>
        {/* Logo ID – hidden when very small */}
        {!sm && (
          <p
            className="font-mono text-gray-400 text-center"
            style={{ fontSize, marginBottom: lg ? '10px' : '5px', letterSpacing: '0.06em' }}
          >
            {logo.id}
          </p>
        )}

        {/* B row */}
        <div className="flex items-center" style={{ gap: rowGap, marginBottom: rowMb }}>
          <span className="font-bold text-gray-800 shrink-0 text-center" style={{ fontSize, width: labelW }}>B</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'brand_score', n)}
              className={`flex-1 font-semibold rounded transition-colors leading-none
                ${brandScore === n ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'}`}
              style={{ height: btnH, fontSize }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* V row */}
        <div className="flex items-center" style={{ gap: rowGap }}>
          <span className="font-bold text-gray-400 shrink-0 text-center" style={{ fontSize, width: labelW }}>V</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => onRate(logo.id, 'visual_score', n)}
              className={`flex-1 font-semibold rounded transition-colors leading-none
                ${visualScore === n ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 active:bg-gray-300'}`}
              style={{ height: btnH, fontSize }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
