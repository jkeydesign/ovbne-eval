import { useState } from 'react';

const CHECKS = [
  '본 예비평가는 본실험 자극 선별을 위한 사전 평가임을 확인했습니다.',
  '본 예비평가에서는 로고 이미지와 브랜드 브리프를 기준으로 평가한다는 점을 확인했습니다.',
  '필요 시 후속 의견 확인 요청을 받을 수 있으며, 후속 인터뷰 참여는 별도 동의 후 선택적으로 진행된다는 점을 확인했습니다.',
];

function Section({ title, items }) {
  return (
    <div>
      <p className="font-semibold text-gray-800 mb-1.5">{title}</p>
      <ul className="space-y-1 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-gray-600">
            <span className="shrink-0 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IntroScreen({ onStart }) {
  const [checked, setChecked] = useState([false, false, false]);
  const allChecked = checked.every(Boolean);
  const toggle = (i) => setChecked(prev => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-lg p-8 sm:p-12">

        {/* 제목 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            OVBNE 브랜드 AI 로고 시안 예비평가
          </h1>
          <div className="w-12 h-px bg-gray-300 mt-4" />
        </div>

        {/* 본문 */}
        <div className="space-y-5 text-sm leading-relaxed text-gray-700 mb-8 border border-blue-200 rounded-md p-5 bg-blue-50">

          <p>예비평가에 참여해 주셔서 감사합니다.</p>

          <p>
            본 예비평가는 박사학위논문 본실험에 사용할 생성형 AI 기반 OVBNE 브랜드 로고 시안 자극을 선별하기 위한 사전 평가입니다.
          </p>

          <p>
            제시되는 로고는 생성형 AI로 제작된 예비 시안입니다. 완벽한 최종 로고를 찾는 것이 아니라,
            50개 시안 중 OVBNE 브랜드 브리프에 상대적으로 적합하고 본실험 자극으로 활용 가능한 로고를 평가하는 절차입니다.
          </p>

          <Section
            title="평가 목적"
            items={[
              'AI 로고 생성 기술의 성능을 평가하는 것이 아닙니다.',
              '로고 시안의 객관적 우열을 판정하는 것이 아닙니다.',
              'OVBNE 브랜드 브리프를 기준으로 각 시안의 브랜드 적합도와 시각 완성도를 확인하는 절차입니다.',
            ]}
          />

          <Section
            title="평가 방법"
            items={[
              '총 50개의 로고 시안을 확인합니다.',
              '각 시안에 대해 2개 항목을 5점 리커트 척도로 평가합니다.',
              '평가 결과는 5명~10명의 전문 예비평가 자료를 종합하여 분석합니다.',
              '평균 점수, 평균 순위, 점수 분포, 평가자 간 일관성을 함께 검토하여 최종 27개 시안과 3개의 실험 세트를 구성합니다.',
            ]}
          />

          <div>
            <p className="font-semibold text-gray-800 mb-2">평가 항목</p>
            <div className="space-y-3 pl-1">
              <div>
                <p className="font-medium text-gray-800">1. 브랜드 종합 적합도</p>
                <p className="text-gray-600">OVBNE의 브랜드 의미, 타깃, 차별성, 적용성, 정체성에 비추어 적합한가?</p>
              </div>
              <div>
                <p className="font-medium text-gray-800">2. 시각 종합 완성도</p>
                <p className="text-gray-600">형태의 자연성, 조화성, 정교성 측면에서 완성도가 있는가?</p>
              </div>
            </div>
          </div>

          <Section
            title="평가 기준"
            items={[
              '본 예비평가에서는 AI 추천, AI 순위, AI 평가 설명이 제공되지 않습니다.',
              '로고 이미지 자체와 브랜드 브리프를 기준으로 판단해 주세요.',
              '전문 디자이너로서의 분석적·전략적 실무 경험을 바탕으로 평가해 주세요.',
            ]}
          />

          <Section
            title="자료 신뢰성 확인"
            items={[
              '평가 완료 시간, 점수 분포, 평가자 간 일관성을 함께 확인합니다.',
              '응답 패턴이 매우 불규칙하거나 기준 적용 의도를 확인할 필요가 있는 경우, 별도 동의 후 후속 의견 확인을 요청드릴 수 있습니다.',
            ]}
          />

        </div>

        {/* 체크박스 */}
        <div className="space-y-3 mb-8">
          {CHECKS.map((label, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-gray-900 cursor-pointer"
              />
              <span className={`text-sm leading-relaxed transition-colors ${checked[i] ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {label}
              </span>
            </label>
          ))}
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={onStart}
          disabled={!allChecked}
          className={`w-full py-3.5 text-sm font-medium rounded-md transition-colors ${
            allChecked
              ? 'bg-gray-900 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {allChecked ? '평가 시작하기 →' : '위 항목을 모두 확인해 주세요'}
        </button>

      </div>
    </div>
  );
}
