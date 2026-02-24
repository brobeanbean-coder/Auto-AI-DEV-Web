"use client";

import { useState } from "react";

// 설정값
const WEBSITE_TYPES = ["쇼핑몰","포트폴리오","랜딩페이지","블로그","회사 소개","예약/예매 사이트","SaaS 대시보드","커뮤니티/포럼"];
const DESIGN_STYLES = ["미니멀","모던","클래식","다크 모드","글래스모피즘","뉴모피즘","그라데이션"];
const PAGE_OPTIONS = ["메인 (홈)","소개 (About)","서비스/상품","가격표 (Pricing)","문의 (Contact)","블로그/뉴스","FAQ","로그인/회원가입","마이페이지","장바구니/결제"];
const FEATURE_OPTIONS = ["반응형 디자인","다크/라이트 모드 전환","검색 기능","로그인/회원가입","장바구니","결제 기능","이미지 슬라이더","애니메이션 효과","소셜 미디어 연동","SEO 최적화"];

type LogEntry = { agent: string; stage: string; message: string; round: number };
type CodeResult = { html: string; css: string; js: string };

export default function Home() {
  const [activeTab, setActiveTab] = useState<"input"|"monitor"|"result">("input");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [code, setCode] = useState<CodeResult|null>(null);
  const [codeTab, setCodeTab] = useState<"preview"|"html"|"css"|"js">("preview");
  const [currentStage, setCurrentStage] = useState("");
  const [currentRound, setCurrentRound] = useState(0);

  // Form state
  const [form, setForm] = useState({
    projectName: "",
    websiteType: "쇼핑몰",
    designStyle: "미니멀",
    primaryColor: "#4F46E5",
    secondaryColor: "#10B981",
    pages: ["메인 (홈)"] as string[],
    features: ["반응형 디자인"] as string[],
    referenceUrl: "",
    additionalNotes: "",
    autoApprove: true,
    maxRounds: 3,
  });

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const handleSubmit = async () => {
    if (!form.projectName) { alert("프로젝트 이름을 입력해주세요!"); return; }
    setLoading(true);
    setLogs([]);
    setCode(null);
    setActiveTab("monitor");
    setCurrentStage("planning");
    setCurrentRound(1);

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.logs) setLogs(data.logs);
      if (data.code) {
        setCode(data.code);
        setActiveTab("result");
      }
      setCurrentStage(data.success ? "complete" : "error");
      setCurrentRound(data.roundsUsed || 0);
    } catch (err) {
      setLogs(prev => [...prev, { agent: "System", stage: "error", message: `오류: ${err}`, round: 0 }]);
    } finally {
      setLoading(false);
    }
  };

  const agentIcon = (agent: string) => {
    if (agent === "Planner") return "🧠";
    if (agent === "Developer") return "💻";
    if (agent === "Reviewer") return "🔍";
    return "⚙️";
  };

  const agentClass = (agent: string) => {
    if (agent === "Planner") return "planner";
    if (agent === "Developer") return "developer";
    if (agent === "Reviewer") return "reviewer";
    return "system";
  };

  const stageIdx = (s: string) =>
    s === "planning" ? 0 : s === "developing" ? 1 : s === "reviewing" ? 2 : s === "complete" ? 4 : 3;

  const combinedHtml = code ? (() => {
    let h = code.html;
    if (code.css && !h.includes("<style>")) h = h.replace("</head>", `<style>${code.css}</style></head>`);
    if (code.js) h = h.replace("</body>", `<script>${code.js}<\/script></body>`);
    return h;
  })() : "";

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3>⚙️ 설정</h3>
        <div className="divider" />
        <h3>에이전트 구성</h3>
        <table className="agent-table">
          <thead><tr><th>역할</th><th>AI</th><th>모델</th></tr></thead>
          <tbody>
            <tr><td>🧠 기획</td><td>GPT</td><td>gpt-4o</td></tr>
            <tr><td>💻 개발</td><td>Claude</td><td>claude-sonnet</td></tr>
            <tr><td>🔍 리뷰</td><td>Gemini</td><td>gemini-2.5-pro</td></tr>
          </tbody>
        </table>
        <div className="divider" />
        <p style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>Auto AI DEV v1.0</p>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="header">
          <h1>🤖 Auto AI DEV</h1>
          <p>GPT · Claude · Gemini가 토론하며 자동으로 웹사이트를 만들어 줍니다</p>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab==="input"?"active":""}`} onClick={()=>setActiveTab("input")}>📝 요구사항 입력</button>
          <button className={`tab ${activeTab==="monitor"?"active":""}`} onClick={()=>setActiveTab("monitor")}>📡 실시간 모니터링</button>
          <button className={`tab ${activeTab==="result"?"active":""}`} onClick={()=>setActiveTab("result")}>🎉 결과물</button>
        </div>

        {/* Tab: Input */}
        {activeTab === "input" && (
          <>
            <div className="form-section">
              <h3>1. 기본 정보</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>프로젝트 이름 *</label>
                  <input placeholder="예: my-shopping-mall" value={form.projectName} onChange={e=>setForm({...form,projectName:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>웹사이트 종류 *</label>
                  <select value={form.websiteType} onChange={e=>setForm({...form,websiteType:e.target.value})}>
                    {WEBSITE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>2. 디자인</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>디자인 스타일</label>
                  <select value={form.designStyle} onChange={e=>setForm({...form,designStyle:e.target.value})}>
                    {DESIGN_STYLES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>색상</label>
                  <div className="color-picker-wrapper">
                    <input type="color" value={form.primaryColor} onChange={e=>setForm({...form,primaryColor:e.target.value})} />
                    <span style={{fontSize:"0.8rem"}}>메인</span>
                    <input type="color" value={form.secondaryColor} onChange={e=>setForm({...form,secondaryColor:e.target.value})} />
                    <span style={{fontSize:"0.8rem"}}>보조</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>3. 페이지 구성</h3>
              <div className="checkbox-grid">
                {PAGE_OPTIONS.map(p=>(
                  <label key={p} className="checkbox-item">
                    <input type="checkbox" checked={form.pages.includes(p)} onChange={()=>setForm({...form,pages:toggleArrayItem(form.pages,p)})} />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>4. 필수 기능</h3>
              <div className="checkbox-grid">
                {FEATURE_OPTIONS.map(f=>(
                  <label key={f} className="checkbox-item">
                    <input type="checkbox" checked={form.features.includes(f)} onChange={()=>setForm({...form,features:toggleArrayItem(form.features,f)})} />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>5. 참고 자료</h3>
              <div className="form-group">
                <label>참고 사이트 URL (선택)</label>
                <input placeholder="https://example.com" value={form.referenceUrl} onChange={e=>setForm({...form,referenceUrl:e.target.value})} />
              </div>
            </div>

            <div className="form-section">
              <h3>6. 추가 요구사항</h3>
              <div className="form-group">
                <label>자유롭게 작성해 주세요</label>
                <textarea placeholder="예: 한국어 기반, 카카오 로그인 포함, 네이버 지도 연동 등" value={form.additionalNotes} onChange={e=>setForm({...form,additionalNotes:e.target.value})} />
              </div>
            </div>

            <div className="form-section">
              <h3>7. 실행 설정</h3>
              <div className="toggle-row">
                <div>
                  <label>자동 허용 모드 (Auto-Approve)</label>
                  <small>ON: AI끼리 자동으로 토론→수정→완성</small>
                </div>
                <input type="checkbox" checked={form.autoApprove} onChange={e=>setForm({...form,autoApprove:e.target.checked})} style={{width:20,height:20,accentColor:"var(--primary)"}} />
              </div>
              <div className="form-group" style={{marginTop:"1rem"}}>
                <label>최대 토론 반복 횟수: {form.maxRounds}회</label>
                <input type="range" min={1} max={10} value={form.maxRounds} onChange={e=>setForm({...form,maxRounds:+e.target.value})} style={{accentColor:"var(--primary)"}} />
              </div>
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "AI들이 토론 중..." : "🚀 개발 시작"}
            </button>
          </>
        )}

        {/* Tab: Monitor */}
        {activeTab === "monitor" && (
          <>
            <div className="progress-bar">
              <div className="progress-fill" style={{width:`${Math.min(stageIdx(currentStage)/4*100,100)}%`}} />
            </div>
            <div className="stages">
              {["기획","개발","리뷰","완성"].map((s,i)=>(
                <span key={s} className={stageIdx(currentStage)>i?"done":stageIdx(currentStage)===i?"active":""}>{s}</span>
              ))}
            </div>
            <p style={{fontSize:"0.8rem",color:"var(--text-muted)",marginBottom:"1rem"}}>
              토론 라운드: {currentRound} / {form.maxRounds}
            </p>
            <div className="form-section" style={{maxHeight:500,overflowY:"auto"}}>
              {logs.length === 0 && <p style={{color:"var(--text-muted)",textAlign:"center",padding:"2rem"}}>요구사항을 입력하고 개발을 시작하세요.</p>}
              {logs.map((log,i) => (
                <div key={i} className="log-entry">
                  <div className={`log-avatar ${agentClass(log.agent)}`}>{agentIcon(log.agent)}</div>
                  <div className="log-content">
                    <div className="log-meta">{log.agent} · Round {log.round} · {log.stage}</div>
                    <div className="log-message">{log.message.length > 500 ? log.message.slice(0,500)+"..." : log.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab: Result */}
        {activeTab === "result" && (
          <>
            {!code ? (
              <p style={{color:"var(--text-muted)",textAlign:"center",padding:"3rem"}}>아직 생성된 결과물이 없습니다.</p>
            ) : (
              <>
                <p style={{color:"var(--success)",marginBottom:"1rem"}}>✅ 웹사이트가 완성되었습니다! (토론 {currentRound}회 진행)</p>
                <div className="code-tabs">
                  {(["preview","html","css","js"] as const).map(t=>(
                    <button key={t} className={`code-tab ${codeTab===t?"active":""}`} onClick={()=>setCodeTab(t)}>
                      {t==="preview"?"미리보기":t.toUpperCase()}
                    </button>
                  ))}
                </div>
                {codeTab === "preview" && (
                  <iframe srcDoc={combinedHtml} className="preview-frame" sandbox="allow-scripts" />
                )}
                {codeTab === "html" && <pre className="code-block">{code.html}</pre>}
                {codeTab === "css" && <pre className="code-block">{code.css}</pre>}
                {codeTab === "js" && <pre className="code-block">{code.js||"(없음)"}</pre>}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
