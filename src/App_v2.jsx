    const firebaseConfig = {
      apiKey: "AIzaSyDl_O6dQuLzZ2gtt4Yt1Q4D52Rq882nQm8",
      authDomain: "ovbne-eval-74bb6.firebaseapp.com",
      projectId: "ovbne-eval-74bb6",
      storageBucket: "ovbne-eval-74bb6.firebasestorage.app",
      messagingSenderId: "1008961053289",
      appId: "1:1008961053289:web:96fec8c68f3705e03ab8f8"
    };
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    /** @jsxRuntime classic */
    const { useState, useEffect, useCallback, useRef, useMemo } = React;

    /* ─── 상수 & 가중치 ───────────────────────────────────── */
    const BRAND_WEIGHT = 0.6;
    const VISUAL_WEIGHT = 0.4;

    const PRE_EVAL_GROUPS = ['A', 'B', 'C'];
    const PRE_EVAL_GROUP_SIZE = 16;
    const PRE_EVAL_EXCLUDE_PER_GROUP = 7;
    const PRE_EVAL_TOTAL_EXCLUDE = PRE_EVAL_GROUPS.length * PRE_EVAL_EXCLUDE_PER_GROUP;
    const PRE_EVAL_TOTAL_KEEP = PRE_EVAL_GROUPS.length * (PRE_EVAL_GROUP_SIZE - PRE_EVAL_EXCLUDE_PER_GROUP);
    const CONDITION_TYPES = ['시안 제시형', '추천 제시형', '평가 순위 제시형'];

    const TYPE_RULES = {
      A: { code: 'A', title: 'A 구상 암시형', typeName: '구상 암시형', total: 16, exclude: 7, keep: 9 },
      B: { code: 'B', title: 'B 기하학적 추상형', typeName: '기하학적 추상형', total: 16, exclude: 7, keep: 9 },
      C: { code: 'C', title: 'C 유기적 추상형', typeName: '유기적 추상형', total: 16, exclude: 7, keep: 9 },
    };
    const TYPE_ORDER = ['A', 'B', 'C'];

    function getPublicBasePath() {
      let path = window.location.pathname;
      if (!path.endsWith('/')) {
        path = path.replace(/[^/]*$/, '');
      }
      path = path.replace(/visual-rating\/admin2\/$/, '');
      path = path.replace(/visual-rating\/$/, '');
      path = path.replace(/admin\/$/, '');
      return path;
    }
    function publicAssetPath(path) {
      return `${getPublicBasePath()}${path.replace(/^\//, '')}`;
    }
    function parseCsv(text) {
      const rows = text.trim().split(/\r?\n/).map(line => line.split(',').map(cell => cell.replace(/^\uFEFF/, '').trim()));
      const header = rows.shift();
      return rows.map(row => Object.fromEntries(header.map((key, index) => [key, row[index] ?? ''])));
    }
    async function loadCandidateManifest() {
      const records = PRE_EVAL_GROUPS.flatMap((preEvalGroup, groupIndex) =>
        Array.from({ length: PRE_EVAL_GROUP_SIZE }, (_, index) => {
          const localStimulusCode = `L_${String(index + 1).padStart(2, '0')}`;
          const stimulusId = `${preEvalGroup}_${localStimulusCode}`;
          const displayCode = `${preEvalGroup}${String(index + 1).padStart(2, '0')}`;
          return {
            id: stimulusId,
            stimulusId,
            candidateId: displayCode,
            displayCode,
            preEvalGroup,
            localStimulusCode,
            typeCode: preEvalGroup,
            typeName: TYPE_RULES[preEvalGroup].typeName,
            sortOrder: groupIndex * PRE_EVAL_GROUP_SIZE + index + 1,
            mode: 'preEvaluation',
            isActive: true,
            conditionType: null,
            imagePath: publicAssetPath(`/public/logos/pre-eval/${preEvalGroup}/${localStimulusCode}.png`),
          };
        })
      );
      const counts = records.reduce((acc, logo) => {
        acc[logo.preEvalGroup] = (acc[logo.preEvalGroup] || 0) + 1;
        return acc;
      }, {});
      const isValid = records.length === 48
        && PRE_EVAL_GROUPS.every(group => counts[group] === PRE_EVAL_GROUP_SIZE)
        && new Set(records.map(logo => logo.stimulusId)).size === 48;
      if (!isValid) throw new Error(`Pre-evaluation candidate mismatch: ${JSON.stringify(counts)} total ${records.length}`);
      return records;
    }

    function groupByType(logos) {
      return TYPE_ORDER.reduce((acc, code) => {
        acc[code] = logos.filter(logo => logo.typeCode === code).sort((a, b) => a.sortOrder - b.sortOrder);
        return acc;
      }, {});
    }


    /* ─── 유틸 함수 ───────────────────────────────────────── */
    function calcTotalScore(b, v) {
      return Math.round((b * BRAND_WEIGHT + v * VISUAL_WEIGHT) * 100) / 100;
    }
    function isCompleted(r) { return !!(r?.brand_score && r?.visual_score); }
    function generateId() {
      return 'xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)) + '-' + Date.now().toString(36);
    }

    const STORAGE_KEY = 'ovbne_pre_eval_v2';
    const saveData = d => {
      try {
        const prev = sessionStorage.getItem(STORAGE_KEY);
        const base = prev ? JSON.parse(prev) : {};
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, ...d }));
      } catch {}
    };
    const loadData = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        const r = sessionStorage.getItem(STORAGE_KEY);
        return r ? JSON.parse(r) : null;
      } catch {
        return null;
      }
    };

    function buildScreeningResponse(pid, tsStart, evaluationLogos, eliminatedIds, qualification, basicInfo, actionEvents = []) {
      const actualId = (basicInfo.evaluatorCode || "").trim() || pid;
      return {
        mode: "screening",
        evaluatorCode: actualId,
        basicInfo: basicInfo,
        evaluatorProfile: {
          evaluatorCode: actualId,
          ageGroup: basicInfo.ageGroup || "",
          workField: basicInfo.mainField || basicInfo.workField || "",
          designCareer: basicInfo.designExperience || basicInfo.designCareer || "",
          logoCareer: basicInfo.brandProjectExperience || basicInfo.logoCareer || "",
          recentBrandProject: basicInfo.recentProjectExp || basicInfo.recentBrandProject || "",
          aiToolExperience: basicInfo.aiToolExperience || ""
        },
        contactProfile: basicInfo.incentiveConsent ? {
          evaluatorCode: actualId,
          name: basicInfo.name || basicInfo.evaluatorCode || "",
          email: basicInfo.incentiveEmail || basicInfo.email || "",
          phone: basicInfo.incentivePhone || basicInfo.phone || "",
          portfolioUrl: basicInfo.portfolioUrl || "",
          contactConsent: basicInfo.incentiveConsent
        } : undefined,
        layer1Responses: evaluationLogos.map(l => ({
          evaluatorCode: actualId,
          stimulusId: l.id,
          typeGroup: l.typeCode,
          excludeSelected: eliminatedIds.includes(l.id),
          excludeReason: "",
          timestamp: new Date().toISOString()
        })),
        selectedCandidateIds: evaluationLogos.filter(l => !eliminatedIds.includes(l.id)).map(l => l.id).sort(),
        excludedCandidateIds: [...eliminatedIds].sort(),
        submittedAt: new Date().toISOString(),
        completionStatus: "completed",
        actionEvents: actionEvents
      };
    }

    function buildVisualRatingResponse(pid, tsStart, selectedCandidateIds, dimensionRatings, qualification, basicInfo) {
      return {
        mode: "visual-rating",
        evaluatorCode: pid,
        basicInfo: basicInfo,
        evaluatorProfile: {
          evaluatorCode: pid,
          ageGroup: basicInfo.ageGroup || "",
          workField: basicInfo.mainField || basicInfo.workField || "",
          designCareer: basicInfo.designExperience || basicInfo.designCareer || "",
          logoCareer: basicInfo.brandProjectExperience || basicInfo.logoCareer || "",
          recentBrandProject: basicInfo.recentProjectExp || basicInfo.recentBrandProject || "",
          aiToolExperience: basicInfo.aiToolExperience || ""
        },
        contactProfile: basicInfo.incentiveConsent ? {
          evaluatorCode: pid,
          name: basicInfo.name || basicInfo.evaluatorCode || "",
          email: basicInfo.incentiveEmail || basicInfo.email || "",
          phone: basicInfo.incentivePhone || basicInfo.phone || "",
          portfolioUrl: basicInfo.portfolioUrl || "",
          contactConsent: basicInfo.incentiveConsent
        } : undefined,
        selectedCandidateIds: selectedCandidateIds,
        layer2Responses: dimensionRatings.map(r => ({
          evaluatorCode: pid,
          stimulusId: r.stimulusId,
          typeGroup: r.typeCode,
          naturalnessScore: r.naturalness,
          harmonyScore: r.harmony,
          elaboratenessScore: r.refinement,
          timestamp: new Date().toISOString()
        })),
        submittedAt: new Date().toISOString(),
        completionStatus: "completed"
      };
    }

    function triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    const downloadJSON = (data, prefix) => triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `pre_eval_${prefix}_${data.evaluatorCode}_${new Date().getTime()}.json`);

    /* ─── IntroScreen ─────────────────────────────────────── */
    const INTRO_CHECKS_SCREENING = [
      '본 예비평가는 완성된 로고 선정이 아니라 본실험의 자극 구성을 위한 절차임을 확인했습니다.',
      '48개 시안은 AI가 생성한 로고 시안임을 확인했습니다.',
      '본실험에 사용하기 어려운 시안을 제외하겠습니다.',
    ];
    const INTRO_CHECKS_VR = [
      '본 평가는 완성된 로고 선정이 아니라 본실험의 자극 구성을 위한 절차임을 확인했습니다.',
      '자연성·조화성·정교성 평가는 시안의 시각적 특성을 파악하기 위한 평가임을 확인했습니다.',
    ];

    function IntroScreen({ mode, onStart }) {
      const isVR = mode === 'visual-rating';
      const checks = isVR ? INTRO_CHECKS_VR : INTRO_CHECKS_SCREENING;
      const [checked, setChecked] = useState(() => checks.map(() => false));
      const allChecked = checked.every(Boolean);
      const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));

      const processItems = isVR ? [
        '1단계: 브랜드 브리프 확인 (중요)',
        '2단계: 27개 시안별 자연성·조화성·정교성 평가',
        '3단계: 실험자 기본 정보 확인 및 제출',
      ] : [
        '1단계: 예비평가자 자격 확인',
        '2단계: 브랜드 브리프 확인 (중요)',
        '3단계: 48개 AI 로고 예비시안 확인',
        '4단계: 실험에 사용하기 어려운 21개 시안 제외',
        '5단계: 실험자 기본 정보 확인 및 제출',
      ];
      
      const cautions = isVR ? [
        '가장 좋아 보이는 로고를 고르는 절차가 아닙니다.',
        '시각체계(자연성·조화성·정교성) 점수를 평가해 주세요.',
        '각 차원별 의미를 숙지하시고 직관적으로 1~5점을 매겨주세요.',
        '자연성·조화성·정교성 점수를 위해 꼭 내용을 숙지하시고 평가해 주세요.'
      ] : [
        '가장 좋아 보이는 로고를 고르는 절차가 아닙니다.',
        '본실험에서 비교·판단 가능한 시안 퀄리티인지 검토해 주세요.',
        '브랜드 맥락과 현저히 맞지 않는 시안은 제외해 주세요.',
        '다른 업종으로 오독되는 시안은 제외해 주세요.',
        '로고의 기본 형식으로 보기 어려운 시안은 제외해 주세요.',
        '형태가 깨졌거나 식별이 어려울 것 같은 시안은 제외해 주세요.',
      ];

      const GuideSection = ({ title, children }) => (
        <section>
          <h2 className="mb-2.5 text-[18px] font-extrabold leading-7 text-[#111111]">[{title}]</h2>
          {children}
        </section>
      );

      return (
        <main className="min-h-screen bg-white px-4 py-10 text-[#111111]">
          <div className="mx-auto py-[46px]" style={{width:'min(1120px, 92vw)'}}>
            <header className="mb-[52px] text-center">
              <h1 className="mb-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#111111]">
                OVBNE 로고 예비시안 {isVR ? '2차 시각체계 평정' : '1차 선별 평가'}
              </h1>
            </header>

            <div className="mx-auto grid max-w-[820px] gap-[34px] text-[16px] leading-[1.85] text-gray-800">
              <section className="grid gap-3.5">
                <p>안녕하십니까? 바쁘신 중에도 본 예비평가에 참여해 주셔서 감사합니다.</p>

                <p>
                  AI로 생성된 로고 시안은 빠르게 많아지고 있지만,
                  여전히 실무 전문가의 시각적 판단이 필요하다는 취지의 연구를 하고 있습니다.
                </p>

                {isVR ? (
                  <p>
                    따라서 본 평가는 1차 선별된 27개의 후보 시안에 대해 자연성, 조화성, 정교성 등 시각체계 점수를 수집하기 위한 2차 평가 과정입니다.
                  </p>
                ) : (
                  <p>
                    따라서 본 예비평가는 AI가 생성한 48개의 로고 시안들 가운데
                    본실험에 사용할 수 있는 후보 시안 27개를 선별하기 위한 1차 평가 과정입니다.
                  </p>
                )}

                <p>
                  완성된 로고를 고르는 평가는 아닙니다.<br />
                  AI 로고 생성 기술을 검증하는 평가도 아닙니다.
                </p>

                <p>
                  전문가님의 판단은 AI 시대에 전문 디자이너의 판단 기준과 역할을 이해하는 데 중요한 자료가 됩니다.<br />
                  제시되는 아래의 설명을 차분히 검토해 주시기 바랍니다.
                </p>

                <p className="font-semibold text-[#111111] mt-2">
                  ※ {isVR ? '본평가' : '예비평가'} 실험을 제출해 주신 분들 중 자격 확인 후 상품권을 지급해드립니다.
                </p>

                <p>감사합니다.</p>
              </section>

              <GuideSection title="연구 기본 정보">
                <dl className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)]">
                    <dt className="font-bold text-[#111111]">연구명</dt>
                    <dd>생성형 AI 기반 브랜드 로고 시안에서 AI 정보 제시 유형이<br />전문 디자이너의 전략적 판단에 미치는 영향</dd>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)]">
                    <dt className="font-bold text-[#111111]">연구자</dt>
                    <dd>박사 연구원 강은영</dd>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)]">
                    <dt className="font-bold text-[#111111]">소속</dt>
                    <dd>홍익대학교 대학원 시각디자인과</dd>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)]">
                    <dt className="font-bold text-[#111111]">지도교수</dt>
                    <dd>허민재 교수</dd>
                  </div>
                </dl>
              </GuideSection>

              <GuideSection title="실험 진행 순서">
                <ul className="grid list-disc gap-1.5 pl-5">
                  {processItems.map(item => <li key={item}>{item}</li>)}
                </ul>
              </GuideSection>

              <GuideSection title="평가 시 유의사항">
                <ul className="grid list-disc gap-1.5 pl-5">
                  {cautions.map(item => <li key={item}>{item}</li>)}
                </ul>
                {!isVR && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] font-semibold leading-7 text-slate-700">
                    <span className="font-extrabold text-slate-950">제외 조건: </span> 브랜드 맥락 이탈, 형태 오독 가능성, 조형 붕괴, 텍스트 오류, 축소시 안보임, 세트 내 유사성, 장면형 이미지는 본실험 자극으로 사용하기 어려운 시안으로 판단합니다.
                  </div>
                )}
              </GuideSection>

              <section>
                <h2 className="mb-2.5 text-[18px] font-extrabold leading-7 text-[#111111]">[확인 체크]</h2>
                <p>아래 내용을 확인한 뒤 예비평가를 시작해 주세요.</p>
                <div className="my-5 grid gap-2">
                  {checks.map((label, i) => (
                    <label key={i} className="flex cursor-pointer items-start gap-3 text-gray-800">
                      <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer" style={{accentColor:'#020617'}} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={onStart} disabled={!allChecked}
                  className={`w-full rounded-lg py-4 text-[16px] font-extrabold transition-colors ${allChecked ? 'bg-black text-white hover:bg-neutral-800' : 'cursor-not-allowed bg-gray-200 text-gray-500'}`}>
                  예비평가 시작
                </button>
              </section>
            </div>
          </div>
        </main>
      );
    }

    /* ─── BriefScreen ─────────────────────────────────────── */
    const BRIEF_BLOCKS = [
      {
        title: '브랜드명',
        value: '오브네 OVBNE',
        description: 'OVBNE는 Objet, Value, Balance, New, Everyday의 의미를 결합한 조어로, 일상 오브제가 지닌 가치와 균형 잡힌 생활 감각, 새롭게 감각화된 일상을 의미합니다.',
      },
      {
        title: '업종',
        value: '리빙 오브제 · 홈데코 큐레이션 매장 및 온라인 쇼핑몰',
        description: '일상에서 사용하는 오브제, 문구, 홈데코 제품을 감도 있게 제안하는 신규 라이프스타일 브랜드입니다.',
      },
      {
        title: '타깃',
        value: '25~35세 도시 거주자',
        description: '자기 취향과 감도 있는 소비를 중시하며, 과시적 고가 브랜드보다 일상 안에서 세련된 선택을 선호하는 소비자입니다.',
      },
      {
        title: '포지셔닝',
        value: '미들 프리미엄 라이프스타일 브랜드',
        description: '대중적 소품샵보다 감도 있고, 고가 편집숍보다 접근 가능한 브랜드로, 취향을 가진 도시 생활자의 일상 공간에 자연스럽게 스며드는 오브제 브랜드를 지향합니다.',
      },
    ];
    const VALUE_TAGS = ['일상성', '균형감', '취향성'];
    const MEDIA_TAGS = ['제품 라벨', '패키지 스티커', '쇼핑몰', '명함', '웹사이트', 'SNS 프로필', '온라인 배너', '제품 태그', '팝업 부스 사인'];

    /* ─── Evaluator Qualification ─────────────────────────── */
    const QUALIFICATION_ITEMS = [
      { key: 'isAdult', text: '만 19세 이상입니까?' },
      { key: 'isDesignPractitioner', text: '현재 디자인 분야에서 실무에 종사하고 있습니까?' },
      { key: 'hasFiveYearsExperience', text: '디자인 실무 경력이 5년 이상입니까?' },
      { key: 'hasBrandIdentityProjectExperience', text: '브랜드 로고, BI/CI 또는 브랜드 아이덴티티 관련 프로젝트 경험이 3건 이상 있습니까?' },
    ];

    function QualificationScreen({ value, onChange, onBack, onNext }) {
      const answers = value || {};
      const setAnswer = (key, answer) => onChange({ ...answers, [key]: answer });
      const allAnswered = QUALIFICATION_ITEMS.every(item => typeof answers[item.key] === 'boolean');
      const eligible = QUALIFICATION_ITEMS.every(item => answers[item.key] === true);
      const showGuide = allAnswered && !eligible;

      return (
        <main className="min-h-screen bg-white px-4 py-10 text-[#111111]">
          <div className="mx-auto py-[46px]" style={{width:'min(1120px, 92vw)'}}>
            <header className="mb-[52px] text-center">
              <h1 className="mb-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#111111]">예비평가자 자격 확인</h1>
              <p className="mx-auto max-w-[820px] text-left text-[16px] leading-[1.85] text-gray-800">
                아래 항목은 본실험 자극 구성을 위한 예비평가 참여 기준입니다. 모든 항목에 해당하는 경우 예비평가를 진행할 수 있습니다.
              </p>
            </header>

            <section className="mx-auto grid max-w-[820px] gap-4 text-[16px] leading-[1.85] text-gray-800">
              {QUALIFICATION_ITEMS.map((item, index) => (
                <div key={item.key} className="grid gap-3 border-b border-gray-200 pb-4 sm:grid-cols-[1fr_220px] sm:items-center">
                  <p className="font-bold text-[#111111]">{index + 1}. {item.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[true, false].map(answer => {
                      const selected = answers[item.key] === answer;
                      return (
                        <button
                          key={String(answer)}
                          type="button"
                          onClick={() => setAnswer(item.key, answer)}
                          className={`rounded-lg border px-4 py-3 text-[15px] font-bold transition-colors ${selected ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-gray-800 hover:bg-gray-50'}`}
                        >
                          {answer ? '예' : '아니오'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {showGuide && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  본 예비평가는 전문 디자이너의 실무적 판단 경험을 바탕으로 본실험 자극을 구성하기 위한 절차입니다. 참여 기준에 해당하지 않는 경우 예비평가를 진행할 수 없습니다.
                </div>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button type="button" onClick={onBack} className="rounded-lg border border-black/20 bg-white px-5 py-4 text-[16px] font-bold text-gray-800 transition-colors hover:bg-gray-50">
                  이전으로
                </button>
                <button
                  type="button"
                  onClick={() => onNext({
                    isAdult: answers.isAdult === true,
                    isDesignPractitioner: answers.isDesignPractitioner === true,
                    hasFiveYearsExperience: answers.hasFiveYearsExperience === true,
                    hasBrandIdentityProjectExperience: answers.hasBrandIdentityProjectExperience === true,
                    eligible: true,
                  })}
                  disabled={!eligible}
                  className={`rounded-lg px-5 py-4 text-[16px] font-extrabold transition-colors ${eligible ? 'bg-black text-white hover:bg-neutral-800' : 'cursor-not-allowed bg-gray-200 text-gray-500'}`}
                >
                  다음 단계로 이동
                </button>
              </div>
            </section>
          </div>
        </main>
      );
    }

    /* ─── Evaluator Basic Info ────────────────────────────── */
    const BASIC_INFO_FIELDS = [
      { key: 'ageGroup',               label: '연령대',                                                options: ['20대', '30대', '40대', '50대 이상'] },
      { key: 'mainField',              label: '현재 주요 업무 분야',                                   options: ['브랜드디자인', '그래픽디자인', 'BX', 'CI·BI', '편집·패키지', 'UI·UX', '기타'] },
      { key: 'designExperience',       label: '디자인 실무 경력',                                      options: ['5~7년', '8~10년', '11~15년', '16년 이상'] },
      { key: 'brandProjectExperience', label: '로고·BI·CI·브랜드 아이덴티티 프로젝트 경험',            options: ['3~5년', '6~10년', '11년 이상'] },
      { key: 'recentProjectExp',       label: '최근 3년 내 로고 또는 브랜드 아이덴티티 프로젝트 경험', options: ['있음', '없음'] },
      { key: 'aiToolExperience',       label: '생성형 AI 이미지 또는 로고 도구 사용 경험',             options: ['없음', '가끔 사용', '자주 사용', '실무 활용'] },
    ];

    function BasicInfoScreen({ value, onChange, onBack, onSubmit }) {
      const info = value || {};
      const setField = (key, nextValue) => onChange({ ...info, [key]: nextValue });
      const isMultiField = key => key === 'mainField';
      const hasFieldValue = field => {
        const current = info[field.key];
        return isMultiField(field.key) ? Array.isArray(current) && current.length > 0 : Boolean(current);
      };
      const toggleOption = (key, option) => {
        if (!isMultiField(key)) {
          setField(key, option);
          return;
        }
        const current = Array.isArray(info[key]) ? info[key] : (info[key] ? [info[key]] : []);
        const next = current.includes(option)
          ? current.filter(item => item !== option)
          : [...current, option];
        setField(key, next);
      };
      const requiredDone =
        BASIC_INFO_FIELDS.every(hasFieldValue) &&
        Boolean(info.evaluatorCode && info.evaluatorCode.trim()) &&
        info.criteriaConfirmed === true;

      return (
        <main className="min-h-screen bg-white px-4 py-10 text-[#111111]">
          <div className="mx-auto py-[46px]" style={{width:'min(1120px, 92vw)'}}>
            <header className="mb-[52px] text-center">
              <h1 className="mb-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#111111]">예비평가자 기본 정보 및 자격 확인</h1>
              <p className="mx-auto max-w-[820px] text-left text-[16px] leading-[1.85] text-gray-800">
                아래 항목은 예비평가 참여 기준 확인과 응답 특성 파악을 위한 기본 정보입니다. 입력 내용은 예비평가 자료의 해석과 연구대상자 자격 확인 목적으로만 사용됩니다.
              </p>
            </header>

            <section className="mx-auto grid max-w-[820px] gap-[28px] text-[16px] leading-[1.85] text-gray-800">

              {/* 성함 또는 예비평가자 ID */}
              <div>
                <h2 className="mb-3 text-[18px] font-extrabold leading-7 text-[#111111]">[성함 혹은 연구자에게 부여받은 예비평가자 ID]</h2>
                <input
                  type="text"
                  value={info.evaluatorCode || ''}
                  onChange={e => setField('evaluatorCode', e.target.value)}
                  placeholder="성함 혹은 연구자에게 부여받은 예비평가자 ID를 입력해 주세요"
                  className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-[16px] text-gray-800 outline-none transition-colors focus:border-black"
                />
              </div>

              {/* 선택형 항목 */}
              {BASIC_INFO_FIELDS.map(field => (
                <div key={field.key}>
                  <h2 className="mb-3 text-[18px] font-extrabold leading-7 text-[#111111]">[{field.label}]</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {field.options.map(option => {
                      const selected = isMultiField(field.key)
                        ? (Array.isArray(info[field.key]) ? info[field.key] : [info[field.key]].filter(Boolean)).includes(option)
                        : info[field.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleOption(field.key, option)}
                          className={`rounded-lg border px-4 py-3 text-left text-[15px] font-bold transition-colors ${selected ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-gray-800 hover:bg-gray-50'}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 예비평가 기준 이해 여부 */}
              <div>
                <h2 className="mb-3 text-[18px] font-extrabold leading-7 text-[#111111]">[예비평가 기준 이해 여부]</h2>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/20 bg-white px-4 py-4 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={info.criteriaConfirmed === true}
                    onChange={e => setField('criteriaConfirmed', e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer"
                    style={{accentColor:'#111827'}}
                  />
                  <span className={`text-[15px] font-bold leading-relaxed transition-colors ${info.criteriaConfirmed ? 'text-[#111111]' : 'text-gray-500'}`}>
                    확인했습니다
                  </span>
                </label>
              </div>

              {/* 사례비 지급 연락처 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-[14px] leading-[1.75] text-slate-600">
                <p className="text-[15px] leading-7 text-slate-700">
                  사례비 지급을 희망하는 경우 연락처를 기재해 주세요. 입력하신 정보는 평가자 자격요건 확인 및 사례비 지급 안내 목적으로만 사용됩니다.
                </p>
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={info.incentiveConsent === true}
                    onChange={e => setField('incentiveConsent', e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
                    style={{accentColor:'#111827'}}
                  />
                  <span className="text-[14px] font-semibold leading-6 text-slate-700">
                    사례비 지급을 희망하며, 자격요건 확인 후 입력한 연락처로 지급 안내를 받는 것에 동의합니다.
                  </span>
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[14px] font-bold text-slate-700">이메일 주소</span>
                    <input
                      type="email"
                      value={info.incentiveEmail || ''}
                      onChange={e => setField('incentiveEmail', e.target.value)}
                      placeholder="이메일 주소를 입력해 주세요"
                      className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-[15px] text-gray-800 outline-none transition-colors focus:border-black"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[14px] font-bold text-slate-700">전화번호</span>
                    <input
                      type="tel"
                      value={info.incentivePhone || ''}
                      onChange={e => setField('incentivePhone', e.target.value)}
                      placeholder="전화번호를 입력해 주세요"
                      className="w-full rounded-lg border border-black/20 bg-white px-4 py-3 text-[15px] text-gray-800 outline-none transition-colors focus:border-black"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button type="button" onClick={onBack} className="rounded-lg border border-black/20 bg-white px-5 py-4 text-[16px] font-bold text-gray-800 transition-colors hover:bg-gray-50">
                  이전으로
                </button>
                <button
                  type="button"
                  onClick={() => onSubmit({
                    evaluatorCode: info.evaluatorCode?.trim() || '',
                    ageGroup: info.ageGroup,
                    mainField: Array.isArray(info.mainField) ? info.mainField : (info.mainField ? [info.mainField] : []),
                    designExperience: info.designExperience,
                    brandProjectExperience: info.brandProjectExperience,
                    recentProjectExp: info.recentProjectExp,
                    aiToolExperience: info.aiToolExperience,
                    incentiveConsent: info.incentiveConsent === true,
                    incentiveEmail: info.incentiveEmail?.trim() || '',
                    incentivePhone: info.incentivePhone?.trim() || '',
                    criteriaConfirmed: info.criteriaConfirmed,
                  })}
                  disabled={!requiredDone}
                  className={`rounded-lg px-5 py-4 text-[16px] font-extrabold transition-colors ${requiredDone ? 'bg-black text-white hover:bg-neutral-800' : 'cursor-not-allowed bg-gray-200 text-gray-500'}`}
                >
                  예비평가 제출하기
                </button>
              </div>
            </section>
          </div>
        </main>
      );
    }

    function SubmissionCompleteScreen({ onFinish }) {
      return (
        <main className="min-h-screen bg-white px-4 py-10 text-[#111111]">
          <div className="mx-auto grid min-h-[70vh] place-items-center" style={{width:'min(1120px, 92vw)'}}>
            <section className="mx-auto max-w-[820px] text-center text-[16px] leading-[1.85] text-gray-800">
              <h1 className="mb-6 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#111111]">예비평가가 정상적으로 제출되었습니다.</h1>
              <div className="space-y-5 text-left">
                <p>귀한 시간에 실험에 참여해 주셔서 감사합니다. 검토해주신 시안은 본 실험에 소중하게 사용하겠습니다.</p>
                <p>전문가님께서 제공해 주신 판단 자료는 AI 시대에 실무 전문 디자이너의 판단 역량과 디자인 전문성을 연구하는 데 중요한 기반이 됩니다.</p>
                <p>예비평가자 자격 요건이 확인되면 사례비 지급 안내를 위해 기재하신 연락처로 개별 연락드리며 연구 결과를 메일로 보내드리겠습니다.</p>
                <p>디자인 실무와 연구의 연결을 위해 귀한 시간을 나누어 주셔서 감사합니다.</p>
              </div>
              <button type="button" onClick={onFinish} className="mt-8 rounded-lg bg-black px-8 py-4 text-[16px] font-extrabold text-white transition-colors hover:bg-neutral-800">
                종료하기
              </button>
            </section>
          </div>
        </main>
      );
    }

    /* ─── EliminationScreen ──────────────────────────────── */
    const ELIM_LIMIT = 21;
    function LegacyEliminationScreen({ eliminatedIds, onEliminate, onNext, onBack, timestampElimStart, cardSize=180, onCardSize }) {
      const count = eliminatedIds.length;
      const isComplete = count === ELIM_LIMIT;
      const canAdd = count < ELIM_LIMIT;
      const toggle = (id) => {
        if (eliminatedIds.includes(id)) onEliminate(eliminatedIds.filter(x=>x!==id));
        else if (canAdd) onEliminate([...eliminatedIds, id]);
      };
      const calcMin = ts => ts ? Math.floor((Date.now()-new Date(ts).getTime())/60000) : 0;
      const [elimMin, setElimMin] = useState(()=>calcMin(timestampElimStart));
      useEffect(()=>{const id=setInterval(()=>setElimMin(calcMin(timestampElimStart)),30000);return()=>clearInterval(id);},[timestampElimStart]);
      return (
        <div className="flex flex-col flex-1 min-w-0">
          {/* 상단 바 */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <button onClick={onBack} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0">← 이전</button>
              <div className="text-sm font-medium text-gray-700 whitespace-nowrap">
                탈락 선택: <span className={`font-bold ${isComplete?'text-red-600':'text-gray-900'}`}>{count}</span><span className="text-gray-400"> / {ELIM_LIMIT}</span>
              </div>
              <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${isComplete?'bg-red-500':'bg-red-300'}`} style={{width:`${(count/ELIM_LIMIT)*100}%`}} />
              </div>
              {isComplete && <span className="text-xs font-semibold text-red-600 whitespace-nowrap shrink-0">✓ 21개 선택 완료</span>}
              {timestampElimStart && (
                <div className={`text-xs whitespace-nowrap shrink-0 px-2 py-1 rounded ${elimMin<5?'text-amber-600 bg-amber-50':'text-gray-400'}`}>
                  탈락 선별 <span className="font-semibold">{elimMin}분</span> 경과{elimMin<5&&<span className="ml-1" style={{fontSize:'10px'}}>(5분 이상 권장)</span>}
                </div>
              )}
              <button onClick={onNext} disabled={!isComplete}
                title={!isComplete?`${ELIM_LIMIT-count}개 더 선택해 주세요`:undefined}
                className={`px-4 py-1.5 text-xs font-semibold rounded whitespace-nowrap shrink-0 transition-colors ${isComplete?'bg-gray-900 text-white hover:bg-gray-700':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                선별 확인 →
              </button>
            </div>
            <div className="px-4 pb-2 flex items-center gap-2 border-t border-gray-100 pt-2">
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 shrink-0" style={{fontSize:'10px'}}>카드 크기</span>
                <input type="range" min="100" max="600" step="10" value={cardSize}
                  onChange={e=>onCardSize?.(Number(e.target.value))}
                  style={{width:'112px', accentColor:'#1f2937', cursor:'pointer'}} />
                <span className="text-gray-400 shrink-0" style={{fontSize:'10px', width:'40px', textAlign:'right'}}>{cardSize}px</span>
              </div>
            </div>
          </div>
          {/* 안내 */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800 leading-relaxed">
              본실험에서 제외할 로고 시안 <strong>21개</strong>를 선택해 주세요. 정확히 21개를 선택해야 다음 단계로 진행됩니다.
              {!isComplete && count>0 && <span className="ml-2 font-medium">— {ELIM_LIMIT-count}개 더 선택 필요</span>}
            </p>
          </div>
          {/* 그리드 */}
          <div className="flex-1 p-4">
            <div className="grid" style={{gridTemplateColumns:`repeat(auto-fill, minmax(${cardSize}px, 1fr))`, gap: cardSize<150?'6px':'10px'}}>
              {LOGOS.map(logo => {
                const isElim = eliminatedIds.includes(logo.id);
                return (
                  <div key={logo.id} className={`bg-white rounded-lg flex flex-col select-none transition-all ${isElim?'border-2 border-red-400':'border-2 border-gray-200 hover:border-gray-300'}`}>
                    <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden relative cursor-pointer" onClick={()=>toggle(logo.id)}>
                      <img src={logo.imagePath} alt={logo.id} className={`w-full h-full object-contain p-2 transition-opacity ${isElim?'opacity-35':''}`} />
                      {isElim && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <p className="text-xs font-mono text-gray-500 text-center mb-1 font-medium">{logo.id}</p>
                      <button onClick={()=>toggle(logo.id)} disabled={!isElim&&!canAdd}
                        className={`w-full py-1 text-xs font-medium rounded transition-colors ${isElim?'bg-red-500 text-white hover:bg-red-600':canAdd?'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200':'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'}`}>
                        {isElim?'취소':'탈락'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    /* ─── EliminationReviewScreen ────────────────────────── */
    function LegacyEliminationReviewScreen({ eliminatedIds, onEliminate, onBack, onNext }) {
      const [dragId, setDragId]     = useState(null);
      const [dragOver, setDragOver] = useState(null);
      const eliminated = LOGOS.filter(l=>eliminatedIds.includes(l.id));
      const passing    = LOGOS.filter(l=>!eliminatedIds.includes(l.id));
      const isExact    = eliminatedIds.length === ELIM_LIMIT;

      const handleDrop = (zone) => {
        if (!dragId) return;
        const inElim = eliminatedIds.includes(dragId);
        if (zone==='elim' && !inElim) onEliminate([...eliminatedIds, dragId]);
        else if (zone==='pass' && inElim) onEliminate(eliminatedIds.filter(id=>id!==dragId));
        setDragId(null); setDragOver(null);
      };

      function MiniCard({logo, elim}) {
        const dragging = dragId === logo.id;
        return (
          <div
            draggable
            onDragStart={()=>setDragId(logo.id)}
            onDragEnd={()=>{setDragId(null);setDragOver(null);}}
            className={`rounded-lg border bg-white overflow-hidden select-none transition-opacity ${elim?'border-red-200':'border-green-200'} ${dragging?'opacity-40':'hover:shadow-md'}`}
            style={{cursor:'grab'}}
            title="드래그하여 이동"
          >
            <div className="aspect-square bg-gray-50 overflow-hidden relative">
              <img src={logo.imagePath} alt={logo.id} className={`w-full h-full object-contain p-1.5 ${elim?'opacity-50':''}`} />
              <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${elim?'bg-red-500':'bg-green-500'}`}>
                {elim
                  ? <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                  : <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                }
              </div>
            </div>
            <p className="font-mono text-center text-gray-400 py-0.5" style={{fontSize:'9px'}}>{logo.id}</p>
          </div>
        );
      }

      const zoneStyle = (zone) => ({
        borderRadius:'8px', padding:'16px', minHeight:'120px', transition:'all 0.15s',
        border: dragOver===zone
          ? zone==='elim' ? '2px solid #f87171' : '2px solid #4ade80'
          : zone==='elim' ? '2px solid #fecaca' : '2px solid #bbf7d0',
        background: dragOver===zone
          ? zone==='elim' ? '#fef2f2' : '#f0fdf4'
          : '#ffffff',
      });

      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-5">
            <div>
              <p className="text-gray-400 uppercase tracking-widest mb-1" style={{fontSize:'10px',fontWeight:600}}>시안 선별 확인</p>
              <h1 className="text-xl font-semibold text-gray-900">선별 결과를 확인해 주세요</h1>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">카드를 드래그하여 탈락/평가 박스 사이에서 직접 옮길 수 있습니다. 탈락 시안이 정확히 <strong>21개</strong>일 때 평가를 시작할 수 있습니다.</p>
            </div>

            {!isExact && (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-sm text-amber-700 flex items-center gap-2">
                <span>⚠</span>
                <span>현재 제외 시안 <strong>{eliminatedIds.length}개</strong> — 정확히 {ELIM_LIMIT}개여야 합니다{eliminatedIds.length<ELIM_LIMIT?` (${ELIM_LIMIT-eliminatedIds.length}개 더 제외 선택 필요)`:`  (${eliminatedIds.length-ELIM_LIMIT}개 제외 해제 필요)`}</span>
              </div>
            )}

            {/* 탈락 드롭존 */}
            <div style={zoneStyle('elim')}
              onDragOver={e=>{e.preventDefault();setDragOver('elim');}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>handleDrop('elim')}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                <h2 className="text-sm font-semibold text-red-700">탈락 시안 — {eliminated.length}개{eliminated.length!==ELIM_LIMIT&&<span className="ml-2 text-xs font-normal text-red-400">(21개 필요)</span>}</h2>
                <span className="text-xs text-red-300 ml-auto">본실험에서 제외 · 여기로 드래그</span>
              </div>
              {eliminated.length===0
                ? <div className="flex items-center justify-center h-20 text-sm text-red-200" style={{border:'2px dashed #fecaca',borderRadius:'8px'}}>카드를 이곳으로 드래그하세요</div>
                : <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))'}}>
                    {eliminated.map(logo=><MiniCard key={logo.id} logo={logo} elim={true} />)}
                  </div>
              }
            </div>

            {/* 평가 드롭존 */}
            <div style={zoneStyle('pass')}
              onDragOver={e=>{e.preventDefault();setDragOver('pass');}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>handleDrop('pass')}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                <h2 className="text-sm font-semibold text-green-700">평가 대상 시안 — {passing.length}개</h2>
                <span className="text-xs text-green-400 ml-auto">이 시안들을 평가합니다 · 여기로 드래그</span>
              </div>
              {passing.length===0
                ? <div className="flex items-center justify-center h-20 text-sm text-green-200" style={{border:'2px dashed #bbf7d0',borderRadius:'8px'}}>카드를 이곳으로 드래그하세요</div>
                : <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))'}}>
                    {passing.map(logo=><MiniCard key={logo.id} logo={logo} elim={false} />)}
                  </div>
              }
            </div>

            <div className="flex gap-3 pb-8">
              <button onClick={onBack} className="flex-1 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">← 수정하기</button>
              <button onClick={onNext} disabled={!isExact}
                className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${isExact?'bg-gray-900 text-white hover:bg-gray-700':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {isExact ? '평가 시작하기 →' : `제외 ${eliminatedIds.length} / ${ELIM_LIMIT} — 조건 미충족`}
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ─── BriefScreen ─────────────────────────────────────── */
    function CandidateCard({ logo, selected, disabled, onToggle, readonly=false, showTypeName=true }) {
      return (
        <article className={`relative rounded-lg p-3 transition ${selected ? 'border-2 border-rose-500 bg-rose-50/60 shadow-[0_0_0_4px_rgba(244,63,94,0.16)]' : 'border border-slate-200 bg-white'}`}>
          {selected && (
            <div className="absolute right-3 top-3 z-10 rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
              제외 선택됨
            </div>
          )}
          <div className="aspect-square rounded-md bg-slate-50 p-3">
            <img src={logo.imagePath} alt={logo.candidateId} className="h-full w-full object-contain" />
          </div>
          <div className="mt-3 min-w-0">
            <p className="font-mono text-base font-bold text-slate-950">{logo.candidateId}</p>
            {showTypeName && <p className="mt-1 text-xs font-semibold text-slate-400">{logo.typeName}</p>}
          </div>
          {!readonly && (
            <button
              onClick={() => onToggle(logo)}
              disabled={disabled}
              className={`mt-3 w-full rounded-md border px-3 py-2 text-sm font-bold transition ${
                selected
                  ? 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800'
                  : disabled
                    ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              {selected ? '제외 선택됨' : '실험후보 제외'}
            </button>
          )}
        </article>
      );
    }

    function ReviewDragCard({ logo, zone, draggingId, onDragStart, onDragEnd, onMove }) {
      const isExcluded = zone === 'excluded';
      const isDragging = draggingId === logo.id;
      return (
        <article
          draggable
          onDragStart={() => onDragStart(logo.id)}
          onDragEnd={onDragEnd}
          className={`group rounded-lg border bg-white p-2 transition ${isDragging ? 'opacity-40' : 'hover:border-slate-300 hover:shadow-sm'} ${isExcluded ? 'border-rose-100' : 'border-slate-200'}`}
          style={{cursor:'grab'}}
        >
          <div className="aspect-square rounded-md bg-slate-50 p-2">
            <img src={logo.imagePath} alt={logo.candidateId} className={`h-full w-full object-contain ${isExcluded ? 'opacity-55' : ''}`} draggable={false} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-bold text-slate-950">{logo.candidateId}</p>
            <button
              type="button"
              onClick={() => onMove(logo.id, isExcluded ? 'candidate' : 'excluded')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${isExcluded ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
            >
              {isExcluded ? '후보' : '제외'}
            </button>
          </div>
        </article>
      );
    }

    function EliminationScreen({ logos, excludedIds, onExcludeChange, onNext, onBack }) {
      const [activeTab, setActiveTab] = useState('A');
      const [dragId, setDragId] = useState(null);
      const [dragOver, setDragOver] = useState(null);

      const excludedSet = new Set(excludedIds);
      const groupedCandidates = groupByType(logos.filter(l => !excludedSet.has(l.id)));
      const groupedExcluded = groupByType(logos.filter(l => excludedSet.has(l.id)));

      const counts = TYPE_ORDER.reduce((acc, code) => {
        acc[code] = {
          candidate: (groupedCandidates[code] || []).length,
          excluded: (groupedExcluded[code] || []).length,
        };
        return acc;
      }, {});
      
      const totalExcluded = excludedIds.length;
      const totalCandidates = logos.length - totalExcluded;
      
      const isComplete = TYPE_ORDER.every(code => counts[code].excluded === TYPE_RULES[code].exclude)
        && totalExcluded === ELIM_LIMIT
        && totalCandidates === PRE_EVAL_TOTAL_KEEP;

      const moveTo = (id, target) => {
        const logo = logos.find(item => item.id === id);
        if (!logo) return;
        const isCurrentlyExcluded = excludedIds.includes(id);

        if (target === 'excluded') {
          if (isCurrentlyExcluded) return;
          if (counts[logo.typeCode].excluded >= TYPE_RULES[logo.typeCode].exclude) {
            alert(`${TYPE_RULES[logo.typeCode].title} 유형은 이미 7개를 모두 제외했습니다.`);
            return;
          }
          onExcludeChange([...excludedIds, id]);
        } else {
          if (!isCurrentlyExcluded) return;
          onExcludeChange(excludedIds.filter(item => item !== id));
        }
      };

      const handleDrop = (target) => {
        if (dragId) moveTo(dragId, target);
        setDragId(null);
        setDragOver(null);
      };

      const zoneClass = (target) => `rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition ${
          dragOver === target ? (target === 'excluded' ? 'border-rose-300 bg-rose-50/50' : 'border-slate-400 bg-slate-50') : 'border-slate-200'
      }`;

      const activeItemsCandidate = groupedCandidates[activeTab] || [];
      const activeItemsExcluded = groupedExcluded[activeTab] || [];
      const activeRule = TYPE_RULES[activeTab];

      return (
        <div className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-900 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1680px] space-y-6">
            <header className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">1차 실험후보 제외</h1>
                  <p className="mt-2 text-base leading-7 text-slate-600">
                    A, B, C 각 유형별 탭에서 본실험에 사용하기 어려운 시안을 드래그하여 우측으로 이동시켜 주세요.
                  </p>
                </div>
                <div className="flex gap-4">
                  {TYPE_ORDER.map(code => (
                    <div key={code} className="text-center bg-slate-50 border border-slate-200 rounded px-3 py-2">
                      <p className="text-xs font-bold text-slate-500">{code} 제외</p>
                      <p className={`font-bold ${counts[code].excluded === TYPE_RULES[code].exclude ? 'text-emerald-600' : 'text-slate-900'}`}>{counts[code].excluded} / {TYPE_RULES[code].exclude}</p>
                    </div>
                  ))}
                  <div className="text-center bg-rose-50 border border-rose-200 rounded px-3 py-2">
                    <p className="text-xs font-bold text-rose-700">총 제외</p>
                    <p className="font-bold text-rose-900">{totalExcluded} / {ELIM_LIMIT}</p>
                  </div>
                  <div className="text-center bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    <p className="text-xs font-bold text-emerald-700">총 후보</p>
                    <p className="font-bold text-emerald-900">{totalCandidates} / {PRE_EVAL_TOTAL_KEEP}</p>
                  </div>
                </div>
              </div>

              <section className="mt-4 border-t border-slate-100 pt-3">
                <h2 className="text-base font-bold text-slate-950">OVBNE 브랜드 브리프 요약</h2>
                <dl className="mt-2 grid gap-x-10 gap-y-2 text-[15px] leading-7 text-slate-600 lg:grid-cols-[1.1fr_2fr_1.25fr_1.25fr]">
                  <div><dt className="inline font-bold text-slate-500">브랜드명 </dt><dd className="inline">오브네 OVBNE</dd></div>
                  <div><dt className="inline font-bold text-slate-500">브랜드 성격 </dt><dd className="inline">리빙 오브제·홈데코 큐레이션, 미들 프리미엄 라이프스타일</dd></div>
                  <div><dt className="inline font-bold text-slate-500">타깃 </dt><dd className="inline">25~35세 도시 거주자</dd></div>
                  <div><dt className="inline font-bold text-slate-500">핵심 가치 </dt><dd className="inline">일상성 · 균형감 · 취향성</dd></div>
                </dl>
                <p className="mt-2 max-w-6xl text-[15px] leading-7 text-slate-600">
                  OVBNE는 Objet, Value, Balance, New, Everyday의 의미를 결합한 조어로, 일상 오브제가 지닌 가치와 균형 잡힌 생활 감각, 새롭게 감각화된 일상을 의미합니다.
                </p>
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] font-semibold leading-7 text-slate-700">
                  <span className="font-extrabold text-slate-950">제외 조건: </span>
                  브랜드 맥락 이탈, 형태 오독 가능성, 조형 붕괴, 텍스트 오류, 축소시 안보임, 세트 내 유사성, 장면형 이미지는 본실험 자극으로 사용하기 어려운 시안으로 판단합니다.
                </p>
              </section>

              <div className="mt-4 flex gap-2 border-b border-slate-200">
                {TYPE_ORDER.map(code => (
                  <button key={code} onClick={() => setActiveTab(code)} className={`px-6 py-3 font-bold border-b-2 transition ${activeTab === code ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {TYPE_RULES[code].title}
                  </button>
                ))}
              </div>
            </header>

            <main className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.6fr)]">
              <section className={zoneClass('candidate')} onDragOver={e => { e.preventDefault(); setDragOver('candidate'); }} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('candidate')}>
                <div className="mb-5 border-b border-slate-100 pb-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">본실험 후보 시안 ({activeTab} 유형)</h2>
                    <p className="mt-1 text-sm text-slate-500">제외할 시안을 우측으로 드래그하거나 [제외로] 버튼을 클릭하세요.</p>
                  </div>
                  <span className="font-bold text-slate-400 text-sm">현재 {activeItemsCandidate.length}개</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {activeItemsCandidate.map(logo => <ReviewDragCard key={logo.id} logo={logo} zone="candidate" draggingId={dragId} onDragStart={setDragId} onDragEnd={() => { setDragId(null); setDragOver(null); }} onMove={moveTo} />)}
                </div>
              </section>

              <section className={`${zoneClass('excluded')} xl:sticky xl:top-32 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto`} onDragOver={e => { e.preventDefault(); setDragOver('excluded'); }} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('excluded')}>
                <div className="mb-5 border-b border-slate-100 pb-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 text-rose-900">제외 시안 ({activeTab} 유형)</h2>
                    <p className="mt-1 text-sm text-slate-500">본실험 자극으로 사용하기 어려운 시안입니다.</p>
                  </div>
                  <span className={`font-bold text-sm ${counts[activeTab].excluded === activeRule.exclude ? 'text-emerald-600' : 'text-rose-600'}`}>{counts[activeTab].excluded} / {activeRule.exclude} 제외됨</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {activeItemsExcluded.map(logo => <ReviewDragCard key={logo.id} logo={logo} zone="excluded" draggingId={dragId} onDragStart={setDragId} onDragEnd={() => { setDragId(null); setDragOver(null); }} onMove={moveTo} />)}
                  {Array.from({ length: Math.max(0, activeRule.exclude - activeItemsExcluded.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex aspect-[4/4.8] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-400">여기로 드래그</p>
                    </div>
                  ))}
                </div>
              </section>
            </main>

            <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
              <div className="mx-auto flex max-w-[1680px] items-center justify-between">
                <button onClick={onBack} className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">이전 화면</button>
                <div className="flex items-center gap-4">
                  {!isComplete && <p className="text-sm font-bold text-rose-600">총 제외 21개 (각 유형별 7개씩)를 만족해야 다음 단계로 이동할 수 있습니다.</p>}
                  <button onClick={onNext} disabled={!isComplete} className={`rounded-lg px-8 py-3 text-sm font-bold transition ${isComplete ? 'bg-slate-950 text-white hover:bg-slate-800 shadow-md' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}>기본 정보 입력으로 이동</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ─── DimensionRatingScreen ─────────────────────────── */
    const DIM_DEFS = [
      { key: 'naturalness', label: '자연성', desc: '로고 형태가 일상적으로 경험 가능한 대상성이나 유기적 형태 단서를 어느 정도 포함하는가?' },
      { key: 'harmony',     label: '조화성', desc: '로고를 구성하는 시각 요소들이 서로 어울리며 하나의 전체 안에서 균형 있게 조직되는가?' },
      { key: 'refinement',  label: '정교성', desc: '로고 시안의 시각적 풍부함과 형태의 복잡성·밀도·깊이감이 적절하게 이루어지는가?' },
    ];
    const DIM_SCALE = [
      { value: 1, label: '매우\n낮음' },
      { value: 2, label: '다소\n낮음' },
      { value: 3, label: '보통' },
      { value: 4, label: '다소\n높음' },
      { value: 5, label: '매우\n높음' },
    ];

    function DimRatingCard({ logo, rating, onRate }) {
      const allRated = DIM_DEFS.every(d => rating[d.key] !== null);
      return (
        <article className={`rounded-lg border bg-white p-3 transition ${allRated ? 'border-slate-300' : 'border-slate-200'}`}>
          <div className="aspect-square rounded-md bg-slate-50 p-2">
            <img src={logo.imagePath} alt={logo.candidateId} className="h-full w-full object-contain" draggable={false} />
          </div>
          <p className="mt-2 font-mono text-base font-bold text-slate-950">{logo.candidateId}</p>
          {DIM_DEFS.map(dim => (
            <div key={dim.key} className="mt-2">
              <p className="text-xs font-bold text-slate-600">{dim.label}</p>
              <div className="mt-1 flex gap-1">
                {DIM_SCALE.map(s => (
                  <button
                    key={s.value}
                    onClick={() => onRate(logo.id, dim.key, s.value)}
                    title={s.label.replace('\n', ' ')}
                    className={`flex-1 rounded py-1.5 text-xs font-bold leading-tight transition ${
                      rating[dim.key] === s.value
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {s.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {allRated && <p className="mt-2 text-center text-xs font-semibold text-emerald-600">평정 완료</p>}
        </article>
      );
    }

    function DimensionRatingScreen({ candidates, initialRatings = {}, onRatingsChange, onBack, onNext, onLogEvent }) {
      const [ratings, setRatings] = useState(() => {
        const r = {};
        candidates.forEach(c => {
          r[c.id] = {
            naturalness: initialRatings[c.id]?.naturalness ?? null,
            harmony: initialRatings[c.id]?.harmony ?? null,
            refinement: initialRatings[c.id]?.refinement ?? null,
          };
        });
        return r;
      });

      const handleRate = (id, dim, value) => {
        onLogEvent?.('rate_dimension', { logoId: id, dimension: dim, value: value });
        setRatings(prev => {
          const next = { ...prev, [id]: { ...prev[id], [dim]: value } };
          onRatingsChange?.(next);
          return next;
        });
      };

      const ratedCount = candidates.filter(c => DIM_DEFS.every(d => ratings[c.id][d.key] !== null)).length;
      const isComplete = ratedCount === candidates.length;

      const handleNext = () => {
        const result = candidates.map(c => ({
          stimulusId: c.stimulusId,
          preEvalGroup: c.preEvalGroup,
          localStimulusCode: c.localStimulusCode,
          candidateId: c.candidateId,
          displayCode: c.displayCode || c.candidateId,
          typeCode: c.typeCode,
          naturalness: ratings[c.id].naturalness,
          harmony: ratings[c.id].harmony,
          refinement: ratings[c.id].refinement,
        }));
        onNext(result, ratings);
      };

      const grouped = groupByType(candidates);

      return (
        <div className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-900 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1680px] space-y-6">
            <header className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 shadow-[0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="mx-auto grid max-w-[1680px] grid-cols-[220px_minmax(0,1fr)_128px] items-stretch gap-0 px-6 py-4">
                <div className="flex flex-col justify-center pr-7">
                  <h1 className="text-[26px] font-bold leading-[1.22] tracking-tight text-slate-950">
                    2차<br/>시각체계 평가
                  </h1>
                </div>

                <div className="flex min-w-0 flex-col justify-center gap-3 border-l border-slate-100 px-8">
                  <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-5">
                    <p className="text-[13px] leading-[1.75] text-slate-600">
                      각 시안에 대해 <strong className="text-slate-900 font-extrabold text-[14px]">자연성, 조화성, 정교성</strong>을 자세히 읽고 평가해 주세요.
                    </p>
                    <p className="text-[13px] leading-[1.75] text-slate-500">
                      본 평가는 완성형이나 순위 판단이 아니라, 동일한 갯수의 평균 품질의 SET 시안들의 시각 체계 분포를 확인하기 위한 실험입니다.
                    </p>
                  </div>
 
                  <div className="grid grid-cols-3 gap-3">
                    {DIM_DEFS.map(d => (
                      <div key={d.key} className="rounded-lg border border-slate-300 bg-white px-4 py-3 shadow-sm">
                        <p className="mb-1.5 text-lg font-black text-slate-900">
                          {d.label}
                        </p>
                        <p className="text-[13px] font-bold leading-[1.6] text-slate-950">{d.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="inline-flex shrink-0 items-center justify-center rounded bg-slate-800 px-2 py-0.5 text-[11px] font-extrabold text-white tracking-wider">
                        평가 척도
                      </span>
                      <span className="text-[14px] font-bold text-black">
                        1 매우낮음 &middot; 2 다소 낮음 &middot; 3 보통 &middot; 4 다소 높음 &middot; 5 매우높음
                      </span>
                    </div>
                    <div className="text-[13px] font-extrabold text-slate-800 md:border-l md:border-slate-300 md:pl-4">
                      💡 <span className="font-black text-black">실험방법:</span> 1. 자연성 내용을 숙지하고, 자연성만 전체 평가합니다. 순차대로 반복하면 효율적이고 정확하게 평가할 수 있습니다.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-7">
                  <p className="mb-1 text-[11px] font-bold tracking-widest text-slate-400">평가 진행</p>
                  <p className="text-3xl font-bold leading-none text-slate-950">{ratedCount}</p>
                  <p className="mt-1 text-xs text-slate-400">/ {candidates.length}개</p>
                </div>
              </div>
            </header>

            <main className="space-y-6">
              {TYPE_ORDER.map(code => {
                const rule = TYPE_RULES[code];
                const items = grouped[code];
                return (
                  <section key={code} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="mb-4 border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-bold text-slate-950">{rule.title} <span className="font-semibold text-slate-400">| {items.length}개</span></h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {items.map(logo => (
                        <DimRatingCard key={logo.id} logo={logo} rating={ratings[logo.id]} onRate={handleRate} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </main>

            <div className="sticky bottom-0 -mx-5 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
              <div className="mx-auto flex max-w-[1680px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button onClick={onBack} className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  뒤로 가서 수정하기
                </button>
                <div className="flex items-center gap-4">
                  {!isComplete && (
                    <p className="text-sm font-semibold text-slate-400">
                      {candidates.length - ratedCount}개 시안의 평정이 남아 있습니다.
                    </p>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!isComplete}
                    className={`rounded-lg px-6 py-3 text-sm font-bold transition ${isComplete ? 'bg-slate-950 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
                  >
                    SET 구성안 작성으로 이동
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ─── SetAssignmentScreen ────────────────────────────── */
    const CARD_W = 90; /* 풀·SET 슬롯 공통 카드 너비(px) */
    const SET_QUOTA = { A: 3, B: 3, C: 3 };
    const SET_TOTAL = 9;
    const SKEYS = ['SET_1', 'SET_2', 'SET_3'];
    const SLABELS = { SET_1: 'SET 1', SET_2: 'SET 2', SET_3: 'SET 3' };
    const SET_CHECKLIST = [
      { key: 'typeCompositionChecked', label: '각 SET은 A 3개, B 3개, C 3개의 고정 배정 기준을 충족합니다.' },
      { key: 'similarStructureChecked', label: '유사한 조형 구조의 시안이 특정 SET에 집중되지 않도록 확인했습니다.' },
      { key: 'misreadingRiskChecked', label: '형태 오독 가능성이 큰 시안이 특정 SET에 집중되지 않도록 확인했습니다.' },
      { key: 'complexityDistributionChecked', label: '복잡하거나 장식적인 시안이 특정 SET에 집중되지 않도록 확인했습니다.' },
      { key: 'dimensionDistributionChecked', label: '자연성, 조화성, 정교성의 상대적 분포가 특정 SET에 과도하게 편중되지 않도록 배정했습니다.' },
      { key: 'relativeCompletionChecked', label: '상대적으로 완성도가 높거나 낮아 보이는 시안이 특정 SET에 집중되지 않도록 확인했습니다.' },
      { key: 'comparabilityChecked', label: 'SET 1, SET 2, SET 3이 비교 가능한 구성인지 확인했습니다.' },
    ];
    const INIT_CHECKLIST = Object.fromEntries(SET_CHECKLIST.map(i => [i.key, false]));

    function setCountTypes(ids) {
      return ids.reduce((acc, id) => {
        const group = id.split('_')[0];
        if (acc[group] !== undefined) acc[group]++;
        return acc;
      }, { A:0, B:0, C:0 });
    }
    function setIsValid(ids) {
      if (ids.length !== SET_TOTAL) return false;
      const c = setCountTypes(ids);
      return c.A===3 && c.B===3 && c.C===3;
    }

    function SetCard({ candidate, zone, draggingId, onDragStart, onDragEnd }) {
      const isDragging = draggingId === candidate.id;
      return (
        <div
          draggable
          onDragStart={() => onDragStart(candidate.id, zone)}
          onDragEnd={onDragEnd}
          style={{
            background:'white', borderRadius:'8px', border:'2px solid #e5e7eb',
            cursor:'grab', userSelect:'none', transition:'border-color 0.1s, box-shadow 0.1s',
            opacity: isDragging ? 0.3 : 1,
          }}
          onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.borderColor='#9ca3af'; e.currentTarget.style.boxShadow='0 2px 6px rgba(0,0,0,0.1)'; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#e5e7eb'; e.currentTarget.style.boxShadow='none'; }}
        >
          <div style={{aspectRatio:'1/1', background:'#f9fafb', borderRadius:'6px 6px 0 0', overflow:'hidden'}}>
            <img src={candidate.imagePath} alt={candidate.candidateId} draggable={false}
              style={{width:'100%', height:'100%', objectFit:'contain', padding:'4px'}} />
          </div>
          <p style={{fontSize:'10px', fontFamily:'monospace', fontWeight:600, color:'#4b5563', textAlign:'center', padding:'4px 0 3px', lineHeight:1, margin:0}}>
            {candidate.candidateId}
          </p>
        </div>
      );
    }

    const TYPE_BG   = { A:'#dbeafe', B:'#dcfce7', C:'#fef9c3', D:'#fce7f3' };
    const TYPE_TEXT = { A:'#1d4ed8', B:'#15803d', C:'#92400e', D:'#be185d' };
    const TYPE_DROP = { A:'#eff6ff', B:'#f0fdf4', C:'#fefce8', D:'#fdf2f8' };
    const TYPE_DASH = { A:'#93c5fd', B:'#86efac', C:'#fde047', D:'#f9a8d4' };

    /* TypeSlots: 단일 타입의 슬롯 그룹 (드롭 타겟 포함) */
    function TypeSlots({ setKey, type, quota, filled, draggingType, dragTarget, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd, draggingId }) {
      const zoneKey = `${setKey}_${type}`;
      const isCompatible = draggingType === type;
      const isTarget = dragTarget === zoneKey;
      const isFull = filled.length >= quota;
      return (
        <div style={{display:'flex', alignItems:'center', gap:'6px',
          background: isTarget ? TYPE_DROP[type] : 'transparent',
          borderRadius:'8px', padding:'4px', transition:'background 0.12s', flexShrink:0}}
          onDragOver={e => { e.preventDefault(); if (isCompatible && !isFull) onDragOver(zoneKey); }}
          onDragLeave={onDragLeave}
          onDrop={() => { if (isCompatible && !isFull) onDrop(setKey); }}
        >
          {/* 타입 레이블 */}
          <div style={{width:40, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px'}}>
            <span style={{fontSize:'12px', fontWeight:800, color:TYPE_TEXT[type], background:TYPE_BG[type],
              padding:'2px 7px', borderRadius:'5px', lineHeight:1.3, display:'block', textAlign:'center'}}>{type}</span>
            <span style={{fontSize:'14px', fontWeight:700, color: isFull ? '#16a34a' : '#6b7280', lineHeight:1}}>
              {filled.length}<span style={{fontSize:'11px', color:'#9ca3af', fontWeight:500}}>/{quota}</span>
            </span>
          </div>
          {/* 슬롯들 — 모두 CARD_W 고정 */}
          <div style={{display:'flex', gap:'6px'}}>
            {filled.map(c => (
              <div key={c.id} style={{width:CARD_W, flexShrink:0}}>
                <SetCard candidate={c} zone={setKey} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} />
              </div>
            ))}
            {Array.from({length: quota - filled.length}).map((_, i) => (
              <div key={i} style={{
                width:CARD_W, flexShrink:0, aspectRatio:'1/1', borderRadius:'7px',
                border:`2px dashed ${isTarget ? TYPE_DASH[type] : '#e5e7eb'}`,
                background: isTarget ? TYPE_BG[type]+'44' : '#f9fafb',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'22px', color: isTarget ? TYPE_DASH[type] : '#e5e7eb', transition:'all 0.12s',
              }}>
                {isTarget && i===0 ? '+' : ''}
              </div>
            ))}
          </div>
        </div>
      );
    }

    function TypedSetZone({ setKey, setLabel, allCandidates, assignment, dragging, dragTarget, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd, flex }) {
      const getByType = (t) => allCandidates.filter(c => assignment[c.id]===setKey && c.preEvalGroup===t);
      const ids = allCandidates.filter(c => assignment[c.id]===setKey).map(c => c.id);
      const valid = setIsValid(ids);
      const draggingType = dragging?.type;
      const sharedProps = { draggingType, dragTarget, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd, draggingId: dragging?.id };
      return (
        <div style={{
          borderRadius:'12px', border: valid ? '2px solid #86efac' : '2px solid #e5e7eb',
          background: valid ? 'rgba(240,253,244,0.4)' : 'white',
          transition:'all 0.15s', flex: flex||undefined, display:'flex', flexDirection:'column',
        }}>
          {/* 헤더 */}
          <div style={{padding:'10px 14px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #f3f4f6'}}>
            <h3 style={{fontSize:'15px', fontWeight:700, color:'#111827', margin:0}}>{setLabel}</h3>
            {valid
              ? <span style={{fontSize:'11px', color:'#15803d', fontWeight:600, background:'#dcfce7', padding:'3px 10px', borderRadius:'9999px'}}>기준 충족 ✓</span>
              : <span style={{fontSize:'11px', color:'#9ca3af'}}>A 3 · B 3 · C 3</span>
            }
          </div>
          {/* A행 */}
          <div style={{padding:'8px 12px', borderBottom:'1px solid #f3f4f6'}}>
            <TypeSlots setKey={setKey} type='A' quota={3} filled={getByType('A')} {...sharedProps} />
          </div>
          {/* B행 */}
          <div style={{padding:'8px 12px', borderBottom:'1px solid #f3f4f6'}}>
            <TypeSlots setKey={setKey} type='B' quota={3} filled={getByType('B')} {...sharedProps} />
          </div>
          {/* C+D 합행 */}
          <div style={{padding:'8px 12px'}}>
            <TypeSlots setKey={setKey} type='C' quota={3} filled={getByType('C')} {...sharedProps} />
          </div>
        </div>
      );
    }

    function SetAssignmentScreen({ candidates, onBack, onNext }) {
      const typeCounts = setCountTypes(candidates.map(c => c.id));
      const isDataValid = candidates.length===27 && typeCounts.A===9 && typeCounts.B===9 && typeCounts.C===9;

      const [assignment, setAssignment] = useState(() => {
        const a = {}; candidates.forEach(c => { a[c.id] = 'pool'; }); return a;
      });
      const [dragging, setDragging] = useState(null);
      const [dragTarget, setDragTarget] = useState(null);
      const [toast, setToast] = useState(null);
      const [showModal, setShowModal] = useState(false);
      const [checklist, setChecklist] = useState(INIT_CHECKLIST);

      if (!isDataValid) {
        return (
          <div style={{minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'center', justifyContent:'center', padding:'32px'}}>
            <div style={{background:'white', borderRadius:'12px', border:'1px solid #fecaca', padding:'40px', maxWidth:'480px', textAlign:'center'}}>
              <div style={{fontSize:'48px', marginBottom:'16px'}}>⚠</div>
              <p style={{color:'#374151', fontWeight:500, marginBottom:'12px', lineHeight:1.6}}>
                본실험 후보 구성이 맞지 않습니다. 이전 단계에서 실험후보 제외 선택을 다시 확인해 주세요.
              </p>
              <p style={{fontSize:'13px', color:'#6b7280', background:'#f9fafb', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px'}}>
                현재: 전체 {candidates.length}개 (A {typeCounts.A} · B {typeCounts.B} · C {typeCounts.C})<br/>
                기준: 전체 27개 (A 9 · B 9 · C 9)
              </p>
              <button onClick={onBack} style={{padding:'10px 24px', background:'#111827', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:500, cursor:'pointer'}}>
                ← 이전 단계로 수정하기
              </button>
            </div>
          </div>
        );
      }

      const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
      const getCandidatesIn = (zone) => candidates.filter(c => assignment[c.id] === zone);

      const moveTo = (id, to) => {
        const from = assignment[id];
        if (from === to) return;
        if (to !== 'pool') {
          const type = id.split('_')[0];
          const inTarget = candidates.filter(c => assignment[c.id] === to);
          if (inTarget.filter(c => c.preEvalGroup === type).length >= SET_QUOTA[type]) {
            showToast('이 SET의 유형별 고정 배정 기준을 초과했습니다.'); return;
          }
          if (inTarget.length >= SET_TOTAL) {
            showToast('이 SET의 유형별 고정 배정 기준을 초과했습니다.'); return;
          }
        }
        setAssignment(prev => ({ ...prev, [id]: to }));
      };

      const handleDragStart = (id) => setDragging({ id, type: id.split('_')[0] });
      const handleDragEnd = () => { setDragging(null); setDragTarget(null); };
      const handleDragOver = (target) => setDragTarget(target);
      const handleDragLeave = () => setDragTarget(null);
      const handleDrop = (setKey) => { if (dragging) moveTo(dragging.id, setKey); setDragging(null); setDragTarget(null); };

      const poolCandidates = getCandidatesIn('pool');
      const canSubmit = poolCandidates.length === 0 && SKEYS.every(key => setIsValid(getCandidatesIn(key).map(c => c.id)));
      const allChecked = Object.values(checklist).every(Boolean);

      const handleModalSubmit = () => {
        const sa = {}, sc = {};
        SKEYS.forEach(key => {
          const ids = getCandidatesIn(key).map(c => c.id);
          sa[key] = ids;
          const c = setCountTypes(ids);
          sc[key] = { A:c.A, B:c.B, C:c.C, total:ids.length, isValid:setIsValid(ids), conditionType: CONDITION_TYPES[SKEYS.indexOf(key)] };
        });
        onNext({ individualSetAssignment: sa, individualSetComposition: sc, conditionTypes: CONDITION_TYPES, setAssignmentChecklist: checklist });
      };

      return (
        <div style={{minHeight:'100vh', background:'#f9fafb', display:'flex', flexDirection:'column'}}>
          {toast && (
            <div style={{position:'fixed', top:'20px', left:'50%', transform:'translateX(-50%)', zIndex:100, background:'#dc2626', color:'white', fontSize:'13px', fontWeight:500, padding:'10px 20px', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.2)', whiteSpace:'nowrap'}}>
              {toast}
            </div>
          )}

          {/* 상단 헤더 */}
          <div style={{background:'white', borderBottom:'1px solid #e5e7eb', padding:'16px 24px', flexShrink:0}}>
            <div style={{maxWidth:'1560px', margin:'0 auto'}}>
              <p style={{fontSize:'10px', fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 2px'}}>예비평가 · 2단계</p>
              <h1 style={{fontSize:'18px', fontWeight:700, color:'#111827', margin:'0 0 8px'}}>2차 본실험 후보 시안 SET 구성안 작성</h1>
              <p style={{fontSize:'13px', color:'#374151', lineHeight:1.7, margin:'0 0 4px'}}>
                1차 실험후보 제외 후 남은 27개 본실험 후보 시안을 SET 1, SET 2, SET 3으로 배정해 주세요.
                각 SET은 총 9개 시안으로 구성하며, A 3개, B 3개, C 3개의 유형별 고정 배정 기준을 충족해야 합니다.
              </p>
              <p style={{fontSize:'13px', color:'#374151', lineHeight:1.7, margin:'4px 0 0'}}>
                SET 구성 시 유형별 고정 배정 기준뿐 아니라 자연성, 조화성, 정교성의 상대적 분포가 특정 SET에 과도하게 편중되지 않도록 확인해 주세요.
              </p>
              <p style={{fontSize:'11px', color:'#6b7280', lineHeight:1.65, margin:0}}>
                이 화면에서 작성한 SET은 연구자의 최종 SET 확정 전 참고자료로 활용됩니다.
                특정 SET에 유사한 조형 구조, 오독 가능성이 큰 시안, 복잡하거나 장식적인 시안이 집중되지 않도록 배정해 주세요.
              </p>
              <div style={{display:'flex', flexWrap:'wrap', gap:'20px', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #f3f4f6'}}>
                {[['본실험 후보 시안','27개'],['SET 수','3개'],['SET별 구성','각 9개'],['SET별 기준','A 3 · B 3 · C 3']].map(([label, value]) => (
                  <div key={label} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                    <span style={{fontSize:'11px', color:'#9ca3af'}}>{label}</span>
                    <span style={{fontSize:'11px', fontWeight:600, color:'#1f2937', background:'#f3f4f6', padding:'2px 8px', borderRadius:'4px'}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 메인 */}
          <div style={{flex:1, maxWidth:'1560px', width:'100%', margin:'0 auto', padding:'16px', display:'flex', gap:'16px', alignItems:'stretch', minHeight:'calc(100vh - 220px)'}}>

            {/* 후보 풀 */}
            <div style={{width:'420px', flexShrink:0, display:'flex', flexDirection:'column'}}>
              <div style={{background:'white', borderRadius:'12px', border:'1px solid #e5e7eb', display:'flex', flexDirection:'column', overflow:'hidden', flex:1}}>
                <div
                  style={{padding:'12px', borderBottom:'1px solid #f3f4f6', flexShrink:0, background: dragTarget==='pool' ? '#f9fafb' : 'white'}}
                  onDragOver={e => { e.preventDefault(); handleDragOver('pool'); }}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop('pool')}
                >
                  <h2 style={{fontSize:'13px', fontWeight:700, color:'#111827', margin:'0 0 2px'}}>본실험 후보 시안</h2>
                  <p style={{fontSize:'10px', color:'#9ca3af', margin:'0 0 6px', lineHeight:1.5}}>카드를 드래그하여 SET 1, SET 2, SET 3에 배정해 주세요.</p>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'4px', alignItems:'center'}}>
                    <span style={{fontSize:'11px', fontWeight:600, padding:'2px 8px', borderRadius:'9999px', background: poolCandidates.length===0 ? '#dcfce7' : '#f3f4f6', color: poolCandidates.length===0 ? '#15803d' : '#374151'}}>
                      {poolCandidates.length===0 ? '모두 배정됨' : `${poolCandidates.length}개 남음`}
                    </span>
                    {['A','B','C','D'].map(t => {
                      const cnt = poolCandidates.filter(c => c.preEvalGroup===t).length;
                      return cnt>0 ? <span key={t} style={{fontSize:'10px', color:'#9ca3af'}}>{t} {cnt}</span> : null;
                    })}
                  </div>
                </div>
                <div
                  style={{flex:1, overflowY:'auto', padding:'8px', background: dragTarget==='pool' ? '#f9fafb' : 'white'}}
                  onDragOver={e => { e.preventDefault(); handleDragOver('pool'); }}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop('pool')}
                >
                  {poolCandidates.length === 0 ? (
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100px', borderRadius:'8px', border:'2px dashed #bbf7d0', color:'#4ade80', fontSize:'12px'}}>
                      모든 시안이 배정되었습니다
                    </div>
                  ) : (
                    <div style={{display:'grid', gridTemplateColumns:`repeat(4, ${CARD_W}px)`, gap:'8px'}}>
                      {poolCandidates.map(c => (
                        <SetCard key={c.id} candidate={c} zone="pool" draggingId={dragging?.id} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SET 영역 */}
            <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'12px'}}>
              {SKEYS.map(key => (
                <TypedSetZone
                  key={key} setKey={key} setLabel={SLABELS[key]}
                  allCandidates={candidates} assignment={assignment} dragging={dragging}
                  dragTarget={dragTarget}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                  flex={1}
                />
              ))}
            </div>

            {/* 우측 기준 패널 */}
            <div style={{width:'232px', flexShrink:0, position:'sticky', top:'16px', maxHeight:'calc(100vh - 5rem)', overflowY:'auto'}}>
              <div style={{background:'white', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'16px'}}>
                <h3 style={{fontSize:'13px', fontWeight:700, color:'#111827', margin:'0 0 8px'}}>SET 구성 기준</h3>
                <p style={{fontSize:'11px', color:'#4b5563', lineHeight:1.7, margin:'0 0 12px'}}>
                  각 SET은 본실험에서 서로 다른 AI 정보 제시 조건과 교차 배정될 수 있도록 구성됩니다. 따라서 SET 1, SET 2, SET 3은 서로 비교 가능한 구성이 되도록 배정해야 합니다.
                </p>
                <div style={{borderTop:'1px solid #f3f4f6', paddingTop:'12px', marginBottom:'16px'}}>
                  <p style={{fontSize:'10px', fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px'}}>확인 기준</p>
                  {['각 SET은 A 3개, B 3개, C 3개로 구성','유사한 조형 구조의 시안이 특정 SET에 집중되지 않도록 배정','형태 오독 가능성이 큰 시안이 특정 SET에 집중되지 않도록 배정','복잡하거나 장식적인 시안이 특정 SET에 집중되지 않도록 배정','상대적으로 완성도가 높거나 낮아 보이는 시안이 특정 SET에 집중되지 않도록 배정'].map((item, i) => (
                    <div key={i} style={{display:'flex', gap:'6px', marginBottom:'6px'}}>
                      <span style={{color:'#d1d5db', flexShrink:0, marginTop:'2px'}}>·</span>
                      <span style={{fontSize:'11px', color:'#4b5563', lineHeight:1.6}}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{borderTop:'1px solid #f3f4f6', paddingTop:'12px'}}>
                  <p style={{fontSize:'10px', fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 8px'}}>현황</p>
                  {SKEYS.map(key => {
                    const ids = getCandidatesIn(key).map(c => c.id);
                    const valid = setIsValid(ids);
                    return (
                      <div key={key} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px'}}>
                        <span style={{fontSize:'11px', color:'#4b5563'}}>{SLABELS[key]}</span>
                        <span style={{fontSize:'11px', fontWeight: valid ? 600 : 400, color: valid ? '#16a34a' : '#9ca3af'}}>
                          {valid ? '✓ 완료' : `${ids.length}/9`}
                        </span>
                      </div>
                    );
                  })}
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'6px', borderTop:'1px solid #f3f4f6', marginTop:'4px'}}>
                    <span style={{fontSize:'11px', color:'#4b5563'}}>미배정</span>
                    <span style={{fontSize:'11px', fontWeight: poolCandidates.length===0 ? 600 : 400, color: poolCandidates.length===0 ? '#16a34a' : '#374151'}}>{poolCandidates.length}개</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 버튼 바 */}
          <div style={{position:'sticky', bottom:0, background:'white', borderTop:'1px solid #e5e7eb', padding:'12px 24px', flexShrink:0}}>
            <div style={{maxWidth:'1560px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px'}}>
              <button onClick={onBack} style={{padding:'8px 16px', border:'1px solid #d1d5db', color:'#374151', fontSize:'13px', fontWeight:500, borderRadius:'8px', background:'white', cursor:'pointer', whiteSpace:'nowrap'}}>
                ← 이전 단계로 수정하기
              </button>
              <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                <p style={{fontSize:'11px', lineHeight:1.4, textAlign:'right', margin:0, color: canSubmit ? '#16a34a' : '#d97706', fontWeight: canSubmit ? 600 : 400}}>
                  {canSubmit ? '모든 SET이 유형별 고정 배정 기준을 충족했습니다.' : '아직 모든 SET의 유형별 고정 배정 기준이 충족되지 않았습니다.'}
                </p>
                <button onClick={() => setShowModal(true)} disabled={!canSubmit}
                  style={{padding:'8px 20px', background: canSubmit ? '#111827' : '#f3f4f6', color: canSubmit ? 'white' : '#9ca3af', fontSize:'13px', fontWeight:600, borderRadius:'8px', border:'none', cursor: canSubmit ? 'pointer' : 'not-allowed', whiteSpace:'nowrap'}}>
                  SET 구성안 확인 →
                </button>
              </div>
            </div>
          </div>

          {/* 확인 모달 */}
          {showModal && (
            <div style={{position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)', padding:'16px'}}>
              <div style={{background:'white', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', maxWidth:'520px', width:'100%', padding:'24px'}}>
                <h2 style={{fontSize:'15px', fontWeight:700, color:'#111827', margin:'0 0 8px'}}>SET 구성안 제출 전 확인</h2>
                <p style={{fontSize:'13px', color:'#4b5563', lineHeight:1.7, margin:'0 0 16px'}}>
                  아래 내용은 연구자가 최종 본실험 SET을 확정하기 전 참고자료로 활용됩니다. 제출 전 SET 간 구성 편중이 없는지 확인해 주세요.
                </p>
                <div style={{borderTop:'1px solid #f3f4f6', paddingTop:'12px', marginBottom:'16px'}}>
                  {SET_CHECKLIST.map(({ key, label }) => (
                    <label key={key} style={{display:'flex', gap:'10px', marginBottom:'10px', cursor:'pointer', alignItems:'flex-start'}}>
                      <input type="checkbox" checked={checklist[key]} onChange={e => setChecklist(prev => ({...prev, [key]: e.target.checked}))}
                        style={{marginTop:'2px', flexShrink:0, width:'15px', height:'15px', accentColor:'#111827'}} />
                      <span style={{fontSize:'13px', lineHeight:1.6, color: checklist[key] ? '#111827' : '#6b7280'}}>{label}</span>
                    </label>
                  ))}
                </div>
                <div style={{display:'flex', gap:'10px', borderTop:'1px solid #f3f4f6', paddingTop:'16px'}}>
                  <button onClick={() => { setShowModal(false); setChecklist(INIT_CHECKLIST); }}
                    style={{flex:1, padding:'10px', border:'1px solid #d1d5db', color:'#374151', fontSize:'13px', fontWeight:500, borderRadius:'8px', background:'white', cursor:'pointer'}}>
                    취소
                  </button>
                  <button onClick={handleModalSubmit} disabled={!allChecked}
                    style={{flex:1, padding:'10px', background: allChecked ? '#111827' : '#f3f4f6', color: allChecked ? 'white' : '#9ca3af', fontSize:'13px', fontWeight:600, borderRadius:'8px', border:'none', cursor: allChecked ? 'pointer' : 'not-allowed'}}>
                    SET 구성안 제출
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    function BriefCard({ title, value, description }) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-bold text-slate-950">{title}</h2>
          <p className="mt-3 text-lg font-bold leading-7 text-slate-900">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </section>
      );
    }
    function TagList({ items, variant }) {
      const className = variant === 'value'
        ? 'border-blue-100 bg-blue-50 text-slate-800'
        : 'border-slate-200 bg-slate-50 text-slate-600';
      return (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <span key={item} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${className}`}>{item}</span>
          ))}
        </div>
      );
    }
    function BriefInfoBlock({ title, value, description, children }) {
      return (
        <section>
          <h2 className="mb-2.5 text-[18px] font-extrabold leading-7 text-[#111111]">[{title}]</h2>
          {value && <p className="font-extrabold text-[#111111]">{value}</p>}
          {description && <p className="mt-1.5">{description}</p>}
          {children && <div className="mt-1.5">{children}</div>}
        </section>
      );
    }


    function BriefScreen({ mode, onStart, onBack }) {
      const isVR = mode === 'visual-rating';
      const [confirmed, setConfirmed] = useState(false);
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-[#111111]">
          <div className="max-w-4xl w-full bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-sm">
            <header className="mb-[52px] text-center">
              <h1 className="mb-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#111111]">OVBNE 브랜드 브리프</h1>
              <div className="mx-auto grid max-w-[980px] gap-3.5 text-left text-[16px] leading-[1.85] text-gray-800">
                <p>
                  {isVR 
                    ? '아래 정보는 본실험에 사용될 로고 시안의 조형 판단 맥락을 이해하기 위한 참고 정보입니다.' 
                    : '아래 정보는 48개 후보 시안이 OVBNE 브랜드 맥락에서 본실험 자극으로 사용 가능한지 판단하기 위한 참고 기준입니다. 평가자는 완성 로고의 우열을 판단하기보다, 각 시안이 브랜드 맥락과 최소한의 관련성을 갖는지 확인해 주세요.'}
                </p>
                <p>
                  OVBNE는 대형 라이프스타일 브랜드, 독립 오브제 브랜드, 온라인 감성 셀렉트숍과 경쟁하는 신규 브랜드로 설정됩니다. 본 예비평가에서는 특정 경쟁 브랜드와의 직접 비교가 아니라, 각 시안이 OVBNE 브랜드 맥락에서 과도하게 다른 업종으로 오독되지 않는지를 확인합니다.
                </p>
              </div>
            </header>
 
            <main className="mx-auto grid max-w-[980px] gap-[34px] text-[16px] leading-[1.85] text-gray-800">
              <div className="grid gap-x-10 gap-y-[34px] lg:grid-cols-2">
                {BRIEF_BLOCKS.map(item => <BriefInfoBlock key={item.title} {...item} />)}
 
                <BriefInfoBlock
                  title="핵심 가치"
                  description="후보 시안 검토 시 참고할 브랜드 가치 키워드입니다."
                >
                  <ul className="grid list-disc gap-1.5 pl-5">
                    {VALUE_TAGS.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </BriefInfoBlock>
 
                <BriefInfoBlock
                  title="적용 매체"
                  description="후보 시안이 기본적으로 활용될 수 있는 매체 범위입니다."
                >
                  <ul className="grid list-disc gap-1.5 pl-5 sm:grid-cols-2">
                    {MEDIA_TAGS.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </BriefInfoBlock>
              </div>
 
              <div className="w-full mt-6 pt-6 border-t border-slate-200">
                <p className="text-[15px] text-slate-700">브랜드 브리프는 이후 모든 후보 시안을 검토할 때 동일하게 적용되는 참고 기준입니다.</p>
                
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:bg-slate-100 mt-4">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer"
                    style={{accentColor:'#111827'}}
                  />
                  <span className={`text-[15px] font-bold leading-relaxed transition-colors ${confirmed ? 'text-[#111111]' : 'text-gray-500'}`}>
                    브랜드 브리프를 모두 읽고 이해하였습니다.
                  </span>
                </label>

                <div className="mt-5 flex gap-4">
                  {onBack && (
                    <button onClick={onBack} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition">
                      이전 화면
                    </button>
                  )}
                  <button 
                    onClick={onStart} 
                    disabled={!confirmed}
                    className={`flex-[2] py-4 rounded-lg font-bold transition shadow-sm ${
                      confirmed 
                        ? 'bg-slate-900 text-white hover:bg-slate-800' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    {isVR ? '브리프 확인 후 2차 평가로 이동' : '브리프 확인 후 제외 선택으로 이동'}
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      );
    }

    /* ─── CriteriaPanelContent ────────────────────────────── */
    function CriteriaPanelContent() {
      const [briefOpen, setBriefOpen] = useState(true);
      return (
        <div className="p-4 space-y-4">

          {/* Brand Brief (접힘/펼침) */}
          <section>
            <button onClick={() => setBriefOpen(v => !v)} className="w-full flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Brand Brief</h2>
              <span className="text-gray-400 text-xs">{briefOpen ? '▲' : '▼'}</span>
            </button>
            {briefOpen && (
              <div className="text-xs text-gray-700 leading-relaxed space-y-2.5">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">오브네 OVBNE</p>
                  <p className="text-gray-400" style={{fontSize:'10px'}}>Objet · Value · Balance · New · Everyday</p>
                </div>
                <div className="border-t border-gray-100" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>업종</p>
                  <p>리빙 오브제·홈데코 큐레이션 매장 및 온라인 쇼핑몰</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>포지셔닝</p>
                  <p>대중적 소품샵보다 감도 있고, 고가 편집숍보다 접근 가능한 미들 프리미엄 라이프스타일 브랜드. 취향을 가진 도시 생활자의 일상 공간에 자연스럽게 스며드는 오브제 브랜드로 위치시킨다.</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>가치 키워드</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {['일상성','균형감','취향성'].map(k => (
                      <span key={k} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-medium" style={{fontSize:'10px'}}>{k}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>타깃 고객</p>
                  <p>25~35세 도시 거주자. 자기 취향과 감도 있는 소비를 중시하며, 과시적 고가 브랜드보다 일상 안에서 세련된 선택을 선호하는 소비자</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>경쟁사 시각 특징</p>
                  <p>대형 라이프스타일 편집숍, 독립 소품샵, 온라인 감성 셀렉트숍과 경쟁. 이들은 감성 일러스트, 손글씨 서체, 자연 소재 이미지, 따뜻한 중립색을 주로 활용한다.</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-400 uppercase tracking-wider" style={{fontSize:'10px'}}>적용 환경</p>
                  <p className="text-gray-500">제품 라벨 · 패키지 스티커 · 쇼핑백 · 명함 · 웹사이트 · SNS 프로필 · 온라인 배너 · 제품 태그 · 팝업 부스 사인</p>
                </div>
              </div>
            )}
          </section>

          <div className="border-t border-gray-100" />

          {/* 평가 항목 */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">평가 항목</h2>
            <div className="space-y-2">
              <div className="py-2.5 border-b border-gray-100">
                <p className="text-xs text-gray-800 leading-snug">
                  <span className="font-semibold text-gray-900 mr-1">B.</span>
                  <span className="font-medium">브랜드 종합 적합도</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">이 로고 시안이 브랜드 브리프에 얼마나 적합한가?</p>
              </div>
              <div className="py-2.5">
                <p className="text-xs text-gray-800 leading-snug">
                  <span className="font-semibold text-gray-900 mr-1">V.</span>
                  <span className="font-medium">시각 종합 완성도</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">이 로고 시안이 시각적으로 얼마나 완성도 있는가?</p>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* 점수 척도 */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-2">점수 척도</h2>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[['1','전혀\n그렇지\n않다'],['2','그렇지\n않다'],['3','보통\n이다'],['4','그렇다'],['5','매우\n그렇다']].map(([n, label]) => (
                <div key={n}>
                  <div className="w-6 h-6 bg-gray-100 rounded-sm flex items-center justify-center text-gray-700 text-xs font-medium mx-auto mb-0.5">{n}</div>
                  <p className="text-gray-400 leading-tight whitespace-pre-line" style={{fontSize:'9px'}}>{label}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      );
    }

    /* ─── CriteriaPanel ───────────────────────────────────── */
    function CriteriaPanel({ mobile = false }) {
      const [open, setOpen] = useState(false);
      if (mobile) {
        return (
          <div className="bg-white shadow-sm">
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">브랜드 브리프 &amp; 판단 기준</span>
                {!open && <span className="text-xs text-gray-400">— 탭하여 펼치기</span>}
              </div>
              <span className="text-gray-400 text-xs">{open ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>
            {open && <div className="border-t border-gray-100 max-h-64 overflow-y-auto"><CriteriaPanelContent /></div>}
          </div>
        );
      }
      return (
        <div className="h-full flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">평가 참고 기준</p>
          </div>
          <div className="flex-1 overflow-y-auto"><CriteriaPanelContent /></div>
        </div>
      );
    }

    /* ─── LogoCard ────────────────────────────────────────── */
    function LogoCard({ logo, rating, onRate, onPreview }) {
      const [imgError, setImgError] = useState(false);
      const B = rating?.brand_score ?? null;
      const V = rating?.visual_score ?? null;
      const done = B !== null && V !== null;

      return (
        <div className="bg-white flex flex-col select-none transition-shadow hover:shadow-md"
          style={{borderRadius:'8px', border: done ? '2px solid #6b7280' : '2px solid #e5e7eb'}}>
          {/* Image */}
          <div
            className="aspect-square bg-gray-50 cursor-pointer overflow-hidden relative group"
            style={{borderRadius:'6px 6px 0 0'}}
            onClick={() => onPreview(logo)}
          >
            {!imgError
              ? <img src={logo.imagePath} alt={logo.id} draggable={false} onError={() => setImgError(true)}
                  className="w-full h-full object-contain p-3" />
              : <div className="w-full h-full flex flex-col items-center justify-center" style={{color:'#d1d5db'}}>
                  <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1" />
                    <path d="M3 9l4-4 4 4 4-4 4 4" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs text-gray-400">{logo.id}</span>
                </div>
            }
            {done && (
              <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-gray-700 rounded-full flex items-center justify-center">
                <svg fill="none" stroke="white" viewBox="0 0 24 24" style={{width:'9px', height:'9px'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {/* 호버 툴팁 */}
            <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <span style={{background:'rgba(0,0,0,0.6)', color:'white', fontSize:'10px', fontWeight:500, padding:'3px 10px', borderRadius:'9999px', whiteSpace:'nowrap'}}>
                클릭 시 이미지 확대
              </span>
            </div>
          </div>
          {/* Score panel — fixed size */}
          <div className="p-2">
            <p className="font-mono text-gray-400 mb-1.5 text-center" style={{fontSize:'10px', letterSpacing:'0.1em'}}>{logo.id}</p>
            <div className="flex items-center gap-0.5 mb-1">
              <span className="font-bold text-gray-800 shrink-0 text-center" style={{fontSize:'11px', width:'14px'}}>B</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => onRate(logo.id, 'brand_score', n)}
                  className={`flex-1 rounded transition-colors leading-none ${B===n?'bg-gray-900 text-white text-sm font-bold':'bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 active:bg-gray-300'}`}
                  style={{height:'28px'}}>{n}</button>
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="font-bold text-gray-400 shrink-0 text-center" style={{fontSize:'11px', width:'14px'}}>V</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => onRate(logo.id, 'visual_score', n)}
                  className={`flex-1 rounded transition-colors leading-none ${V===n?'bg-gray-500 text-white text-sm font-bold':'bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 active:bg-gray-300'}`}
                  style={{height:'28px'}}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    /* ─── ImagePreviewModal ───────────────────────────────── */
    function ImagePreviewModal({ logo, onClose }) {
      const [imgError, setImgError] = useState(false);
      useEffect(() => {
        const h = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
      }, [onClose]);
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}} onClick={onClose}>
          <div className="bg-white rounded-lg shadow-xl p-4 mx-4" style={{maxWidth:'360px', width:'90vw'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono text-gray-600 font-medium">{logo.id}</span>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">✕</button>
            </div>
            <div className="aspect-square bg-gray-50 rounded flex items-center justify-center overflow-hidden">
              {!imgError
                ? <img src={logo.imagePath} alt={logo.id} onError={() => setImgError(true)} className="w-full h-full object-contain p-4" />
                : <div className="flex flex-col items-center gap-2 text-gray-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" /></svg>
                    <span className="text-sm">{logo.id} — 이미지 없음</span>
                  </div>
              }
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">배경 클릭 또는 ESC 로 닫기</p>
          </div>
        </div>
      );
    }

    /* ─── HoverPreview ────────────────────────────────────── */
    function HoverPreview({ logo, pos }) {
      const [imgError, setImgError] = useState(false);
      return (
        <div className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-3 pointer-events-none" style={{top: pos.top, left: pos.left, width: 240}}>
          <div className="aspect-square bg-gray-50 rounded flex items-center justify-center overflow-hidden mb-2">
            {!imgError
              ? <img src={logo.imagePath} alt={logo.id} onError={() => setImgError(true)} className="w-full h-full object-contain p-3" />
              : <span className="text-gray-300 text-sm">{logo.id}</span>
            }
          </div>
          <p className="text-center text-xs font-mono text-gray-500">{logo.id}</p>
        </div>
      );
    }

    /* ─── LogoGrid ────────────────────────────────────────── */
    const FILTERS = [{value:'all',label:'전체'},{value:'incomplete',label:'미완료'},{value:'completed',label:'완료'}];
    const SORTS = [
      {value:'default',label:'기본 순서'},
      {value:'brand_desc',label:'브랜드 점수 높은 순'},
      {value:'visual_desc',label:'시각 점수 높은 순'},
      {value:'total_desc',label:'종합 점수 높은 순'},
      {value:'incomplete_first',label:'미완료 우선'},
    ];

    function LogoGrid({ logos, ratings, filter, sort, cardSize, onRate, onPreview }) {
      const size = cardSize ?? 180;
      const filtered = useMemo(() => {
        let items = [...logos];
        if (filter === 'incomplete') items = items.filter(l => !isCompleted(ratings[l.id]));
        else if (filter === 'completed') items = items.filter(l => isCompleted(ratings[l.id]));
        if (sort === 'brand_desc') items.sort((a,b) => (ratings[b.id]?.brand_score??0)-(ratings[a.id]?.brand_score??0));
        else if (sort === 'visual_desc') items.sort((a,b) => (ratings[b.id]?.visual_score??0)-(ratings[a.id]?.visual_score??0));
        else if (sort === 'total_desc') items.sort((a,b) => {
          const ra=ratings[a.id],rb=ratings[b.id];
          return (isCompleted(rb)?calcTotalScore(rb.brand_score,rb.visual_score):0)-(isCompleted(ra)?calcTotalScore(ra.brand_score,ra.visual_score):0);
        });
        else if (sort === 'incomplete_first') items.sort((a,b)=>(isCompleted(ratings[a.id])?1:0)-(isCompleted(ratings[b.id])?1:0));
        return items;
      }, [logos, ratings, filter, sort]);

      return (
        <div className="p-3 sm:p-4">
          <div className="flex gap-4 mb-3 text-gray-400" style={{fontSize:'10px'}}>
            <span><span className="inline-block w-3 h-3 bg-gray-900 rounded-sm mr-1 align-middle" />B = 브랜드 적합도</span>
            <span><span className="inline-block w-3 h-3 bg-gray-500 rounded-sm mr-1 align-middle" />V = 시각 완성도</span>
            <span><span className="inline-block w-2.5 h-2.5 bg-gray-700 rounded-full mr-1 align-middle" />평가 완료</span>
          </div>
          {filtered.length === 0
            ? <div className="py-16 text-center text-gray-400 text-sm">해당 조건의 로고가 없습니다.</div>
            : <div className="grid" style={{gridTemplateColumns:`repeat(auto-fill, minmax(${size}px, 1fr))`, gap: size<150?'6px':'10px'}}>
                {filtered.map(logo => (
                  <LogoCard key={logo.id} logo={logo} rating={ratings[logo.id]}
                    onRate={onRate} onPreview={onPreview} />
                ))}
              </div>
          }
        </div>
      );
    }

    /* ─── ResultSummary ───────────────────────────────────── */
    function StatCard({ label, value }) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value ?? '—'}</p>
        </div>
      );
    }

    /* ─── ReviewScreen ───────────────────────────────────── */
    function ReviewScreen({ logos: logoProp, ratings, timestampStart, onBack, onSubmit }) {
      const [confirmed, setConfirmed] = useState(false);
      const logoIds = logoProp.map(l => l.id);
      const completedIds  = logoIds.filter(id => isCompleted(ratings[id]));
      const incompleteIds = logoIds.filter(id => !isCompleted(ratings[id]));
      const allDone = incompleteIds.length === 0;
      const bScores = completedIds.map(id => ratings[id].brand_score);
      const vScores = completedIds.map(id => ratings[id].visual_score);
      const tScores = completedIds.map(id => calcTotalScore(ratings[id].brand_score, ratings[id].visual_score));
      const avg = arr => arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length*100)/100 : null;
      const distOf = arr => { const d={1:0,2:0,3:0,4:0,5:0}; arr.forEach(v=>{d[v]=(d[v]||0)+1;}); return d; };
      const bDist = distOf(bScores), vDist = distOf(vScores);
      const bMax = Math.max(...Object.values(bDist)), vMax = Math.max(...Object.values(vDist));
      const brandWarn  = completedIds.length>=40 && bMax>=40;
      const visualWarn = completedIds.length>=40 && vMax>=40;
      const sameWarn   = brandWarn || visualWarn;
      const durationSec = Math.round((Date.now()-new Date(timestampStart).getTime())/1000);
      const fastWarn = durationSec < 300;
      const canSubmit = allDone && confirmed;
      const fmtDur = s => { if(s<60) return `${s}초`; const m=Math.floor(s/60),r=s%60; return r>0?`${m}분 ${r}초`:`${m}분`; };

      function DistChart({title, dist, warn}) {
        const maxV = Math.max(...Object.values(dist),1);
        const total = Object.values(dist).reduce((s,v)=>s+v,0);
        return (
          <div>
            <p className={`text-gray-400 uppercase tracking-widest mb-3 ${warn?'text-amber-600':''}`} style={{fontSize:'10px',fontWeight:600}}>{title}{warn?' ⚠':''}</p>
            <div className="space-y-2">
              {[1,2,3,4,5].map(n=>{
                const cnt=dist[n]||0, pct=total>0?Math.round(cnt/total*100):0, bar=(cnt/maxV)*100;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-mono shrink-0" style={{width:'16px',textAlign:'right'}}>{n}</span>
                    <div className="flex-1 bg-gray-100 rounded-full overflow-hidden" style={{height:'16px'}}>
                      <div className={`h-full rounded-full transition-all ${cnt>=40?'bg-amber-400':'bg-gray-700'}`} style={{width:`${bar}%`}} />
                    </div>
                    <span className="text-xs text-gray-600 shrink-0" style={{width:'64px',textAlign:'right'}}>{cnt}개 ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* 헤더 */}
            <div className="mb-2">
              <p className="text-gray-400 uppercase tracking-widest mb-1" style={{fontSize:'10px',fontWeight:600}}>제출 전 확인</p>
              <h1 className="text-xl font-semibold text-gray-900">제출 전 평가 내용 확인</h1>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">아래 내용은 응답 누락과 입력 오류를 줄이기 위한 확인 절차입니다. 평가 결과를 수정하려면 '평가 화면으로 돌아가기'를 눌러 주세요.</p>
            </div>
            {/* 경고 */}
            {(!allDone||fastWarn||sameWarn) && (
              <div className="space-y-2">
                {!allDone && <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 leading-relaxed">아직 평가가 완료되지 않은 로고가 있습니다. 미완료 로고를 확인한 뒤 제출해 주세요.</div>}
                {fastWarn  && <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 leading-relaxed">평가 시간이 비교적 짧게 기록되었습니다. 모든 로고 시안을 충분히 확인했는지 제출 전 다시 확인해 주세요.</div>}
                {sameWarn  && <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 leading-relaxed">대부분의 시안에 동일하거나 매우 유사한 점수가 입력되었습니다. 의도한 평가인지 제출 전 한 번 더 확인해 주세요.</div>}
              </div>
            )}
            {/* 요약 */}
            <div className="grid grid-cols-2 gap-2" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
              {[['평가 완료',`${completedIds.length} / ${logoIds.length}`,!allDone],['브랜드 평균',avg(bScores)??'—',false],['시각 평균',avg(vScores)??'—',false],['종합 평균',avg(tScores)??'—',false]].map(([label,value,hl])=>(
                <div key={label} className="bg-white border border-gray-200 rounded-md p-3 text-center">
                  <p className="text-gray-400 uppercase tracking-widest mb-1" style={{fontSize:'10px'}}>{label}</p>
                  <p className={`text-lg font-semibold ${hl?'text-red-600':'text-gray-900'}`}>{value}</p>
                </div>
              ))}
            </div>
            {/* 소요시간 */}
            <div className="bg-white border border-gray-200 rounded-md px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">평가 소요 시간</span>
              <span className={`text-sm font-semibold ${fastWarn?'text-amber-600':'text-gray-900'}`}>{fmtDur(durationSec)}{fastWarn?' ⚠':''}</span>
            </div>
            {/* 미완료 목록 */}
            {incompleteIds.length>0 && (
              <div className="bg-white border border-red-200 rounded-md p-4">
                <p className="text-red-600 uppercase tracking-widest mb-2" style={{fontSize:'10px',fontWeight:600}}>미완료 로고 ({incompleteIds.length}개)</p>
                <div className="flex flex-wrap gap-1.5">
                  {incompleteIds.map(id=>(
                    <span key={id} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200 font-mono">{id}</span>
                  ))}
                </div>
              </div>
            )}
            {/* 분포 차트 */}
            <div className="bg-white border border-gray-200 rounded-md p-5">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <DistChart title="브랜드 점수 분포" dist={bDist} warn={brandWarn} />
                <DistChart title="시각 점수 분포"   dist={vDist} warn={visualWarn} />
              </div>
              {sameWarn && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-amber-600 uppercase tracking-widest mb-1" style={{fontSize:'10px',fontWeight:600}}>동일 점수 반복 감지</p>
                  {brandWarn  && <p className="text-xs text-amber-700">• 브랜드 점수: 최빈값 {bMax}개 집중</p>}
                  {visualWarn && <p className="text-xs text-amber-700">• 시각 점수: 최빈값 {vMax}개 집중</p>}
                </div>
              )}
            </div>
            {/* 확인 체크박스 */}
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer" style={{accentColor:'#111827'}} />
                <span className={`text-sm leading-relaxed transition-colors ${confirmed?'text-gray-900 font-medium':'text-gray-500'}`}>
                  {logoIds.length}개 로고 시안을 모두 확인하고, 브랜드 브리프와 판단 기준에 따라 평가했음을 확인합니다.
                </span>
              </label>
            </div>
            {/* 버튼 */}
            <div className="flex gap-3 pb-8">
              <button onClick={onBack} className="flex-1 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">← 평가 화면으로 돌아가기</button>
              <button onClick={onSubmit} disabled={!canSubmit}
                className={`flex-1 py-3 text-sm font-medium rounded-md transition-colors ${canSubmit?'bg-gray-900 text-white hover:bg-gray-700':'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                최종 제출하기
              </button>
            </div>
          </div>
        </div>
      );
    }

    /* ─── ResultSummary ───────────────────────────────────── */
    function ResultSummary({ data, onDownloadJSON, onDownloadCSV }) {
      const { summary, logos } = data;
      const ranked = logos.filter(l => l.completed).sort((a,b) => b.total_score - a.total_score);
      const top27 = ranked.slice(0, 27);
      const rest = ranked.slice(27);
      const notDone = logos.filter(l => !l.completed);
      return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-2">예비평가 완료</p>
              <h1 className="text-2xl font-semibold text-gray-900">OVBNE 로고 시안 평가 결과</h1>
              <p className="text-xs text-gray-400 mt-1">참가자 ID: {data.participant_id} &nbsp;|&nbsp; 제출 시각: {new Date(data.timestamp_submit).toLocaleString('ko-KR')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="평가 완료" value={`${summary.completed_count} / 50`} />
              <StatCard label="브랜드 평균" value={summary.brand_average?.toFixed(2)} />
              <StatCard label="시각 평균" value={summary.visual_average?.toFixed(2)} />
              <StatCard label="종합 평균" value={summary.total_average?.toFixed(2)} />
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded-md p-4 mb-8 text-sm text-gray-700 leading-relaxed">
              상위 27개는 예비평가 점수에 따른 자동 산출 후보입니다. 최종 본실험 시안은 점수 분포, 스타일 중복, 세트 균형을 연구자가 추가 검토하여 확정합니다.
            </div>
            <div className="flex gap-3 mb-8">
              <button onClick={onDownloadJSON} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">JSON 다운로드</button>
              <button onClick={onDownloadCSV} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">CSV 다운로드</button>
            </div>
            <ResultTable title={<span className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-900 text-white rounded-full text-xs flex items-center justify-center font-bold">27</span>종합 점수 상위 27개 (후보)</span>} rows={top27} startRank={1} />
            {rest.length > 0 && <ResultTable title={`나머지 ${rest.length}개`} rows={rest} startRank={28} dim />}
            {notDone.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">미완료 ({notDone.length}개)</h2>
                <p className="text-xs text-gray-400 flex flex-wrap gap-2">{notDone.map(l => <span key={l.logo_id} className="font-mono">{l.logo_id}</span>)}</p>
              </section>
            )}
            <div className="border-t border-gray-200 pt-6 flex gap-3">
              <button onClick={onDownloadJSON} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors">JSON 다운로드</button>
              <button onClick={onDownloadCSV} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">CSV 다운로드</button>
            </div>
          </div>
        </div>
      );
    }

    function ScreeningApp() {
      const [screen, setScreen] = useState('intro');
      const [logos, setLogos] = useState([]);
      const [manifestStatus, setManifestStatus] = useState({ loading: true, error: null });
      const [eliminatedIds, setEliminatedIds] = useState([]);
      const [qualification, setQualification] = useState({});
      const [basicInfo, setBasicInfo] = useState({});
      
      const [pid, setPid] = useState('E000');
      const [actionEvents, setActionEvents] = useState([]);
      const [tsStart] = useState(() => new Date().toISOString());

      const logEvent = (action, details = {}) => {
        setActionEvents(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action,
          details
        }]);
      };

      useEffect(() => {
        let active = true;
        loadCandidateManifest()
          .then(records => {
            if (!active) return;
            setLogos(records);
            setManifestStatus({ loading: false, error: null });
          })
          .catch(error => {
            if (!active) return;
            setManifestStatus({ loading: false, error: error.message });
          });

        db.collection('screening_submissions').get()
          .then(snapshot => {
            if (!active) return;
            const nextNum = snapshot.size + 1;
            const formatted = 'E' + String(nextNum).padStart(3, '0');
            setPid(formatted);
            logEvent('initialize_id', { id: formatted, existingCount: snapshot.size });
          })
          .catch(err => {
            if (!active) return;
            const fallbackId = 'E' + Math.floor(100 + Math.random() * 900);
            setPid(fallbackId);
            logEvent('initialize_id_fallback', { id: fallbackId, error: err.message });
          });

        return () => { active = false; };
      }, []);

      const goScreen = (nextScreen) => {
        logEvent('screen_change', { from: screen, to: nextScreen });
        setScreen(nextScreen);
      };

      const handleExcludeChange = (nextExcludedIds) => {
        const added = nextExcludedIds.filter(id => !eliminatedIds.includes(id));
        const removed = eliminatedIds.filter(id => !nextExcludedIds.includes(id));
        if (added.length > 0) {
          logEvent('exclude_logo', { logoId: added[0] });
        }
        if (removed.length > 0) {
          logEvent('restore_logo', { logoId: removed[0] });
        }
        setEliminatedIds(nextExcludedIds);
      };

      const handleBasicInfoSubmit = (data) => {
        setBasicInfo(data);
        logEvent('submit_click', { basicInfo: data });
        const submission = buildScreeningResponse(pid, tsStart, logos, eliminatedIds, qualification, data, actionEvents);
        db.collection('screening_submissions').add(submission)
          .then(() => goScreen('complete'))
          .catch(error => {
            console.error(error);
            alert('제출에 실패했습니다. 다시 시도해 주세요.\n' + error.message);
          });
      };

      if (screen === 'intro') return <IntroScreen mode="screening" onStart={() => goScreen('qualification')} />;
      if (screen === 'qualification') return <QualificationScreen value={qualification} onChange={setQualification} onBack={() => goScreen('intro')} onNext={(data) => { setQualification(data); goScreen('brief'); }} />;
      if (screen === 'brief') return <BriefScreen mode="screening" onStart={() => goScreen('eliminate')} onBack={() => goScreen('qualification')} />;
      if (manifestStatus.loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <p className="text-lg font-bold text-slate-950">로딩 중...</p>
        </div>
      );
      if (screen === 'eliminate') return <EliminationScreen logos={logos} excludedIds={eliminatedIds} onExcludeChange={handleExcludeChange} onNext={() => goScreen('basicInfo')} onBack={() => goScreen('brief')} />;
      if (screen === 'basicInfo') return <BasicInfoScreen value={basicInfo} onChange={setBasicInfo} onBack={() => goScreen('eliminate')} onSubmit={handleBasicInfoSubmit} />;
      if (screen === 'complete') return <SubmissionCompleteScreen onFinish={() => window.location.reload()} />;
      
      return null;
    }

    function PasswordProtected({ children }) {
      const [pwd, setPwd] = useState('');
      const [authed, setAuthed] = useState(false);
      
      if (authed) return children;
      
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">관리자 로그인</h2>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { if (pwd === '1234') setAuthed(true); else alert('비밀번호가 틀렸습니다.'); } }} placeholder="비밀번호 입력" className="w-full border rounded p-2 mb-4" />
            <button onClick={() => { if (pwd === '1234') setAuthed(true); else alert('비밀번호가 틀렸습니다.'); }} className="w-full bg-slate-900 text-white font-bold py-2 rounded">확인</button>
          </div>
        </div>
      );
    }

    function AdminApp() {
      const [files, setFiles] = useState([]);
      const [submissions, setSubmissions] = useState([]);
      const [loading, setLoading] = useState(false);
      const [logos, setLogos] = useState([]);
      const [stats, setStats] = useState({});
      const [manualExclusions, setManualExclusions] = useState([]);
      
      const [activeTab, setActiveTab] = useState('A');
      const [dragId, setDragId] = useState(null);
      const [dragOver, setDragOver] = useState(null);

      const fetchFromFirebase = async () => {
        setLoading(true);
        try {
          const snapshot = await db.collection('screening_submissions').get();
          const docs = snapshot.docs.map(doc => doc.data());
          if (docs.length === 0) {
            alert('Firebase에 저장된 1차 선별 결과가 없습니다.');
          } else {
            setSubmissions(docs);
            alert(`Firebase에서 ${docs.length}개의 응답을 성공적으로 불러왔습니다!`);
          }
        } catch (e) {
          alert('Firebase에서 데이터를 불러오지 못했습니다.\n' + e.message);
        }
        setLoading(false);
      };

      const handleFiles = async (e) => {
        const fileList = Array.from(e.target.files);
        setFiles(fileList);
        
        const parsed = [];
        for (const file of fileList) {
          const text = await file.text();
          try {
            parsed.push(JSON.parse(text));
          } catch(err) {
            console.error('Parse error', file.name, err);
          }
        }
        setSubmissions(parsed);
      };

      useEffect(() => {
        if (submissions.length === 0) return;
        loadCandidateManifest().then(manifest => {
          setLogos(manifest);
          
          const excludeCounts = {};
          manifest.forEach(l => excludeCounts[l.id] = 0);
          
          submissions.forEach(sub => {
            (sub.excludedCandidateIds || sub.excluded_candidate_ids || []).forEach(id => {
              if (excludeCounts[id] !== undefined) excludeCounts[id]++;
            });
          });
          
          setStats(excludeCounts);
          
          const grouped = { A: [], B: [], C: [] };
          manifest.forEach(logo => grouped[logo.typeCode].push(logo));
          
          const defaultExclusions = [];
          ['A', 'B', 'C'].forEach(type => {
            const sorted = grouped[type].sort((a, b) => excludeCounts[b.id] - excludeCounts[a.id]);
            const excluded = sorted.slice(0, 7);
            excluded.forEach(l => defaultExclusions.push(l.id));
          });
          
          setManualExclusions(defaultExclusions);
        });
      }, [submissions]);

      const moveTo = (id, target) => {
        const logo = logos.find(item => item.id === id);
        if (!logo) return;
        const isCurrentlyExcluded = manualExclusions.includes(id);

        if (target === 'excluded') {
          if (isCurrentlyExcluded) return;
          const currentExcludedCount = manualExclusions.filter(eid => logos.find(l => l.id === eid)?.typeCode === logo.typeCode).length;
          if (currentExcludedCount >= 7) {
             alert(`유형별 제외 시안은 7개여야 합니다. (A, B, C 그룹별로 각각 9개 유지, 7개 제외)`);
             return;
          }
          setManualExclusions([...manualExclusions, id]);
        } else {
          if (!isCurrentlyExcluded) return;
          const currentSelectedCount = logos.filter(l => l.typeCode === logo.typeCode && !manualExclusions.includes(l.id)).length;
          if (currentSelectedCount >= 9) {
             alert(`유형별 선정 시안은 9개여야 합니다. (A, B, C 그룹별로 각각 9개 유지, 7개 제외)`);
             return;
          }
          setManualExclusions(manualExclusions.filter(item => item !== id));
        }
      };

      const handleDrop = (target) => {
        if (dragId) moveTo(dragId, target);
        setDragId(null);
        setDragOver(null);
      };

      const handleDownload = () => {
        const finalSet = logos.filter(l => !manualExclusions.includes(l.id));
        if (finalSet.length !== 27) {
          alert(`현재 선정된 시안이 ${finalSet.length}개입니다. 27개여야만 다운로드할 수 있습니다.\n각 유형(A, B, C)당 9개씩 선정되었는지 확인해 주세요.`);
          return;
        }

        const typeA = finalSet.filter(l => l.id.startsWith('A')).length;
        const typeB = finalSet.filter(l => l.id.startsWith('B')).length;
        const typeC = finalSet.filter(l => l.id.startsWith('C')).length;

        if (typeA !== 9 || typeB !== 9 || typeC !== 9) {
          alert(`각 유형별로 9개씩 선정해야 합니다.\n현재 A: ${typeA}개, B: ${typeB}개, C: ${typeC}개`);
          return;
        }

        const selectedCandidates = finalSet.map(l => ({
          stimulusId: l.stimulusId,
          typeGroup: l.typeCode,
          localCode: l.candidateId,
          imageSrc: l.imagePath,
          excludeVoteCount: stats[l.id] || 0,
          keepVoteCount: submissions.length - (stats[l.id] || 0),
          mainExcludeReason: ""
        }));

        const output = {
          fileType: "selected_27_for_visual_rating",
          version: "1.0",
          generatedAt: new Date().toISOString(),
          source: "admin_screening_aggregation_manual",
          selectionRule: {
            totalCandidates: 27,
            typeComposition: { A: 9, B: 9, C: 9 }
          },
          selectedCandidates
        };
        
        triggerDownload(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }), 'selected_27_for_visual_rating.json');
      };

      const downloadRawResponsesCSV = () => {
        if (submissions.length === 0) return;
        
        const headers = ['평가자ID(입력값)', '제출시각', '연령대', '전문분야', '실무경력', '로고경험', '최근프로젝트', 'AI경험', '사례지급동의', '연락처_이름', '전화번호', '이메일', '제외시안목록'];
        
        const rows = submissions.map(sub => {
          const profile = sub.evaluatorProfile || {};
          const contact = sub.contactProfile || {};
          const basic = sub.basicInfo || sub.basic_info || {};
          const excludedList = (sub.excludedCandidateIds || sub.excluded_candidate_ids || []).map(id => id.replace(/_L_/g, '')).sort().join(';');
          
          // Robust fallback from actionEvents log where data wasn't saved in top level
          let actionSubmitBasic = {};
          if (Array.isArray(sub.actionEvents)) {
            const submitEvt = sub.actionEvents.find(e => e.action === 'submit_click' || e.action === 'submit');
            if (submitEvt && submitEvt.details && submitEvt.details.basicInfo) {
              actionSubmitBasic = submitEvt.details.basicInfo;
            }
          }
          
          const consent = (basic.incentiveConsent || contact.contactConsent || actionSubmitBasic.incentiveConsent) ? '동의' : '미동의';
          const email = contact.email || basic.incentiveEmail || basic.email || actionSubmitBasic.incentiveEmail || actionSubmitBasic.email || '';
          const phone = contact.phoneNumber || contact.phone || basic.incentivePhone || basic.contact || basic.phone || actionSubmitBasic.incentivePhone || actionSubmitBasic.phone || '';
          const name = contact.name || basic.name || sub.evaluatorCode || basic.evaluatorCode || actionSubmitBasic.name || actionSubmitBasic.evaluatorCode || '';
          
          return [
            sub.evaluatorCode || basic.evaluatorCode || '',
            sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ko-KR') : '',
            profile.ageGroup || basic.ageGroup || '',
            profile.workField || basic.mainField || basic.workField || '',
            profile.designCareer || basic.designExperience || basic.designCareer || '',
            profile.logoCareer || basic.brandProjectExperience || basic.logoCareer || '',
            profile.recentBrandProject || basic.recentProjectExp || basic.recentBrandProject || '',
            profile.aiToolExperience || basic.aiToolExperience || '',
            consent,
            name,
            phone,
            email,
            excludedList
          ];
        });
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `screening_raw_responses_${new Date().getTime()}.csv`);
      };

      const activeLogos = logos.filter(l => l.typeCode === activeTab);
      const activeCandidates = activeLogos.filter(l => !manualExclusions.includes(l.id));
      const activeExcluded = activeLogos.filter(l => manualExclusions.includes(l.id));

      const LogoCard = ({ logo }) => {
        const excl = stats[logo.id] || 0;
        const keep = submissions.length - excl;
        return (
          <div
            draggable
            onDragStart={(e) => { setDragId(logo.id); e.dataTransfer.setData('text/plain', logo.id); }}
            className="bg-white border border-slate-200 rounded p-2 text-center shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-400"
          >
            <img src={logo.imagePath} alt={logo.id} className="w-full aspect-square object-contain mb-2" />
            <div className="font-bold text-sm text-slate-800">{logo.candidateId}</div>
            <div className="text-xs mt-1.5 bg-slate-100 rounded py-1 flex justify-around font-bold shadow-sm">
              <span className="text-rose-600">제외 {excl}</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600">유지 {keep}</span>
            </div>
          </div>
        );
      };

      return (
        <PasswordProtected>
          <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-3xl font-bold tracking-tight">관리자 모드: 1차 예비시안 결과 집계 및 SET 구성</h1>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold mb-1">데이터 취합</h2>
                  <p className="text-sm text-slate-600">Firebase에서 결과를 불러오거나 JSON 파일을 업로드하세요. 현재 {submissions.length}개의 응답 데이터가 로드되었습니다.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={fetchFromFirebase} disabled={loading} className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition">
                    {loading ? '불러오는 중...' : 'Firebase에서 자동으로 불러오기'}
                  </button>
                  <label className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded cursor-pointer hover:bg-slate-200 border border-slate-200">
                    파일 업로드
                    <input type="file" multiple accept=".json" onChange={handleFiles} className="hidden" />
                  </label>
                </div>
              </div>
              
              {logos.length > 0 && submissions.length > 0 && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="flex gap-2">
                      {['A', 'B', 'C'].map(code => (
                        <button key={code} onClick={() => setActiveTab(code)} className={`px-4 py-2 rounded font-bold transition ${activeTab === code ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                          {code} 유형
                        </button>
                      ))}
                    </div>
                    <button onClick={handleDownload} className="bg-emerald-600 text-white px-6 py-2 rounded font-bold hover:bg-emerald-700">
                      최종 27개 세트 다운로드
                    </button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-2 gap-8 bg-slate-100">
                    <div 
                      className={`bg-white rounded-xl border-2 p-4 transition ${dragOver === 'candidate' ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver('candidate'); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => { e.preventDefault(); handleDrop('candidate'); }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 text-lg">선정된 후보</h3>
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-sm">{activeCandidates.length} / 9</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {activeCandidates.map(logo => <LogoCard key={logo.id} logo={logo} />)}
                      </div>
                    </div>

                    <div 
                      className={`bg-white rounded-xl border-2 p-4 transition ${dragOver === 'excluded' ? 'border-blue-400 bg-blue-50' : 'border-transparent'}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver('excluded'); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => { e.preventDefault(); handleDrop('excluded'); }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 text-lg">제외된 시안</h3>
                        <span className="bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded text-sm">{activeExcluded.length} / 7</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {activeExcluded.map(logo => <LogoCard key={logo.id} logo={logo} />)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 참여자별 상세 응답 데이터 표 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">참여자별 기입 원본 데이터</h3>
                      <p className="text-xs text-slate-500 mt-1">실험자가 직접 기입한 모든 정보를 원본 그대로 표시합니다.</p>
                    </div>
                    <button onClick={downloadRawResponsesCSV} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 text-sm transition">
                      전체 데이터 CSV 다운로드
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                          <th className="p-3">기입 ID/이름</th>
                          <th className="p-3">제출 시각</th>
                          <th className="p-3">연령대</th>
                          <th className="p-3">전문 분야</th>
                          <th className="p-3">실무 경력</th>
                          <th className="p-3">로고 경험</th>
                          <th className="p-3">최근 프로젝트</th>
                          <th className="p-3">AI 경험</th>
                          <th className="p-3 text-blue-600">사례동의</th>
                          <th className="p-3 text-blue-600">이름(연락처)</th>
                          <th className="p-3 text-blue-600">전화번호</th>
                          <th className="p-3 text-blue-600">이메일</th>
                          <th className="p-3">제외 시안 코드 목록</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {submissions.map((sub, idx) => {
                          const profile = sub.evaluatorProfile || {};
                          const contact = sub.contactProfile || {};
                          const basic = sub.basicInfo || sub.basic_info || {};
                          const excludedList = (sub.excludedCandidateIds || sub.excluded_candidate_ids || []).map(id => id.replace(/_L_/g, '')).sort().join(', ');
                          
                          // Robust fallback from actionEvents log where data wasn't saved in top level
                          let actionSubmitBasic = {};
                          if (Array.isArray(sub.actionEvents)) {
                            const submitEvt = sub.actionEvents.find(e => e.action === 'submit_click' || e.action === 'submit');
                            if (submitEvt && submitEvt.details && submitEvt.details.basicInfo) {
                              actionSubmitBasic = submitEvt.details.basicInfo;
                            }
                          }
                          
                          const consent = (basic.incentiveConsent || contact.contactConsent || actionSubmitBasic.incentiveConsent) ? '동의' : '미동의';
                          const email = contact.email || basic.incentiveEmail || basic.email || actionSubmitBasic.incentiveEmail || actionSubmitBasic.email || 'N/A';
                          const phone = contact.phoneNumber || contact.phone || basic.incentivePhone || basic.contact || basic.phone || actionSubmitBasic.incentivePhone || actionSubmitBasic.phone || 'N/A';
                          const name = contact.name || basic.name || sub.evaluatorCode || basic.evaluatorCode || actionSubmitBasic.name || actionSubmitBasic.evaluatorCode || 'N/A';
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-xs font-bold text-blue-600">{sub.evaluatorCode || basic.evaluatorCode || 'N/A'}</td>
                              <td className="p-3 text-xs">{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ko-KR') : 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.ageGroup || basic.ageGroup || 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.workField || basic.mainField || basic.workField || 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.designCareer || basic.designExperience || basic.designCareer || 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.logoCareer || basic.brandProjectExperience || basic.logoCareer || 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.recentBrandProject || basic.recentProjectExp || basic.recentBrandProject || 'N/A'}</td>
                              <td className="p-3 text-xs">{profile.aiToolExperience || basic.aiToolExperience || 'N/A'}</td>
                              <td className={`p-3 text-xs font-bold ${basic.incentiveConsent ? 'text-blue-600' : 'text-slate-400'}`}>{consent}</td>
                              <td className="p-3 text-xs">{name}</td>
                              <td className="p-3 text-xs">{phone}</td>
                              <td className="p-3 text-xs">{email}</td>
                              <td className="p-3 text-xs max-w-xs truncate" title={excludedList}>{excludedList || '없음'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
              )}
            </div>
          </div>
        </PasswordProtected>
      );
    }

    function VisualRatingApp() {
      const [screen, setScreen] = useState('loading');
      const [candidatesData, setCandidatesData] = useState(null);
      const [ratings, setRatings] = useState({});
      const [basicInfo, setBasicInfo] = useState({});
      const [qualification, setQualification] = useState({});
      const [pid, setPid] = useState('E000');
      const [actionEvents, setActionEvents] = useState([]);
      const [tsStart] = useState(() => new Date().toISOString());

      const logEvent = (action, details = {}) => {
        setActionEvents(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action,
          details
        }]);
      };

      useEffect(() => {
        let active = true;
        // Try Firebase first
        db.collection('admin').doc('current_visual_rating_set').get()
          .then(doc => {
            if (!active) return;
            if (doc.exists) {
              setCandidatesData(doc.data());
              setScreen('intro');
            } else {
              // Fallback to local JSON
              fetch('../data/selected_27_for_visual_rating.json')
                .then(res => {
                  if (!res.ok) throw new Error('파일을 찾을 수 없습니다.');
                  return res.json();
                })
                .then(data => {
                  if (!active) return;
                  setCandidatesData(data);
                  setScreen('intro');
                })
                .catch(err => {
                  if (!active) return;
                  console.error('Failed to load local dataset:', err);
                  setScreen('waiting');
                });
            }
          })
          .catch(err => {
            if (!active) return;
            console.error('Firebase error, falling back to local JSON:', err);
            // Fallback to local JSON
            fetch('../data/selected_27_for_visual_rating.json')
              .then(res => {
                if (!res.ok) throw new Error('파일을 찾을 수 없습니다.');
                return res.json();
              })
              .then(data => {
                if (!active) return;
                setCandidatesData(data);
                setScreen('intro');
              })
              .catch(err2 => {
                if (!active) return;
                console.error('Failed to load local dataset:', err2);
                setScreen('waiting');
              });
          });

        db.collection('visual_rating_submissions').get()
          .then(snapshot => {
            if (!active) return;
            const nextNum = snapshot.size + 1;
            const formatted = 'E' + String(nextNum).padStart(3, '0');
            setPid(formatted);
            logEvent('initialize_id', { id: formatted, existingCount: snapshot.size });
          })
          .catch(err => {
            if (!active) return;
            const fallbackId = 'E' + Math.floor(100 + Math.random() * 900);
            setPid(fallbackId);
            logEvent('initialize_id_fallback', { id: fallbackId, error: err.message });
          });

        return () => { active = false; };
      }, []);

      const goScreen = (s) => {
        logEvent('screen_change', { from: screen, to: s });
        setScreen(s);
      };

      if (screen === 'loading') {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">데이터를 불러오는 중입니다...</div>;
      }
      if (screen === 'waiting') {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">데이터 대기 중</h1>
            <p className="text-slate-600">
              <code>data/selected_27_for_visual_rating.json</code> 파일을 불러오지 못했습니다.<br/>
              해당 경로에 파일이 올바르게 존재하는지 확인해 주세요.
            </p>
          </div>
        );
      }
      if (!candidatesData) return null;

      const logos = candidatesData.selectedCandidates.map(c => ({
        id: c.stimulusId,
        stimulusId: c.stimulusId,
        typeCode: c.typeGroup,
        candidateId: c.localCode,
        imagePath: publicAssetPath(`/public/logos/pre-eval/${c.typeGroup}/L_${c.stimulusId.split('_').pop()}.png`),
      }));

      if (screen === 'intro') return <IntroScreen mode="visual-rating" onStart={() => goScreen('qualification')} />;
      if (screen === 'qualification') return <QualificationScreen value={qualification} onChange={setQualification} onBack={() => goScreen('intro')} onNext={(data) => { setQualification(data); goScreen('brief'); }} />;
      if (screen === 'brief') return <BriefScreen mode="visual-rating" onBack={() => goScreen('qualification')} onStart={() => goScreen('rating')} />;
      if (screen === 'rating') return <DimensionRatingScreen candidates={logos} initialRatings={ratings} onRatingsChange={setRatings} onBack={() => goScreen('brief')} onNext={() => goScreen('basicInfo')} onLogEvent={logEvent} />;
      if (screen === 'basicInfo') return <BasicInfoScreen value={basicInfo} onChange={setBasicInfo} onBack={() => goScreen('rating')} onSubmit={(info) => {
        setBasicInfo(info);
        logEvent('submit_click', { basicInfo: info });
        const dimensionRatingsArr = logos.map(logo => ({
          stimulusId: logo.stimulusId,
          typeCode: logo.typeCode,
          candidateId: logo.candidateId,
          ratings: ratings[logo.id]
        }));
        const actualId = (info.evaluatorCode || "").trim() || pid;
        const docData = {
          participant_id: actualId,
          timestamp_start: tsStart,
          timestamp_submit: new Date().toISOString(),
          basic_info: info,
          qualification: qualification,
          ratings: dimensionRatingsArr,
          action_events: actionEvents
        };
        db.collection('visual_rating_submissions').add(docData)
          .then(() => goScreen('thanks'))
          .catch(err => {
            console.error(err);
            alert('데이터 저장 실패. 다시 시도해 주세요.');
          });
      }} />;
      if (screen === 'thanks') return <SubmissionCompleteScreen onFinish={() => window.location.reload()} />;

      return null;
    }

    function Admin2App() {
      const [uploading, setUploading] = useState(false);
      const [submissions, setSubmissions] = useState([]);
      const [loading, setLoading] = useState(false);
      const [candidates, setCandidates] = useState([]);
      const [setAssignments, setSetAssignments] = useState(() => {
        try {
          const saved = localStorage.getItem('visual_rating_set_assignments');
          return saved ? JSON.parse(saved) : {};
        } catch (e) {
          return {};
        }
      });

      useEffect(() => {
        localStorage.setItem('visual_rating_set_assignments', JSON.stringify(setAssignments));
      }, [setAssignments]);

      useEffect(() => {
        let active = true;
        db.collection('admin').doc('current_visual_rating_set').get()
          .then(doc => {
            if (!active) return;
            let data = null;
            if (doc.exists) {
              data = doc.data();
            }
            if (data && data.selectedCandidates) {
              const mapped = data.selectedCandidates.map(c => ({
                id: c.stimulusId,
                stimulusId: c.stimulusId,
                typeCode: c.typeGroup,
                candidateId: c.localCode,
              }));
              setCandidates(mapped);
            } else {
              fetch('../data/selected_27_for_visual_rating.json')
                .then(res => res.json())
                .then(localData => {
                  if (!active) return;
                  if (localData && localData.selectedCandidates) {
                    const mapped = localData.selectedCandidates.map(c => ({
                      id: c.stimulusId,
                      stimulusId: c.stimulusId,
                      typeCode: c.typeGroup,
                      candidateId: c.localCode,
                    }));
                    setCandidates(mapped);
                  }
                })
                .catch(err => console.error('Failed to load local JSON in Admin:', err));
            }
          })
          .catch(err => {
            if (!active) return;
            console.error('Firebase error in Admin, falling back to local JSON:', err);
            fetch('../data/selected_27_for_visual_rating.json')
              .then(res => res.json())
              .then(localData => {
                if (!active) return;
                if (localData && localData.selectedCandidates) {
                  const mapped = localData.selectedCandidates.map(c => ({
                    id: c.stimulusId,
                    stimulusId: c.stimulusId,
                    typeCode: c.typeGroup,
                    candidateId: c.localCode,
                  }));
                  setCandidates(mapped);
                }
              })
              .catch(err2 => console.error('Failed to load local JSON in Admin:', err2));
          });

        return () => { active = false; };
      }, []);

      const fetchFromFirebase = async () => {
        setLoading(true);
        try {
          const snapshot = await db.collection('visual_rating_submissions').get();
          const docs = snapshot.docs.map(doc => doc.data());
          if (docs.length === 0) {
            alert('Firebase에 저장된 2차 평가 결과가 없습니다.');
          } else {
            setSubmissions(docs);
          }
        } catch (error) {
          console.error(error);
          alert('데이터를 불러오는 데 실패했습니다.');
        }
        setLoading(false);
      };

      const handleFiles = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed.fileType !== 'selected_27_for_visual_rating') throw new Error('올바른 파일이 아닙니다.');
          
          await db.collection('admin').doc('current_visual_rating_set').set(parsed);
          alert('데이터가 성공적으로 Firebase에 업로드되었습니다!\n이제 2차 평가 페이지에서 자동으로 데이터를 불러옵니다.');

          if (parsed.selectedCandidates) {
            const mapped = parsed.selectedCandidates.map(c => ({
              id: c.stimulusId,
              stimulusId: c.stimulusId,
              typeCode: c.typeGroup,
              candidateId: c.localCode,
            }));
            setCandidates(mapped);
          }
        } catch (err) {
          alert('업로드 실패: ' + err.message);
        }
        setUploading(false);
        e.target.value = null;
      };

      const triggerDownload = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      const downloadRawResponsesCSV = () => {
        if (submissions.length === 0) return;
        
        const headers = ['평가자ID(입력값)', '제출시각', '연령대', '전문분야', '실무경력', '로고경험', '최근프로젝트', 'AI경험', '사례지급동의', '이름(연락처)', '전화번호', '이메일', '평가결과(JSON)'];
        
        const rows = submissions.map(sub => {
          const basic = sub.basic_info || sub.basicInfo || {};
          const qual = sub.qualification || sub.evaluatorProfile || sub.basic_info || {};
          const contact = sub.contactProfile || sub.contact_profile || {};
          
          let actionSubmitBasic = {};
          if (Array.isArray(sub.action_events || sub.actionEvents)) {
            const submitEvt = (sub.action_events || sub.actionEvents).find(e => e.action === 'submit_click' || e.action === 'submit');
            if (submitEvt && submitEvt.details && submitEvt.details.basicInfo) {
              actionSubmitBasic = submitEvt.details.basicInfo;
            }
          }
          
          const consent = (basic.incentiveConsent || contact.contactConsent || actionSubmitBasic.incentiveConsent) ? '동의' : '미동의';
          const email = contact.email || basic.incentiveEmail || basic.email || actionSubmitBasic.incentiveEmail || actionSubmitBasic.email || 'N/A';
          const phone = contact.phoneNumber || contact.phone || basic.incentivePhone || basic.contact || basic.phone || actionSubmitBasic.incentivePhone || actionSubmitBasic.phone || 'N/A';
          const name = contact.name || basic.name || sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || actionSubmitBasic.name || actionSubmitBasic.evaluatorCode || 'N/A';
          
          const ageGroup = qual.ageGroup || basic.ageGroup || '';
          const mainField = basic.mainField || qual.mainField || qual.workField || basic.workField || '';
          const designExperience = basic.designExperience || qual.designExperience || qual.designCareer || basic.designCareer || '';
          const brandProjectExperience = basic.brandProjectExperience || qual.brandProjectExperience || qual.logoCareer || basic.logoCareer || '';
          const recentProjectExp = basic.recentProjectExp || qual.recentProjectExp || qual.recentBrandProject || basic.recentBrandProject || '';
          const aiToolExperience = basic.aiToolExperience || basic.aiToolExperience || '';
          
          const mainFieldStr = Array.isArray(mainField) ? mainField.join(';') : mainField;
          const ratingsStr = JSON.stringify(sub.ratings || []);

          return [
            sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || '',
            sub.timestamp_submit ? new Date(sub.timestamp_submit).toLocaleString('ko-KR') : '',
            ageGroup,
            mainFieldStr,
            designExperience,
            brandProjectExperience,
            recentProjectExp,
            aiToolExperience,
            consent,
            name,
            phone,
            email,
            ratingsStr
          ];
        });
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `visual_rating_responses_${new Date().getTime()}.csv`);
      };

      // 1. Calculate candidates' average scores
      const candidateStats = useMemo(() => {
        if (candidates.length === 0 || submissions.length === 0) return [];
        
        return candidates.map(c => {
          let naturalnessSum = 0;
          let harmonySum = 0;
          let refinementSum = 0;
          let count = 0;
          
          submissions.forEach(sub => {
            const subRatings = sub.ratings || [];
            const ratObj = subRatings.find(r => r.stimulusId === c.stimulusId || r.candidateId === c.candidateId);
            if (ratObj && ratObj.ratings) {
              const nat = ratObj.ratings.naturalness;
              const har = ratObj.ratings.harmony;
              const ref = ratObj.ratings.refinement || ratObj.ratings.elaboration;
              if (nat !== null && nat !== undefined) {
                naturalnessSum += nat;
                harmonySum += har;
                refinementSum += ref;
                count++;
              }
            }
          });
          
          const naturalnessMean = count > 0 ? Number((naturalnessSum / count).toFixed(2)) : 0;
          const harmonyMean = count > 0 ? Number((harmonySum / count).toFixed(2)) : 0;
          const elaborationMean = count > 0 ? Number((refinementSum / count).toFixed(2)) : 0;
          const visualMean = Number(((naturalnessMean + harmonyMean + elaborationMean) / 3).toFixed(2));
          
          return {
            ...c,
            naturalnessMean,
            harmonyMean,
            elaborationMean,
            visualMean,
            count
          };
        });
      }, [candidates, submissions]);

      const runAutoBalance = () => {
        if (candidateStats.length === 0) {
          alert('먼저 Firebase에서 평정 데이터를 불러와 주세요.');
          return;
        }
        const nextAssignments = {};
        
        // Group candidate stats by typeCode (A, B, C)
        const groups = { A: [], B: [], C: [] };
        candidateStats.forEach(s => {
          const type = s.typeCode || 'A';
          if (groups[type]) groups[type].push(s);
        });
        
        // Serpentine ordering
        const serpentine = [1, 2, 3, 3, 2, 1, 1, 2, 3];
        
        Object.keys(groups).forEach(type => {
          // Sort by visualMean descending
          groups[type].sort((a, b) => b.visualMean - a.visualMean);
          
          groups[type].forEach((item, idx) => {
            const setId = serpentine[idx] || 1;
            nextAssignments[item.stimulusId] = setId;
          });
        });
        
        setSetAssignments(nextAssignments);
        alert('자동 균형 배정이 완료되었습니다! (유형별 균형 배정 적용됨)');
      };

      const downloadDetailCSV = () => {
        if (submissions.length === 0) return;
        const headers = ['evaluatorId', 'candidateId', 'typeCode', 'naturalnessScore', 'harmonyScore', 'elaborationScore'];
        const rows = [];
        
        submissions.forEach(sub => {
          const evaluatorId = sub.participant_id || sub.evaluatorCode || (sub.basic_info || {}).evaluatorCode || 'N/A';
          const ratings = sub.ratings || [];
          ratings.forEach(r => {
            rows.push([
              evaluatorId,
              r.candidateId || r.stimulusId || '',
              r.typeCode || '',
              r.ratings?.naturalness ?? '',
              r.ratings?.harmony ?? '',
              r.ratings?.refinement ?? r.ratings?.elaboration ?? ''
            ]);
          });
        });
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `visual_rating_detail_data_${new Date().getTime()}.csv`);
      };

      const downloadAveragesCSV = () => {
        if (candidateStats.length === 0) return;
        const headers = ['candidateId', 'typeCode', 'naturalnessMean', 'harmonyMean', 'elaborationMean', 'visualMean'];
        const rows = candidateStats.map(s => [
          s.candidateId || s.stimulusId,
          s.typeCode,
          s.naturalnessMean,
          s.harmonyMean,
          s.elaborationMean,
          s.visualMean
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `visual_rating_candidate_averages_${new Date().getTime()}.csv`);
      };

      const downloadSetCSV = () => {
        if (candidateStats.length === 0) return;
        const headers = ['setId', 'candidateId', 'typeCode', 'naturalnessMean', 'harmonyMean', 'elaborationMean', 'visualMean'];
        
        const rows = candidateStats
          .map(s => ({
            ...s,
            setId: setAssignments[s.stimulusId] || '미배정'
          }))
          .sort((a, b) => {
            if (a.setId === '미배정') return 1;
            if (b.setId === '미배정') return -1;
            return a.setId - b.setId;
          })
          .map(s => [
            s.setId === '미배정' ? '미배정' : `SET ${s.setId}`,
            s.candidateId || s.stimulusId,
            s.typeCode,
            s.naturalnessMean,
            s.harmonyMean,
            s.elaborationMean,
            s.visualMean
          ]);
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `visual_rating_set_configuration_${new Date().getTime()}.csv`);
      };

      const downloadContactCSV = () => {
        if (submissions.length === 0) return;
        const headers = ['evaluatorId', 'contactConsent', 'name', 'phoneNumber', 'email'];
        const rows = submissions.map(sub => {
          const basic = sub.basic_info || sub.basicInfo || {};
          const contact = sub.contactProfile || sub.contact_profile || {};
          
          let actionSubmitBasic = {};
          if (Array.isArray(sub.action_events || sub.actionEvents)) {
            const submitEvt = (sub.action_events || sub.actionEvents).find(e => e.action === 'submit_click' || e.action === 'submit');
            if (submitEvt && submitEvt.details && submitEvt.details.basicInfo) {
              actionSubmitBasic = submitEvt.details.basicInfo;
            }
          }
          
          const consent = (basic.incentiveConsent || contact.contactConsent || actionSubmitBasic.incentiveConsent) ? '동의' : '미동의';
          const email = contact.email || basic.incentiveEmail || basic.email || actionSubmitBasic.incentiveEmail || actionSubmitBasic.email || '';
          const phone = contact.phoneNumber || contact.phone || basic.incentivePhone || basic.contact || basic.phone || actionSubmitBasic.incentivePhone || actionSubmitBasic.phone || '';
          const name = contact.name || basic.name || sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || actionSubmitBasic.name || actionSubmitBasic.evaluatorCode || '';
          
          return [
            sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || '',
            consent,
            name,
            phone,
            email
          ];
        });
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `visual_rating_contacts_${new Date().getTime()}.csv`);
      };

      const setSummary = useMemo(() => {
        const summary = {
          1: { count: 0, A: 0, B: 0, C: 0, naturalnessSum: 0, harmonySum: 0, elaborationSum: 0, visualSum: 0 },
          2: { count: 0, A: 0, B: 0, C: 0, naturalnessSum: 0, harmonySum: 0, elaborationSum: 0, visualSum: 0 },
          3: { count: 0, A: 0, B: 0, C: 0, naturalnessSum: 0, harmonySum: 0, elaborationSum: 0, visualSum: 0 },
        };
        
        candidateStats.forEach(s => {
          const setId = setAssignments[s.stimulusId];
          if (setId && summary[setId]) {
            summary[setId].count++;
            const type = s.typeCode;
            if (type === 'A' || type === 'B' || type === 'C') {
              summary[setId][type]++;
            }
            summary[setId].naturalnessSum += s.naturalnessMean;
            summary[setId].harmonySum += s.harmonyMean;
            summary[setId].elaborationSum += s.elaborationMean;
            summary[setId].visualSum += s.visualMean;
          }
        });
        
        const result = {};
        [1, 2, 3].forEach(id => {
          const s = summary[id];
          result[id] = {
            count: s.count,
            A: s.A,
            B: s.B,
            C: s.C,
            naturalnessMean: s.count > 0 ? Number((s.naturalnessSum / s.count).toFixed(2)) : 0,
            harmonyMean: s.count > 0 ? Number((s.harmonySum / s.count).toFixed(2)) : 0,
            elaborationMean: s.count > 0 ? Number((s.elaborationSum / s.count).toFixed(2)) : 0,
            visualMean: s.count > 0 ? Number((s.visualSum / s.count).toFixed(2)) : 0,
          };
        });
        return result;
      }, [candidateStats, setAssignments]);

      // Max-Min deviations
      const deviations = useMemo(() => {
        const keys = ['naturalnessMean', 'harmonyMean', 'elaborationMean', 'visualMean'];
        const dev = {};
        keys.forEach(k => {
          const val1 = setSummary[1][k];
          const val2 = setSummary[2][k];
          const val3 = setSummary[3][k];
          dev[k] = Number((Math.max(val1, val2, val3) - Math.min(val1, val2, val3)).toFixed(2));
        });
        return dev;
      }, [setSummary]);

      return (
        <PasswordProtected>
          <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
            <div className="max-w-6xl mx-auto space-y-6">
              <h1 className="text-3xl font-bold tracking-tight">관리자 모드: 2차 시각체계 평정 데이터 관리</h1>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold mb-4">본실험 27개 세트 (JSON) 연동하기</h2>
                  <p className="text-slate-600 text-sm mb-4">1차 선별 관리자 페이지에서 다운로드한 <code className="bg-slate-100 px-1 py-0.5 rounded">selected_27_for_visual_rating.json</code> 파일을 업로드해 주세요.<br/>업로드 즉시 2차 평가 시스템에 반영됩니다.</p>
                  <input type="file" accept=".json" onChange={handleFiles} disabled={uploading} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition" />
                  {uploading && <p className="text-blue-600 mt-2 text-sm font-semibold">서버에 업로드 중입니다...</p>}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center mt-6">
                <div>
                  <h2 className="text-xl font-bold mb-1">2차 평가 참여 데이터 확인</h2>
                  <p className="text-sm text-slate-600">Firebase에서 2차 평가 결과를 불러옵니다. 현재 {submissions.length}개의 응답 데이터가 로드되었습니다.</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={fetchFromFirebase} disabled={loading} className="px-4 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800 transition">
                    {loading ? '불러오는 중..' : 'Firebase에서 불러오기'}
                  </button>
                </div>
              </div>
              
              {submissions.length > 0 && (
                <>
                  {/* 참여자 원본 데이터 테이블 */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">참여자별 기입 원본 데이터</h3>
                        <p className="text-xs text-slate-500 mt-1">실험자가 직접 기입한 모든 정보를 원본 그대로 표시합니다.</p>
                      </div>
                      <button onClick={downloadRawResponsesCSV} className="bg-slate-900 text-white px-4 py-2 rounded font-bold hover:bg-slate-800 text-sm transition">
                        전체 응답 CSV 다운로드 (백업용)
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                            <th className="p-3">기입 ID/이름</th>
                            <th className="p-3">제출 시각</th>
                            <th className="p-3">연령대</th>
                            <th className="p-3">전문 분야</th>
                            <th className="p-3">실무 경력</th>
                            <th className="p-3">로고 경험</th>
                            <th className="p-3">최근 프로젝트</th>
                            <th className="p-3">AI 경험</th>
                            <th className="p-3 text-blue-600">사례동의</th>
                            <th className="p-3 text-blue-600">이름(연락처)</th>
                            <th className="p-3 text-blue-600">전화번호</th>
                            <th className="p-3 text-blue-600">이메일</th>
                            <th className="p-3">평가결과 길이</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {submissions.map((sub, idx) => {
                            const basic = sub.basic_info || sub.basicInfo || {};
                            const qual = sub.qualification || sub.evaluatorProfile || sub.basic_info || {};
                            const contact = sub.contactProfile || sub.contact_profile || {};
                            
                            let actionSubmitBasic = {};
                            if (Array.isArray(sub.action_events || sub.actionEvents)) {
                              const submitEvt = (sub.action_events || sub.actionEvents).find(e => e.action === 'submit_click' || e.action === 'submit');
                              if (submitEvt && submitEvt.details && submitEvt.details.basicInfo) {
                                actionSubmitBasic = submitEvt.details.basicInfo;
                              }
                            }
                            
                            const consent = (basic.incentiveConsent || contact.contactConsent || actionSubmitBasic.incentiveConsent) ? '동의' : '미동의';
                            const email = contact.email || basic.incentiveEmail || basic.email || actionSubmitBasic.incentiveEmail || actionSubmitBasic.email || 'N/A';
                            const phone = contact.phoneNumber || contact.phone || basic.incentivePhone || basic.contact || basic.phone || actionSubmitBasic.incentivePhone || actionSubmitBasic.phone || 'N/A';
                            const name = contact.name || basic.name || sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || actionSubmitBasic.name || actionSubmitBasic.evaluatorCode || 'N/A';
                            
                            const ageGroup = qual.ageGroup || basic.ageGroup || '';
                            const mainField = basic.mainField || qual.mainField || qual.workField || basic.workField || '';
                            const designExperience = basic.designExperience || qual.designExperience || qual.designCareer || basic.designCareer || '';
                            const brandProjectExperience = basic.brandProjectExperience || qual.brandProjectExperience || qual.logoCareer || basic.logoCareer || '';
                            const recentProjectExp = basic.recentProjectExp || qual.recentProjectExp || qual.recentBrandProject || basic.recentBrandProject || '';
                            const aiToolExperience = basic.aiToolExperience || basic.aiToolExperience || '';

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-xs font-bold text-blue-600">{sub.participant_id || sub.evaluatorCode || basic.evaluatorCode || 'N/A'}</td>
                                <td className="p-3 text-xs">{sub.timestamp_submit ? new Date(sub.timestamp_submit).toLocaleString('ko-KR') : 'N/A'}</td>
                                <td className="p-3 text-xs">{ageGroup || 'N/A'}</td>
                                <td className="p-3 text-xs">{Array.isArray(mainField) ? mainField.join(', ') : (mainField || 'N/A')}</td>
                                <td className="p-3 text-xs">{designExperience || 'N/A'}</td>
                                <td className="p-3 text-xs">{brandProjectExperience || 'N/A'}</td>
                                <td className="p-3 text-xs">{recentProjectExp || 'N/A'}</td>
                                <td className="p-3 text-xs">{aiToolExperience || 'N/A'}</td>
                                <td className={`p-3 text-xs font-bold ${basic.incentiveConsent ? 'text-blue-600' : 'text-slate-400'}`}>{consent}</td>
                                <td className="p-3 text-xs">{name}</td>
                                <td className="p-3 text-xs">{phone}</td>
                                <td className="p-3 text-xs">{email}</td>
                                <td className="p-3 text-xs font-mono text-slate-500">{(sub.ratings || []).length}개</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2.5">
                      <button onClick={downloadDetailCSV} className="bg-slate-700 text-white px-3.5 py-2 rounded-lg font-bold hover:bg-slate-800 text-xs transition shadow-sm">
                        📁 1. 평정 상세 데이터 다운로드 (CSV)
                      </button>
                      <button onClick={downloadAveragesCSV} className="bg-slate-700 text-white px-3.5 py-2 rounded-lg font-bold hover:bg-slate-800 text-xs transition shadow-sm">
                        📊 2. 시안별 평균 데이터 다운로드 (CSV)
                      </button>
                      <button onClick={downloadSetCSV} className="bg-slate-700 text-white px-3.5 py-2 rounded-lg font-bold hover:bg-slate-800 text-xs transition shadow-sm">
                        ⚙️ 3. SET 구성 데이터 다운로드 (CSV)
                      </button>
                      <button onClick={downloadContactCSV} className="bg-slate-700 text-white px-3.5 py-2 rounded-lg font-bold hover:bg-slate-800 text-xs transition shadow-sm">
                        📞 4. 연락처 분리 데이터 다운로드 (CSV)
                      </button>
                    </div>
                  </div>

                  {/* 세트별 시각체계 평정 평균 분포 시각화 막대 그래프 */}
                  {candidateStats.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                      <h2 className="text-xl font-bold mb-1">세트별 시각체계 평정 평균 분포 시각화</h2>
                      <p className="text-sm text-slate-500 mb-6">각 SET의 시각적 요소(자연성, 조화성, 정교성) 및 전체 시각체계 평균 분포를 비교하여 편중 여부를 시각적으로 검토합니다.</p>
                      
                      <div className="grid gap-6 md:grid-cols-4">
                        {/* Group 1: 자연성 */}
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
                          <p className="text-sm font-black text-slate-800 text-center mb-3">자연성 평균</p>
                          <div className="h-40 flex items-end justify-center gap-6 px-2 border-b border-slate-300 pb-1">
                            {[1, 2, 3].map(setId => {
                              const val = setSummary[setId].naturalnessMean;
                              const heightPct = val > 0 ? `${(val / 5.0) * 100}%` : '4%';
                              return (
                                <div key={setId} className="flex flex-col items-center gap-1 w-10">
                                  <span className="text-[11px] font-bold text-slate-700">{val.toFixed(2)}</span>
                                  <div 
                                    style={{ height: heightPct }} 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${
                                      setId === 1 ? 'bg-slate-800' : setId === 2 ? 'bg-slate-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="text-[10px] font-black text-slate-800 mt-1">SET {setId}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Group 2: 조화성 */}
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
                          <p className="text-sm font-black text-slate-800 text-center mb-3">조화성 평균</p>
                          <div className="h-40 flex items-end justify-center gap-6 px-2 border-b border-slate-300 pb-1">
                            {[1, 2, 3].map(setId => {
                              const val = setSummary[setId].harmonyMean;
                              const heightPct = val > 0 ? `${(val / 5.0) * 100}%` : '4%';
                              return (
                                <div key={setId} className="flex flex-col items-center gap-1 w-10">
                                  <span className="text-[11px] font-bold text-slate-700">{val.toFixed(2)}</span>
                                  <div 
                                    style={{ height: heightPct }} 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${
                                      setId === 1 ? 'bg-slate-800' : setId === 2 ? 'bg-slate-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="text-[10px] font-black text-slate-800 mt-1">SET {setId}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Group 3: 정교성 */}
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
                          <p className="text-sm font-black text-slate-800 text-center mb-3">정교성 평균</p>
                          <div className="h-40 flex items-end justify-center gap-6 px-2 border-b border-slate-300 pb-1">
                            {[1, 2, 3].map(setId => {
                              const val = setSummary[setId].elaborationMean;
                              const heightPct = val > 0 ? `${(val / 5.0) * 100}%` : '4%';
                              return (
                                <div key={setId} className="flex flex-col items-center gap-1 w-10">
                                  <span className="text-[11px] font-bold text-slate-700">{val.toFixed(2)}</span>
                                  <div 
                                    style={{ height: heightPct }} 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${
                                      setId === 1 ? 'bg-slate-800' : setId === 2 ? 'bg-slate-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="text-[10px] font-black text-slate-800 mt-1">SET {setId}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Group 4: 시각체계 평균 */}
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col justify-between">
                          <p className="text-sm font-black text-slate-800 text-center mb-3">시각체계 평균</p>
                          <div className="h-40 flex items-end justify-center gap-6 px-2 border-b border-slate-300 pb-1">
                            {[1, 2, 3].map(setId => {
                              const val = setSummary[setId].visualMean;
                              const heightPct = val > 0 ? `${(val / 5.0) * 100}%` : '4%';
                              return (
                                <div key={setId} className="flex flex-col items-center gap-1 w-10">
                                  <span className="text-[11px] font-bold text-slate-700">{val.toFixed(2)}</span>
                                  <div 
                                    style={{ height: heightPct }} 
                                    className={`w-full rounded-t-sm transition-all duration-500 ${
                                      setId === 1 ? 'bg-slate-800' : setId === 2 ? 'bg-slate-500' : 'bg-slate-300'
                                    }`}
                                  />
                                  <span className="text-[10px] font-black text-slate-800 mt-1">SET {setId}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-6 justify-center text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-800 rounded-sm"></div>SET 1</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-500 rounded-sm"></div>SET 2</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div>SET 3</div>
                      </div>
                    </div>
                  )}

                  {/* 표 3: 본실험용 시안 SET 구성 기준 */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">[표 3] 본실험용 시안 SET 구성 기준</h2>
                        <p className="text-xs text-slate-500 mt-1">각 세트에 9개의 시안이 균형 있게 배정되었는지, 그리고 평균 평가 점수가 한쪽 세트에 편중되지 않았는지 확인합니다.</p>
                      </div>
                      <button onClick={runAutoBalance} className="px-4 py-2.5 bg-slate-950 text-white font-extrabold rounded-lg hover:bg-slate-800 text-xs transition shadow-sm shrink-0">
                        ⚡ 자동 균형 배정 (Auto Balance)
                      </button>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                            <th className="p-3">구분</th>
                            <th className="p-3">SET 1</th>
                            <th className="p-3">SET 2</th>
                            <th className="p-3">SET 3</th>
                            <th className="p-3 text-red-600">최대 편차 (Max - Min)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          <tr>
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">전체 시안 수</td>
                            <td className="p-3 font-semibold">{setSummary[1].count}개</td>
                            <td className="p-3 font-semibold">{setSummary[2].count}개</td>
                            <td className="p-3 font-semibold">{setSummary[3].count}개</td>
                            <td className={`p-3 font-bold ${Math.max(setSummary[1].count, setSummary[2].count, setSummary[3].count) === Math.min(setSummary[1].count, setSummary[2].count, setSummary[3].count) ? 'text-green-600' : 'text-amber-600'}`}>
                              {Math.max(setSummary[1].count, setSummary[2].count, setSummary[3].count) - Math.min(setSummary[1].count, setSummary[2].count, setSummary[3].count)}개
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">A 유형 (구상 암시형)</td>
                            <td className="p-3">{setSummary[1].A}개</td>
                            <td className="p-3">{setSummary[2].A}개</td>
                            <td className="p-3">{setSummary[3].A}개</td>
                            <td className={`p-3 font-bold ${setSummary[1].A === 3 && setSummary[2].A === 3 && setSummary[3].A === 3 ? 'text-green-600' : 'text-amber-600'}`}>
                              {Math.max(setSummary[1].A, setSummary[2].A, setSummary[3].A) - Math.min(setSummary[1].A, setSummary[2].A, setSummary[3].A)}개
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">B 유형 (기하학적 추상형)</td>
                            <td className="p-3">{setSummary[1].B}개</td>
                            <td className="p-3">{setSummary[2].B}개</td>
                            <td className="p-3">{setSummary[3].B}개</td>
                            <td className={`p-3 font-bold ${setSummary[1].B === 3 && setSummary[2].B === 3 && setSummary[3].B === 3 ? 'text-green-600' : 'text-amber-600'}`}>
                              {Math.max(setSummary[1].B, setSummary[2].B, setSummary[3].B) - Math.min(setSummary[1].B, setSummary[2].B, setSummary[3].B)}개
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">C 유형 (유기적 추상형)</td>
                            <td className="p-3">{setSummary[1].C}개</td>
                            <td className="p-3">{setSummary[2].C}개</td>
                            <td className="p-3">{setSummary[3].C}개</td>
                            <td className={`p-3 font-bold ${setSummary[1].C === 3 && setSummary[2].C === 3 && setSummary[3].C === 3 ? 'text-green-600' : 'text-amber-600'}`}>
                              {Math.max(setSummary[1].C, setSummary[2].C, setSummary[3].C) - Math.min(setSummary[1].C, setSummary[2].C, setSummary[3].C)}개
                            </td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">자연성 평균</td>
                            <td className="p-3">{setSummary[1].naturalnessMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[2].naturalnessMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[3].naturalnessMean.toFixed(2)}</td>
                            <td className={`p-3 font-bold ${deviations.naturalnessMean < 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                              {deviations.naturalnessMean.toFixed(2)}
                            </td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">조화성 평균</td>
                            <td className="p-3">{setSummary[1].harmonyMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[2].harmonyMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[3].harmonyMean.toFixed(2)}</td>
                            <td className={`p-3 font-bold ${deviations.harmonyMean < 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                              {deviations.harmonyMean.toFixed(2)}
                            </td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="p-3 font-bold bg-slate-50 text-slate-800">정교성 평균</td>
                            <td className="p-3">{setSummary[1].elaborationMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[2].elaborationMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[3].elaborationMean.toFixed(2)}</td>
                            <td className={`p-3 font-bold ${deviations.elaborationMean < 0.2 ? 'text-green-600' : 'text-amber-600'}`}>
                              {deviations.elaborationMean.toFixed(2)}
                            </td>
                          </tr>
                          <tr className="bg-slate-50 text-slate-900 font-bold">
                            <td className="p-3 font-bold bg-slate-100 text-slate-900">시각체계 평균</td>
                            <td className="p-3">{setSummary[1].visualMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[2].visualMean.toFixed(2)}</td>
                            <td className="p-3">{setSummary[3].visualMean.toFixed(2)}</td>
                            <td className={`p-3 font-extrabold ${deviations.visualMean < 0.15 ? 'text-green-600' : 'text-amber-600'}`}>
                              {deviations.visualMean.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 시안별 평정 점수 평균 및 수동 세트 배정 테이블 */}
                  {candidateStats.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">시안별 2차 평정 결과 및 세트 배정</h3>
                          <p className="text-xs text-slate-500 mt-1">27개 각 시안별 평가 평균 점수를 조회하고, 본실험용 세트를 지정하거나 수동 수정할 수 있습니다.</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                              <th className="p-3">시안 이미지</th>
                              <th className="p-3">시안 ID</th>
                              <th className="p-3">유형</th>
                              <th className="p-3">응답자 수</th>
                              <th className="p-3">자연성 평균</th>
                              <th className="p-3">조화성 평균</th>
                              <th className="p-3">정교성 평균</th>
                              <th className="p-3 font-bold text-slate-900">시각체계 평균</th>
                              <th className="p-3 text-blue-600 font-bold">본실험 SET 배정</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {candidateStats.map((s, idx) => {
                              const imgUrl = publicAssetPath(`/public/logos/pre-eval/${s.typeCode}/L_${s.stimulusId.split('_').pop()}.png`);
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="w-12 h-12 border border-slate-200 rounded bg-white flex items-center justify-center overflow-hidden">
                                      <img src={imgUrl} alt={s.candidateId} className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-800">{s.candidateId || s.stimulusId}</td>
                                  <td className="p-3 font-semibold text-slate-600">
                                    {s.typeCode === 'A' ? 'A (구상)' : s.typeCode === 'B' ? 'B (기하)' : s.typeCode === 'C' ? 'C (유기)' : s.typeCode}
                                  </td>
                                  <td className="p-3 font-mono text-slate-500">{s.count}명</td>
                                  <td className="p-3 font-mono">{s.naturalnessMean.toFixed(2)}</td>
                                  <td className="p-3 font-mono">{s.harmonyMean.toFixed(2)}</td>
                                  <td className="p-3 font-mono">{s.elaborationMean.toFixed(2)}</td>
                                  <td className="p-3 font-mono font-bold text-slate-900">{s.visualMean.toFixed(2)}</td>
                                  <td className="p-3">
                                    <select
                                      value={setAssignments[s.stimulusId] || ''}
                                      onChange={e => setSetAssignments(prev => ({ ...prev, [s.stimulusId]: e.target.value ? Number(e.target.value) : '' }))}
                                      className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-500 shadow-sm"
                                    >
                                      <option value="">-- 미배정 --</option>
                                      <option value="1">SET 1</option>
                                      <option value="2">SET 2</option>
                                      <option value="3">SET 3</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </PasswordProtected>
      );
    }

    function App() {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      if (path.includes('visual-rating/admin2')) return <Admin2App />;
      if (path.includes('visual-rating')) return <VisualRatingApp />;
      if (path.includes('admin') && !path.includes('visual-rating')) return <AdminApp />;
      
      const mode = new URLSearchParams(search).get('mode');
      if (mode === 'visual-rating') return <VisualRatingApp />;
      if (mode === 'admin') return <AdminApp />;

      return <ScreeningApp />;
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
