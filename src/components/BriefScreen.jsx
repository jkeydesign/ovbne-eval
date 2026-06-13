const BRIEF_BLOCKS = [
  {
    title: '브랜드명',
    value: '오브네 OVBNE',
    description:
      'OVBNE는 Objet, Value, Balance, New, Everyday의 의미를 결합한 조어로, 일상 오브제가 지닌 가치와 균형 잡힌 생활 감각, 새롭게 감각화된 일상을 의미합니다.',
  },
  {
    title: '업종',
    value: '리빙 오브제 · 홈데코 큐레이션 매장 및 온라인 쇼핑몰',
    description: '일상에서 사용하는 오브제, 문구, 홈데코 제품을 감도 있게 제안하는 신규 라이프스타일 브랜드입니다.',
  },
  {
    title: '타깃',
    value: '25~35세 도시 거주자',
    description:
      '자기 취향과 감도 있는 소비를 중시하며, 과시적 고가 브랜드보다 일상 안에서 세련된 선택을 선호하는 소비자입니다.',
  },
  {
    title: '포지셔닝',
    value: '미들 프리미엄 라이프스타일 브랜드',
    description:
      '대중적 소품샵보다 감도 있고, 고가 편집숍보다 접근 가능한 브랜드로, 취향을 가진 도시 생활자의 일상 공간에 자연스럽게 스며드는 오브제 브랜드를 지향합니다.',
  },
];

const VALUE_TAGS = ['일상성', '균형감', '취향성'];

const MEDIA_TAGS = [
  '제품 라벨',
  '패키지 스티커',
  '쇼핑몰',
  '명함',
  '웹사이트',
  'SNS 프로필',
  '온라인 배너',
  '제품 태그',
  '팝업 부스 사인',
];

function BriefCard({ title, value, description }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      <p className="mt-3 text-lg font-bold leading-7 text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </section>
  );
}

function TagList({ items, variant = 'default' }) {
  const className =
    variant === 'value'
      ? 'border-blue-100 bg-blue-50 text-slate-800'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function BriefScreen({ onStart, onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
        <header className="max-w-5xl">
          <h1 className="text-4xl font-bold leading-tight text-slate-950">OVBNE 브랜드 브리프</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            아래 정보는 50개 후보 시안이 OVBNE 브랜드 맥락에서 본실험 자극으로 사용 가능한지 판단하기 위한 참고 기준입니다. 평가자는 최종 로고의 우열을 판단하기보다, 각 시안이 브랜드 맥락과 최소한의 관련성을 갖는지 확인해 주세요.
          </p>
        </header>

        <main className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {BRIEF_BLOCKS.map((item) => (
              <BriefCard key={item.title} {...item} />
            ))}

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-bold text-slate-950">핵심 가치</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">후보 시안 검토 시 참고할 브랜드 가치 키워드입니다.</p>
              <div className="mt-4">
                <TagList items={VALUE_TAGS} variant="value" />
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-bold text-slate-950">적용 매체</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">후보 시안이 기본적으로 활용될 수 있는 매체 범위입니다.</p>
              <div className="mt-4">
                <TagList items={MEDIA_TAGS} />
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-slate-200 bg-slate-100/70 p-5">
            <h2 className="text-sm font-bold text-slate-950">경쟁 맥락 참고</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              OVBNE는 대형 라이프스타일 브랜드, 독립 오브제 브랜드, 온라인 감성 셀렉트숍과 경쟁하는 신규 브랜드로 설정됩니다. 본 예비평가에서는 특정 경쟁 브랜드와의 직접 비교가 아니라, 각 시안이 OVBNE 브랜드 맥락에서 과도하게 다른 업종으로 오독되지 않는지를 확인합니다.
            </p>
          </section>

          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              브랜드 브리프는 이후 모든 후보 시안을 검토할 때 동일하게 적용되는 참고 기준입니다.
            </p>
            <div className="flex gap-3 sm:shrink-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  이전
                </button>
              )}
              <button
                onClick={onStart}
                className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                브리프 확인 후 후보 시안 검토로 이동
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
