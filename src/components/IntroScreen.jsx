import { useState } from 'react';

const CHECKS = [
  '본 예비평가는 본실험 자극 선별을 위한 사전 평가임을 확인했습니다.',
  '본 예비평가에서는 로고 이미지와 브랜드 브리프를 기준으로 평가한다는 점을 확인했습니다.',
  '필요 시 후속 의견 확인 요청을 받을 수 있으며, 후속 인터뷰 참여는 별도 동의 후 선택적으로 진행된다는 점을 확인했습니다.',
];

const SUMMARY_CARDS = [
  {
    title: '평가 대상',
    value: '50개',
    description: 'AI로 생성 및 제작된 OVBNE 브랜드 로고 시안',
  },
  {
    title: '평가 항목',
    value: '2개',
    description: '브랜드 종합 적합도, 시각 종합 완성도',
  },
  {
    title: '권장 시간',
    value: '10분+',
    description: '탈락 선별 5분, 로고 평가 5분 이상',
  },
];

const PURPOSE_ITEMS = [
  'AI 로고 생성 기술의 성능을 평가하는 것이 아닙니다.',
  '로고 시안의 객관적 우열을 판정하는 것이 아닙니다.',
  'OVBNE 브랜드 기준으로 시안의 브랜드 적합도와 시각 완성도를 확인하는 절차입니다.',
];

const METHOD_ITEMS = [
  '총 50개의 로고 시안을 확인합니다.',
  '각 시안에 대해 2개 항목을 5점 리커트 척도로 평가합니다.',
  '평가 결과는 5명~10명의 전문 예비평가 자료를 종합하여 분석합니다.',
  '평균 점수, 순위, 점수 분포, 평가자 간 일관성을 검토해 최종 실험 자극을 구성합니다.',
];

const STANDARD_ITEMS = [
  'AI 추천, AI 순위, AI 평가 설명은 제공되지 않습니다.',
  '로고 이미지 자체와 브랜드 브리프를 기준으로 판단해 주세요.',
  '전문 디자이너로서의 분석적, 전략적 실무 경험을 바탕으로 평가해 주세요.',
];

const RELIABILITY_ITEMS = [
  '평가 완료 시간, 점수 분포, 평가자 간 일관성을 함께 확인합니다.',
  '응답 패턴이 매우 불규칙하거나 기준 적용 확인이 필요한 경우, 별도 동의 후 후속 의견 확인을 요청드릴 수 있습니다.',
];

function BulletList({ items, tone = 'slate' }) {
  const dotClass = tone === 'blue' ? 'bg-blue-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-slate-500';

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function IntroScreen({ onStart }) {
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked((prev) => prev.map((value, index) => (index === i ? !value : value)));

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OVBNE Logo Evaluation</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              OVBNE 브랜드 AI 로고 시안 예비평가
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              박사학위논문 본실험에 사용할 생성형 AI 기반 OVBNE 브랜드 로고 시안 자극을 선별하기 위한 사전 평가입니다.
              본 화면에서는 평가 목적과 기준을 확인한 뒤 예비평가를 시작합니다.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">진행 요약</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SUMMARY_CARDS.map((card) => (
                <div key={card.title} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-medium text-slate-500">{card.title}</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm leading-6 text-slate-700">
                제시되는 로고는 완벽한 최종 로고를 찾기 위한 결과물이 아니라, 본실험 자극으로 활용 가능한 시안을 선별하기 위한
                예비 시안입니다. 50개 시안 중 OVBNE 브랜드 브리프에 상대적으로 적합하고 시각적으로 활용 가능한 로고를
                평가해 주세요.
              </p>
            </section>

            <div className="grid gap-5 xl:grid-cols-3">
              <InfoSection title="평가 목적">
                <BulletList items={PURPOSE_ITEMS} tone="blue" />
              </InfoSection>

              <InfoSection title="평가 방법">
                <BulletList items={METHOD_ITEMS} />
              </InfoSection>

              <InfoSection title="평가 기준">
                <BulletList items={STANDARD_ITEMS} />
              </InfoSection>
            </div>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
              <InfoSection title="평가 항목">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">1. 브랜드 종합 적합도</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      OVBNE의 브랜드 의미, 타깃, 차별성, 적용성, 정체성에 비추어 적합한가?
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">2. 시각 종합 완성도</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      형태의 자연성, 조화성, 정교성 측면에서 완성도가 있는가?
                    </p>
                  </div>
                </div>
              </InfoSection>

              <InfoSection title="자료 신뢰성 확인">
                <BulletList items={RELIABILITY_ITEMS} />
              </InfoSection>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-base font-semibold text-amber-950">최소 소요 시간 안내</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                  <li>
                    탈락 시안 선별 단계: <strong>최소 5분</strong>
                  </li>
                  <li>
                    로고 시안 평가 단계: <strong>최소 5분</strong>
                  </li>
                  <li>
                    전체 최소 소요 권장: <strong>10분 이상</strong>
                  </li>
                </ul>
                <p className="mt-3 text-xs leading-5 text-amber-700">
                  소요 시간은 각 화면 상단에 실시간으로 표시됩니다.
                </p>
              </div>
            </section>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Before Start</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">확인 후 시작</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                아래 세 항목을 확인하면 예비평가를 시작할 수 있습니다.
              </p>
            </div>

            <div className="my-5 space-y-3">
              {CHECKS.map((label, index) => (
                <label
                  key={label}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    checked[index]
                      ? 'border-slate-300 bg-slate-50 text-slate-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked[index]}
                    onChange={() => toggle(index)}
                    className="mt-1 h-4 w-4 shrink-0 accent-slate-900"
                  />
                  <span className="text-sm leading-6">{label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={onStart}
              disabled={!allChecked}
              className={`w-full rounded-lg py-3 text-sm font-semibold transition-colors ${
                allChecked
                  ? 'bg-slate-950 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              }`}
            >
              {allChecked ? '평가 시작하기' : '확인 항목을 모두 체크해 주세요'}
            </button>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              평가 중에는 화면 상단의 진행률과 경과 시간을 확인할 수 있습니다.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
