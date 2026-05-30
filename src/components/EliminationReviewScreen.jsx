import { LOGOS } from '../data/logos';

function MiniCard({ logo, eliminated }) {
  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${
      eliminated ? 'border-red-200' : 'border-green-200'
    }`}>
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        <img
          src={logo.imagePath}
          alt={logo.id}
          className={`w-full h-full object-contain p-1.5 ${eliminated ? 'opacity-40' : ''}`}
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

export default function EliminationReviewScreen({ eliminatedIds, onBack, onNext }) {
  const eliminated = LOGOS.filter(l => eliminatedIds.includes(l.id));
  const passing    = LOGOS.filter(l => !eliminatedIds.includes(l.id));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* 헤더 */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">시안 선별 확인</p>
          <h1 className="text-xl font-semibold text-gray-900">선별 결과를 확인해 주세요</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            탈락 시안 23개와 평가 대상 시안 27개를 확인하고, 이상이 없으면 평가를 시작해 주세요.
          </p>
        </div>

        {/* 탈락 시안 */}
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
            <h2 className="text-sm font-semibold text-red-700">탈락 시안 — {eliminated.length}개</h2>
            <span className="text-xs text-red-300 ml-auto">본실험에서 제외</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {eliminated.map(logo => <MiniCard key={logo.id} logo={logo} eliminated />)}
          </div>
        </div>

        {/* 평가 대상 시안 */}
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            <h2 className="text-sm font-semibold text-green-700">평가 대상 시안 — {passing.length}개</h2>
            <span className="text-xs text-green-400 ml-auto">이 시안들을 평가합니다</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {passing.map(logo => <MiniCard key={logo.id} logo={logo} eliminated={false} />)}
          </div>
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
            className="flex-1 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            평가 시작하기 →
          </button>
        </div>

      </div>
    </div>
  );
}
