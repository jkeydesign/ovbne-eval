import { useState } from 'react';

const CHECKS = [
  '본 예비평가는 최종 로고 선정이 아니라 본실험 자극 선별 절차임을 확인했습니다.',
  '50개 후보 시안은 OVBNE 브랜드 브리프와 시각 형식 기준에 따라 검토해야 함을 확인했습니다.',
  '평가 결과는 27개 본실험 시안과 세트 구성을 위한 기준 자료로 활용됨을 확인했습니다.',
];

const SUMMARY_CARDS = [
  {
    title: '예비 후보',
    value: '50개',
    description: '공통 조건으로 생성된 OVBNE AI 로고 후보 시안',
  },
  {
    title: '최종 목표',
    value: '27개',
    description: '본실험 자극으로 사용할 후보 시안',
  },
  {
    title: '최소 시간',
    value: '10분 이상',
    description: '탈락 선별 5분, 잔여 시안 평가 5분 이상',
  },
];

const PURPOSE_ITEMS = [
  'AI 로고 생성 기술의 성능을 평가하는 것이 아닙니다.',
  '로고 시안의 최종 우열이나 실제 브랜드 적용 가능성을 판정하는 절차가 아닙니다.',
  '본실험에 사용할 27개 로고 시안 자극을 선별하고, 조건 간 비교가 가능한 시안 세트를 구성하기 위한 절차입니다.',
];

const FLOW_ITEMS = [
  '1단계. OVBNE 브랜드 브리프 확인',
  '2단계. 50개 후보 시안 검토',
  '3단계. 본실험 자극으로 사용하기 어려운 시안 탈락 표시',
  '4단계. 잔여 시안의 브랜드 맥락 적정성과 시각 형식 적정성 평가',
  '5단계. 최종 27개 시안 및 세트 구성을 위한 결과 제출',
];

const STANDARD_ITEMS = [
  'AI 추천, AI 순위, AI 평가 설명은 제공되지 않습니다.',
  '평가는 OVBNE 브랜드 브리프와 로고 시안의 시각 형식을 기준으로 진행합니다.',
  '본실험 자극으로 사용하기 어려운 명백한 부적합 시안을 우선 확인합니다.',
  '이후 잔여 시안은 브랜드 맥락 적정성과 시각 형식 적정성을 기준으로 점수화합니다.',
];

function BulletList({ items, tone = 'slate' }) {
  const dotClass = tone === 'blue' ? 'bg-blue-500' : 'bg-slate-500';

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-6 text-slate-700">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ProcessList({ items }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item) => {
        const [step, text] = item.split('. ');
        return (
          <li key={item} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold text-slate-950">{step}</span>
            <span>{text}</span>
          </li>
        );
      })}
    </ol>
  );
}

function InfoSection({ title, children, featured = false }) {
  return (
    <section
      className={`rounded-lg border p-6 ${
        featured
          ? 'border-blue-200 bg-blue-50/80'
          : 'border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
      }`}
    >
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function IntroScreen({ onStart }) {
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked((prev) => prev.map((value, index) => (index === i ? !value : value)));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8">
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <h1 className="max-w-5xl text-4xl font-bold leading-tight text-slate-950">
              OVBNE AI 로고 후보 시안 예비평가
            </h1>
            <p className="mt-5 max-w-5xl text-base leading-7 text-slate-600">
              박사학위논문 본실험에 사용할 OVBNE 브랜드 AI 로고 후보 시안을 선별하기 위한 사전 평가입니다. 본 평가는 최종 로고를 선정하거나 AI 로고 생성 기술의 성능을 평가하기 위한 절차가 아니라, 본실험에 투입할 수 있는 로고 시안 자극을 구성하기 위한 절차입니다.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-bold text-slate-950">진행 요약</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {SUMMARY_CARDS.map((card) => (
                <div key={card.title} className="rounded-lg bg-slate-50 p-3" title={card.description}>
                  <p className="text-[11px] font-semibold text-slate-500">{card.title}</p>
                  <p className="mt-1 whitespace-nowrap text-lg font-bold text-slate-950">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
          <div className="space-y-6">
            <InfoSection title="예비평가 안내" featured>
              <p className="max-w-5xl text-base leading-7 text-slate-700">
                제시되는 50개 후보 시안은 동일한 OVBNE 브랜드 브리프와 공통 생성 조건을 바탕으로 생성된 예비 후보입니다. 평가 결과는 50개 후보 중 본실험에 사용할 27개 시안을 선별하고, 이후 세 개의 시안 세트를 구성하는 기준 자료로 활용됩니다.
              </p>
            </InfoSection>

            <div className="grid gap-6 xl:grid-cols-3">
              <InfoSection title="예비평가 목적">
                <BulletList items={PURPOSE_ITEMS} tone="blue" />
              </InfoSection>

              <InfoSection title="진행 구조">
                <ProcessList items={FLOW_ITEMS} />
              </InfoSection>

              <InfoSection title="평가 기준">
                <BulletList items={STANDARD_ITEMS} />
              </InfoSection>
            </div>

            <section className="rounded-lg border border-slate-200 bg-slate-100/70 p-5">
              <h2 className="text-base font-bold text-slate-950">평가 항목</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">B. 브랜드 맥락 적정성</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">이 시안은 OVBNE 브랜드 브리프와 관련성이 있는가?</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">V. 시각 형식 적정성</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">이 시안은 로고 후보 자극으로 판단 가능한 시각 형식을 갖추고 있는가?</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:sticky lg:top-10">
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-xl font-bold text-slate-950">확인 후 시작</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                아래 내용을 확인한 뒤 예비평가를 시작할 수 있습니다.
              </p>
            </div>

            <div className="my-6 space-y-3">
              {CHECKS.map((label, index) => (
                <label
                  key={label}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
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
              className={`w-full rounded-lg py-3.5 text-sm font-bold transition-colors ${
                allChecked
                  ? 'bg-slate-950 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              }`}
            >
              {allChecked ? '예비평가 시작' : '확인 항목을 모두 체크해 주세요'}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
