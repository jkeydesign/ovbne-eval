import { useState, useEffect, useCallback, useRef } from 'react';
import IntroScreen from './components/IntroScreen';
import BriefScreen from './components/BriefScreen';
import EliminationScreen from './components/EliminationScreen';
import EliminationReviewScreen from './components/EliminationReviewScreen';
import CriteriaPanel from './components/CriteriaPanel';
import LogoGrid from './components/LogoGrid';
import ImagePreviewModal from './components/ImagePreviewModal';
import ReviewScreen from './components/ReviewScreen';
import ResultSummary from './components/ResultSummary';
import { LOGOS } from './data/logos';
import { buildResponseData, downloadJSON, downloadCSV } from './utils/exportData';
import { save, load } from './utils/storage';
import { isCompleted } from './utils/scoring';

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


export default function App() {
  const [screen, setScreen] = useState('intro');
  const [ratings, setRatings] = useState({});
  const [eliminatedIds, setEliminatedIds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const [cardSize, setCardSize] = useState(180);
  const [timestampElimStart, setTimestampElimStart] = useState(null);
  const [timestampEvalStart, setTimestampEvalStart] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(null);
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

  // Load saved ratings + eliminatedIds
  useEffect(() => {
    const saved = load();
    if (saved?.ratings)      setRatings(saved.ratings);
    if (saved?.eliminatedIds) setEliminatedIds(saved.eliminatedIds);
  }, []);

  // Auto-save ratings + eliminatedIds
  useEffect(() => {
    if (Object.keys(ratings).length > 0 || eliminatedIds.length > 0) {
      save({ participantId, timestampStart, ratings, eliminatedIds });
    }
  }, [ratings, eliminatedIds, participantId, timestampStart]);

  // 27개 평가 대상 로고
  const evaluationLogos = LOGOS.filter(l => !eliminatedIds.includes(l.id));
  const completedCount  = evaluationLogos.filter(l => isCompleted(ratings[l.id])).length;
  const allDone         = completedCount === evaluationLogos.length;

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


  const goToEliminate = () => {
    if (!timestampElimStart) setTimestampElimStart(new Date().toISOString());
    setScreen('eliminate');
  };
  const goToEvaluate = () => {
    if (!timestampEvalStart) setTimestampEvalStart(new Date().toISOString());
    setScreen('evaluate');
  };
  const handleSubmit      = () => setScreen('review');
  const handleFinalSubmit = () => {
    const data = buildResponseData(participantId, ratings, timestampStart, evaluationLogos, eliminatedIds, timestampElimStart, timestampEvalStart);
    setResultData(data);
    setScreen('result');
  };

  if (screen === 'intro') return <IntroScreen onStart={() => setScreen('brief')} />;
  if (screen === 'brief') return <BriefScreen onStart={goToEliminate} onBack={() => setScreen('intro')} />;

  if (screen === 'eliminate') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        {/* PC Sidebar — 평가 화면과 동일 */}
        {sidebarOpen && (
          <>
            <aside
              className="hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-200"
              style={{ width: sidebarWidth }}
            >
              <div className="sticky top-0 h-screen overflow-y-auto flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <CriteriaPanel />
                </div>
              </div>
            </aside>
            <div
              className="hidden lg:block w-1 shrink-0 bg-gray-200 hover:bg-gray-400 transition-colors duration-150"
              style={{ cursor: 'col-resize' }}
              onMouseDown={startResize}
              title="드래그하여 패널 너비 조절"
            />
          </>
        )}
        {/* Mobile 상단 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden sticky top-0 z-20">
            <CriteriaPanel mobile />
          </div>
          <EliminationScreen
            eliminatedIds={eliminatedIds}
            onEliminate={setEliminatedIds}
            onNext={() => setScreen('eliminateReview')}
            onBack={() => setScreen('brief')}
            timestampElimStart={timestampElimStart}
          />
        </div>
      </div>
    );
  }

  if (screen === 'eliminateReview') {
    return (
      <EliminationReviewScreen
        eliminatedIds={eliminatedIds}
        onEliminate={setEliminatedIds}
        onBack={() => setScreen('eliminate')}
        onNext={goToEvaluate}
      />
    );
  }

  if (screen === 'review') {
    return (
      <ReviewScreen
        logos={evaluationLogos}
        ratings={ratings}
        timestampStart={timestampStart}
        timestampElimStart={timestampElimStart}
        timestampEvalStart={timestampEvalStart}
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
        {/* Mobile: criteria + progress */}
        <div className="lg:hidden sticky top-0 z-20">
          <CriteriaPanel mobile />
          <ProgressBar
            completedCount={completedCount}
            total={evaluationLogos.length}
            allDone={allDone}
            onSubmit={handleSubmit}
            onBack={() => setScreen('brief')}
            filter={filter} onFilter={setFilter}
            sort={sort} onSort={setSort}
            cardSize={cardSize} onCardSize={setCardSize}
            logos={evaluationLogos} ratings={ratings}
            timestampElimStart={timestampElimStart}
            timestampEvalStart={timestampEvalStart}
          />
        </div>

        {/* PC: sticky header with progress + controls */}
        <div className="hidden lg:block sticky top-0 z-10">
          <ProgressBar
            completedCount={completedCount}
            total={evaluationLogos.length}
            allDone={allDone}
            onSubmit={handleSubmit}
            onBack={() => setScreen('brief')}
            filter={filter} onFilter={setFilter}
            sort={sort} onSort={setSort}
            cardSize={cardSize} onCardSize={setCardSize}
            logos={evaluationLogos} ratings={ratings}
            timestampElimStart={timestampElimStart}
            timestampEvalStart={timestampEvalStart}
          />
        </div>

        <LogoGrid
          logos={evaluationLogos}
          ratings={ratings}
          filter={filter}
          sort={sort}
          cardSize={cardSize}
          onRate={handleRate}
          onPreview={setPreviewLogo}
        />
      </div>

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

function ProgressBar({ completedCount, total, allDone, onSubmit, onBack,
  filter, onFilter, sort, onSort, cardSize, onCardSize, logos, ratings,
  timestampElimStart, timestampEvalStart }) {
  const pct = (completedCount / total) * 100;

  // 탈락 시작 기준 총 경과 시간 (분, 30초마다 갱신)
  const calcMin = (ts) => ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 60000) : 0;
  const [totalMin, setTotalMin] = useState(() => calcMin(timestampElimStart));
  const [evalMin,  setEvalMin]  = useState(() => calcMin(timestampEvalStart));
  useEffect(() => {
    const tick = () => {
      setTotalMin(calcMin(timestampElimStart));
      setEvalMin(calcMin(timestampEvalStart));
    };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [timestampElimStart, timestampEvalStart]);

  const filteredCount = logos
    ? filter === 'incomplete' ? logos.filter(l => !(ratings[l.id]?.brand_score && ratings[l.id]?.visual_score)).length
    : filter === 'completed'  ? logos.filter(l =>  (ratings[l.id]?.brand_score && ratings[l.id]?.visual_score)).length
    : logos.length
    : total;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 1행: 이전 | 진행 | 제출 */}
      <div className="px-4 py-2.5 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0">
            ← 이전
          </button>
        )}
        <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
          평가 완료: <span className="font-bold text-gray-900">{completedCount}</span>
          <span className="text-gray-400"> / {total}</span>
        </div>
        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-gray-800 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        {timestampElimStart && (
          <div className={`text-xs whitespace-nowrap shrink-0 px-2 py-1 rounded flex flex-col items-end gap-0.5 ${totalMin < 10 ? 'text-amber-600 bg-amber-50' : 'text-gray-400'}`}>
            <span>총 <span className="font-semibold">{totalMin}분</span> 경과
              {totalMin < 10 && <span className="ml-1 text-[10px]">(권장 10분)</span>}
            </span>
            {timestampEvalStart && (
              <span className="text-[10px]">평가 {evalMin}분 / 탈락 {totalMin - evalMin}분</span>
            )}
          </div>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <button onClick={onSubmit} disabled={!allDone}
            title={!allDone ? '아직 평가가 완료되지 않은 로고가 있습니다.' : undefined}
            className={`px-4 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
              allDone ? 'bg-gray-900 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            제출 전 검토
          </button>
          {!allDone && (
            <span className="text-[10px] text-gray-400 whitespace-nowrap">미완료 {total - completedCount}개 남음</span>
          )}
        </div>
      </div>

      {/* 2행: 필터·정렬·슬라이더 (onFilter가 있을 때만) */}
      {onFilter && (
        <div className="px-4 pb-2 flex items-center gap-2 border-t border-gray-100 pt-2">
          {/* 필터 버튼 */}
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => onFilter(f.value)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filter === f.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          {/* 정렬 */}
          <select value={sort} onChange={e => onSort(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 focus:outline-none focus:border-gray-400">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* 카드 크기 슬라이더 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-gray-400 shrink-0">카드 크기</span>
            <input type="range" min="100" max="600" step="10" value={cardSize}
              onChange={e => onCardSize(Number(e.target.value))}
              className="w-28 accent-gray-800 cursor-pointer" />
            <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{cardSize}px</span>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{filteredCount}개 표시 중</span>
        </div>
      )}
    </div>
  );
}
