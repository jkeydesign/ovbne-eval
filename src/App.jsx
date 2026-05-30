import { useState, useEffect, useCallback, useRef } from 'react';
import IntroScreen from './components/IntroScreen';
import BriefScreen from './components/BriefScreen';
import CriteriaPanel from './components/CriteriaPanel';
import LogoGrid from './components/LogoGrid';
import ImagePreviewModal from './components/ImagePreviewModal';
import ReviewScreen from './components/ReviewScreen';
import ResultSummary from './components/ResultSummary';
import { LOGOS } from './data/logos';
import { buildResponseData, downloadJSON, downloadCSV } from './utils/exportData';
import { save, load } from './utils/storage';
import { getCompletedCount } from './utils/scoring';

function generateId() {
  return 'xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  ) + '-' + Date.now().toString(36);
}

function calcPreviewPos(rect) {
  const W = 260;
  const H = 280;
  let left = rect.right + 10;
  if (left + W > window.innerWidth - 8) {
    left = rect.left - W - 10;
  }
  left = Math.max(8, left);
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - H - 8));
  return { top, left };
}

function HoverPreview({ logo, pos }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-3 pointer-events-none"
      style={{ top: pos.top, left: pos.left, width: 260 }}
    >
      <div className="w-full aspect-square bg-gray-50 rounded flex items-center justify-center overflow-hidden mb-2">
        {!imgError ? (
          <img
            src={logo.imagePath}
            alt={logo.id}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-3"
          />
        ) : (
          <span className="text-gray-300 text-sm">{logo.id}</span>
        )}
      </div>
      <p className="text-center text-xs font-mono text-gray-500">{logo.id}</p>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('intro');
  const [ratings, setRatings] = useState({});
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [previewLogo, setPreviewLogo] = useState(null);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [resultData, setResultData] = useState(null);
  const sidebarOpen = true;
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(0);

  const startResize = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartW.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current) return;
      const newW = Math.max(160, Math.min(window.innerWidth - 250, resizeStartW.current + e.clientX - resizeStartX.current));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const [participantId] = useState(generateId);
  const [timestampStart] = useState(() => new Date().toISOString());

  // Load saved ratings
  useEffect(() => {
    const saved = load();
    if (saved?.ratings) setRatings(saved.ratings);
  }, []);

  // Auto-save ratings
  useEffect(() => {
    if (Object.keys(ratings).length > 0) {
      save({ participantId, timestampStart, ratings });
    }
  }, [ratings, participantId, timestampStart]);

  const completedCount = getCompletedCount(ratings);
  const allDone = completedCount === LOGOS.length;

  const handleRate = useCallback((logoId, field, score) => {
    setRatings(prev => ({
      ...prev,
      [logoId]: {
        ...prev[logoId],
        [field]: score,
        updated_at: new Date().toISOString(),
      },
    }));
  }, []);

  const handleHover = useCallback((logo, rect) => {
    const pos = calcPreviewPos(rect);
    setHoverPreview({ logo, pos });
  }, []);

  const handleHoverEnd = useCallback(() => {
    setHoverPreview(null);
  }, []);

  // 검토 화면으로 이동
  const handleSubmit = () => {
    setScreen('review');
  };

  // 검토 화면에서 최종 제출
  const handleFinalSubmit = () => {
    const data = buildResponseData(participantId, ratings, timestampStart);
    setResultData(data);
    setScreen('result');
  };

  if (screen === 'intro') {
    return <IntroScreen onStart={() => setScreen('brief')} />;
  }

  if (screen === 'brief') {
    return <BriefScreen onStart={() => setScreen('evaluate')} onBack={() => setScreen('intro')} />;
  }

  if (screen === 'review') {
    return (
      <ReviewScreen
        ratings={ratings}
        timestampStart={timestampStart}
        onBack={() => setScreen('evaluate')}
        onSubmit={handleFinalSubmit}
      />
    );
  }

  if (screen === 'result') {
    return (
      <ResultSummary
        data={resultData}
        onDownloadJSON={() => downloadJSON(resultData)}
        onDownloadCSV={() => downloadCSV(resultData)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* PC Sidebar */}
      {sidebarOpen && (
        <>
          <aside
            className="hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-200"
            style={{ width: sidebarWidth }}
          >
            <div className="sticky top-0 h-screen overflow-y-auto flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 tracking-widest uppercase">평가 참고 기준</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CriteriaPanel />
              </div>
            </div>
          </aside>
          {/* Resizer handle */}
          <div
            className="hidden lg:block w-1 shrink-0 bg-gray-200 hover:bg-gray-400 transition-colors duration-150"
            style={{ cursor: 'col-resize' }}
            onMouseDown={startResize}
            title="드래그하여 패널 너비 조절"
          />
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile/Tablet: sticky header with criteria + progress */}
        <div className="lg:hidden sticky top-0 z-20">
          <CriteriaPanel mobile />
          <ProgressBar
            completedCount={completedCount}
            total={LOGOS.length}
            allDone={allDone}
            onSubmit={handleSubmit}
            sidebarOpen={false}
            onShowSidebar={null}
            onBack={() => setScreen('brief')}
          />
        </div>

        {/* PC: sticky progress bar only */}
        <div className="hidden lg:block sticky top-0 z-10">
          <ProgressBar
            completedCount={completedCount}
            total={LOGOS.length}
            allDone={allDone}
            onSubmit={handleSubmit}
            onBack={() => setScreen('brief')}
          />
        </div>

        <LogoGrid
          logos={LOGOS}
          ratings={ratings}
          filter={filter}
          sort={sort}
          onFilter={setFilter}
          onSort={setSort}
          onRate={handleRate}
          onPreview={setPreviewLogo}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
        />
      </div>

      {/* PC hover preview */}
      {hoverPreview && (
        <HoverPreview logo={hoverPreview.logo} pos={hoverPreview.pos} />
      )}

      {/* Mobile modal */}
      {previewLogo && (
        <ImagePreviewModal
          logo={previewLogo}
          onClose={() => setPreviewLogo(null)}
        />
      )}
    </div>
  );
}

function ProgressBar({ completedCount, total, allDone, onSubmit, onBack }) {
  const pct = (completedCount / total) * 100;
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-700 whitespace-nowrap flex items-center gap-1 shrink-0"
          title="브랜드 브리프로 돌아가기"
        >
          ← 브리프
        </button>
      )}
      <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
        평가 완료:{' '}
        <span className="font-bold text-gray-900">{completedCount}</span>
        <span className="text-gray-400"> / {total}</span>
      </div>
      <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gray-800 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <button
          onClick={onSubmit}
          disabled={!allDone}
          title={!allDone ? '아직 평가가 완료되지 않은 로고가 있습니다. 미완료 로고를 확인한 뒤 제출해 주세요.' : undefined}
          className={`px-4 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
            allDone
              ? 'bg-gray-900 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          제출 전 검토
        </button>
        {!allDone && (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">미완료 {total - completedCount}개 남음</span>
        )}
      </div>
    </div>
  );
}
