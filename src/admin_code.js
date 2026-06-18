    function VisualRatingApp() {
      const [screen, setScreen] = useState('loading');
      const [candidatesData, setCandidatesData] = useState(null);
      const [ratings, setRatings] = useState({});
      const [basicInfo, setBasicInfo] = useState({});
      const [pid] = useState(generateId);
      const [tsStart] = useState(() => new Date().toISOString());

      useEffect(() => {
        fetch('../data/selected_27_for_visual_rating.json')
          .then(res => {
            if (!res.ok) throw new Error('파일을 찾을 수 없습니다.');
            return res.json();
          })
          .then(data => {
            setCandidatesData(data);
            setScreen('intro');
          })
          .catch(err => {
            console.error('Failed to load dataset:', err);
            setScreen('waiting');
          });
      }, []);

      const goScreen = (s) => setScreen(s);

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
        imagePath: c.imageSrc,
      }));

      if (screen === 'intro') return <IntroScreen mode="visual-rating" onStart={() => goScreen('brief')} />;
      if (screen === 'brief') return <BriefScreen mode="visual-rating" onBack={() => goScreen('upload')} onStart={() => goScreen('rating')} />;
      if (screen === 'rating') return <DimensionRatingScreen candidates={logos} initialRatings={ratings} onRatingsChange={setRatings} onBack={() => goScreen('brief')} onNext={() => goScreen('basicInfo')} />;
      if (screen === 'basicInfo') return <BasicInfoScreen value={basicInfo} onChange={setBasicInfo} onBack={() => goScreen('rating')} onSubmit={(info) => {
        setBasicInfo(info);
        const dimensionRatingsArr = logos.map(logo => ({
          stimulusId: logo.stimulusId,
          typeCode: logo.typeCode,
          candidateId: logo.candidateId,
          ratings: ratings[logo.id]
        }));
        const docData = {
          participant_id: pid,
          timestamp_start: tsStart,
          timestamp_submit: new Date().toISOString(),
          basic_info: info,
          ratings: dimensionRatingsArr,
        };
        db.collection('visual_rating_submissions').add(docData)
          .then(() => goScreen('thanks'))
          .catch(err => {
            console.error(err);
            alert('데이터 저장 실패. 다시 시도해 주세요.');
          });
      }} />;
      if (screen === 'thanks') return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-bold text-xl">참여해 주셔서 감사합니다! (2차 평가 완료)</div>;

      return null;
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
            console.error('Failed to parse', file.name);
          }
        }
        setSubmissions(parsed);
      };

      useEffect(() => {
        if (window.LOGOS) {
          setLogos(window.LOGOS);
          const initialExclusions = window.LOGOS.map(l => l.id).filter(id => {
            const idx = parseInt(id.replace(/[^0-9]/g, ''));
            return idx > 9;
          });
          setManualExclusions(initialExclusions);
        }
      }, []);

      useEffect(() => {
        if (!submissions.length || !logos.length) return;
        const newStats = {};
        logos.forEach(l => {
          newStats[l.id] = { keep: 0, exclude: 0 };
        });
        submissions.forEach(sub => {
          if (!sub.eliminated_logos) return;
          const eliminatedSet = new Set(sub.eliminated_logos);
          logos.forEach(l => {
            if (eliminatedSet.has(l.id)) newStats[l.id].exclude++;
            else newStats[l.id].keep++;
          });
        });
        setStats(newStats);
      }, [submissions, logos]);

      const toggleExclusion = (logoId) => {
        setManualExclusions(prev => {
          if (prev.includes(logoId)) return prev.filter(id => id !== logoId);
          return [...prev, logoId];
        });
      };

      const handleDragStart = (e, id) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
      };

      const handleDragOver = (e, id) => {
        e.preventDefault();
        setDragOver(id);
      };

      const handleDrop = (e, targetId, isExcludingTarget) => {
        e.preventDefault();
        setDragOver(null);
        if (!dragId || dragId === targetId) return;

        setManualExclusions(prev => {
          const newExclusions = new Set(prev);
          if (isExcludingTarget) {
            newExclusions.add(dragId);
            newExclusions.delete(targetId);
          } else {
            newExclusions.delete(dragId);
            newExclusions.add(targetId);
          }
          return Array.from(newExclusions);
        });
        setDragId(null);
      };

      const downloadResultJSON = () => {
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

        const outData = {
          fileType: "selected_27_for_visual_rating",
          exportedAt: new Date().toISOString(),
          selectedCandidates: finalSet.map(l => ({
            stimulusId: l.id,
            typeGroup: l.id.charAt(0),
            localCode: l.id.substring(1),
            imageSrc: l.src,
          })),
        };
        const blob = new Blob([JSON.stringify(outData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected_27_for_visual_rating.json';
        a.click();
      };

      return (
        <PasswordProtected>
          <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">관리자 모드: 1차 평가 집계</h1>
                <button onClick={downloadResultJSON} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold shadow hover:bg-slate-800 transition">최종 27개 데이터 내보내기 (JSON)</button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                <button onClick={fetchFromFirebase} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">Firebase에서 응답 불러오기</button>
                <div className="text-sm text-slate-500">또는 파일 업로드:</div>
                <input type="file" multiple accept=".json" onChange={handleFiles} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition" />
                <div className="ml-auto text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-full">총 응답 수: {submissions.length}명</div>
              </div>

              <div className="flex space-x-1 border-b border-slate-200">
                {['A', 'B', 'C'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>유형 {tab}</button>
                ))}
              </div>

              {['A', 'B', 'C'].map(tab => {
                if (tab !== activeTab) return null;
                const tabLogos = logos.filter(l => l.id.startsWith(tab));
                
                let selectedList = tabLogos.filter(l => !manualExclusions.includes(l.id));
                let excludedList = tabLogos.filter(l => manualExclusions.includes(l.id));
                
                selectedList.sort((a, b) => (stats[b.id]?.keep || 0) - (stats[a.id]?.keep || 0));
                excludedList.sort((a, b) => (stats[b.id]?.exclude || 0) - (stats[a.id]?.exclude || 0));

                return (
                  <div key={tab} className="grid grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">선정 후보</h2>
                          <p className="text-sm text-slate-500">다음 실험에 사용될 9개 시안 (드래그하여 순위 변경/제외)</p>
                        </div>
                        <div className={`text-lg font-black ${selectedList.length === 9 ? 'text-green-600' : 'text-red-500'}`}>{selectedList.length} / 9</div>
                      </div>
                      <div className="space-y-3 min-h-[400px]">
                        {selectedList.map((l, i) => (
                          <div 
                            key={l.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, l.id)}
                            onDragOver={(e) => handleDragOver(e, l.id)}
                            onDrop={(e) => handleDrop(e, l.id, false)}
                            className={`flex items-center gap-4 p-3 rounded-lg border-2 bg-slate-50 cursor-grab active:cursor-grabbing transition-all ${dragOver === l.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                          >
                            <div className="text-lg font-black text-slate-400 w-6 text-center">{i + 1}</div>
                            <img src={l.src} alt={l.id} className="w-16 h-16 object-contain bg-white rounded shadow-sm" />
                            <div className="flex-1">
                              <div className="font-bold text-slate-900">{l.id}</div>
                              <div className="text-xs text-slate-500">유지 표: <span className="font-bold text-blue-600">{stats[l.id]?.keep || 0}</span> | 제외 표: {stats[l.id]?.exclude || 0}</div>
                            </div>
                            <button onClick={() => toggleExclusion(l.id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition">제외하기 ➔</button>
                          </div>
                        ))}
                        {selectedList.length === 0 && <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">후보가 없습니다. 우측에서 드래그해 오세요.</div>}
                      </div>
                    </div>

                    <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">제외된 시안</h2>
                          <p className="text-sm text-slate-500">실험에서 탈락할 7개 시안</p>
                        </div>
                        <div className={`text-lg font-black ${excludedList.length === 7 ? 'text-green-600' : 'text-slate-500'}`}>{excludedList.length} / 7</div>
                      </div>
                      <div className="space-y-3 min-h-[400px]">
                        {excludedList.map((l, i) => (
                          <div 
                            key={l.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, l.id)}
                            onDragOver={(e) => handleDragOver(e, l.id)}
                            onDrop={(e) => handleDrop(e, l.id, true)}
                            className={`flex items-center gap-4 p-3 rounded-lg border-2 bg-white cursor-grab active:cursor-grabbing opacity-75 transition-all ${dragOver === l.id ? 'border-blue-400 bg-blue-50 opacity-100' : 'border-slate-200 hover:border-slate-300 hover:opacity-100'}`}
                          >
                            <img src={l.src} alt={l.id} className="w-12 h-12 object-contain bg-slate-50 rounded" />
                            <div className="flex-1">
                              <div className="font-bold text-slate-700">{l.id}</div>
                              <div className="text-xs text-slate-500">제외 표: <span className="font-bold text-red-500">{stats[l.id]?.exclude || 0}</span> | 유지 표: {stats[l.id]?.keep || 0}</div>
                            </div>
                            <button onClick={() => toggleExclusion(l.id)} className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition">⬅ 살리기</button>
                          </div>
                        ))}
                        {excludedList.length === 0 && <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">제외된 항목이 없습니다. 좌측에서 드래그해 오세요.</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PasswordProtected>
      );
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

    function Admin2App() {
      const [uploading, setUploading] = useState(false);
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
        } catch (err) {
          alert('업로드 실패: ' + err.message);
        }
        setUploading(false);
        e.target.value = null;
      };

      return (
        <PasswordProtected>
          <div className="min-h-screen bg-slate-50 p-10 text-slate-900">
            <div className="max-w-3xl mx-auto space-y-6">
              <h1 className="text-3xl font-bold tracking-tight">관리자 모드: 2차 시각체계 평정 데이터 관리</h1>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold mb-4">본실험 27개 세트 (JSON) 연동하기</h2>
                <p className="text-slate-600 text-sm mb-4">1차 선별 관리자 페이지에서 다운로드한 <code className="bg-slate-100 px-1 py-0.5 rounded">selected_27_for_visual_rating.json</code> 파일을 업로드해 주세요.<br/>업로드 즉시 2차 평가 시스템에 반영됩니다.</p>
                <input type="file" accept=".json" onChange={handleFiles} disabled={uploading} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition" />
                {uploading && <p className="text-blue-600 mt-2 text-sm font-semibold">서버에 업로드 중입니다...</p>}
              </div>
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
