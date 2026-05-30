const GRID_ITEMS = [
  { label: '업종',     text: '리빙 오브제·홈데코 큐레이션 매장 및 온라인 쇼핑몰' },
  { label: '가격대',   text: '일반 생활용품 브랜드보다 높지만 고가 디자인 편집숍보다는 접근 가능한 미들 프리미엄 가격대. 소형 오브제·문구류는 약 1만~3만 원대, 홈데코 제품은 약 3만~8만 원대 중심으로 구성한다.' },
  { label: '타깃',     text: '25~35세 도시 거주자. 자기 취향과 감도 있는 소비를 중시하며, 과시적 고가 브랜드보다 일상 안에서 세련된 선택을 선호하는 소비자' },
  { label: '톤앤매너', text: '세련되지만 차갑지 않고, 정돈되었지만 지나치게 고급스럽거나 권위적이지 않은 분위기' },
  { label: '개발 방향', text: '브랜드의 취향성과 접근성을 함께 전달하고, 다양한 매체에서 식별 가능하게 사용할 수 있어야 함' },
  { label: '브랜드 개요', text: '일상에서 사용하는 오브제, 문구, 홈데코 제품을 감도 있게 제안하는 신규 라이프스타일 브랜드' },
  { label: '포지셔닝', text: '대중적 소품샵보다 감도 있고, 고가 편집숍보다 접근 가능한 미들 프리미엄 라이프스타일 브랜드. 취향을 가진 도시 생활자의 일상 공간에 자연스럽게 스며드는 오브제 브랜드로 위치시킨다.' },
  { label: '경쟁 맥락', text: '대형 라이프스타일 브랜드, 독립 오브제 브랜드, 온라인 감성 셀렉트숍과 경쟁' },
];

const VALUE_TAGS   = ['일상성', '균형감', '취향성'];
const MEDIA_TAGS   = ['제품 라벨', '패키지 스티커', '쇼핑백', '명함', '웹사이트', 'SNS 프로필', '온라인 배너', '제품 태그', '팝업 부스 사인'];

function InfoCard({ label, text }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}

export default function BriefScreen({ onStart, onBack }) {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">브랜드 브리프</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            로고 시안을 보기 전, 브랜드의 맥락과 판단 기준이 되는 핵심 정보를 먼저 확인해 주세요.
          </p>
        </div>

        {/* 브랜드명 카드 */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">브랜드명</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">오브네 OVBNE</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            OVBNE는 Objet, Value, Balance, New, Everyday의 의미를 결합한 조어로, 일상 오브제가 지닌 가치와 균형 잡힌 생활 감각, 새롭게 감각화된 일상을 의미한다.
          </p>
        </div>

        {/* 2열 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {GRID_ITEMS.map(item => <InfoCard key={item.label} {...item} />)}
        </div>

        {/* 핵심 가치 + 적용 매체 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">핵심 가치</p>
            <div className="flex gap-2 flex-wrap">
              {VALUE_TAGS.map(k => (
                <span key={k} className="px-3 py-1 border border-gray-900 text-gray-900 rounded-full text-sm font-medium">{k}</span>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">적용 매체</p>
            <div className="flex gap-1.5 flex-wrap">
              {MEDIA_TAGS.map(m => (
                <span key={m} className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded-full text-xs">{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="border border-gray-200 bg-white rounded-lg p-4 mb-5 text-sm text-gray-600 leading-relaxed">
          위 내용을 충분히 읽으신 후 평가를 시작해 주세요. 평가 중에도 좌측 패널에서 브리프를 다시 확인할 수 있습니다.
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              ← 이전
            </button>
          )}
          <button
            onClick={onStart}
            className="flex-1 py-3.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            평가 시작하기
          </button>
        </div>

      </div>
    </div>
  );
}
