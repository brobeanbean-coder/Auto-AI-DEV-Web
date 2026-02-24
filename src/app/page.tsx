"use client";

import { useState } from "react";

// 설정값
const WEBSITE_TYPES = ["쇼핑몰","포트폴리오","랜딩페이지","블로그","회사 소개","예약/예매 사이트","SaaS 대시보드","커뮤니티/포럼"];
const DESIGN_STYLES = ["미니멀","모던","클래식","다크 모드","글래스모피즘","뉴모피즘","그라데이션"];

// 유형별 페이지 구성
const TYPE_PAGES: Record<string, string[]> = {
  "쇼핑몰": ["메인 (홈)","상품 목록","상품 상세","장바구니","결제 (체크아웃)","결제 완료","회원가입/로그인","마이페이지 (주문내역/배송조회)","위시리스트","교환/반품 신청","1:1 문의/고객센터","FAQ","공지사항","이벤트/프로모션","검색 결과","관리자 대시보드"],
  "포트폴리오": ["메인 (홈/히어로)","소개 (About Me)","프로젝트 목록","프로젝트 상세","이력/경력 (Resume)","스킬/역량","서비스 소개","후기/추천사","블로그 (선택)","연락처 (Contact)"],
  "랜딩페이지": ["메인 (단일 페이지 — 히어로/기능소개/CTA)","감사 페이지 (Thank You)","이용약관","개인정보처리방침"],
  "블로그": ["메인 (홈)","글 목록 (카테고리/태그별)","글 상세","검색 결과","작성자 프로필","카테고리/태그 아카이브","소개 (About)","연락처","로그인/회원가입","글 작성/편집 (관리자)","관리자 대시보드"],
  "회사 소개": ["메인 (홈)","회사 소개 (미션/비전/연혁)","서비스/제품 소개","서비스/제품 상세","팀 소개","실적/포트폴리오","고객사/파트너","뉴스/보도자료","채용 안내","연락처 (오시는 길)","FAQ","견적 문의"],
  "예약/예매 사이트": ["메인 (홈/검색 위젯)","검색 결과","상세 정보","예약 단계 (날짜/시간 선택)","좌석 선택","예약자 정보 입력","결제","예약 완료","회원가입/로그인","마이페이지 (예약내역/변경/취소)","리뷰","FAQ/도움말","관리자 대시보드"],
  "SaaS 대시보드": ["랜딩 페이지 (마케팅)","기능 소개","요금제 (Pricing)","회원가입/온보딩","로그인","대시보드 (메인)","데이터 테이블/리스트","분석/리포트","차트/그래프 뷰","설정 (계정/프로필/보안)","팀/조직 관리","빌링/결제 (구독)","API 키 관리","알림 센터","도움말/문서"],
  "커뮤니티/포럼": ["메인 (홈/인기글/최신글)","카테고리/게시판 목록","게시글 목록","게시글 상세 (본문+댓글)","게시글 작성/편집","검색 결과","회원가입/로그인","사용자 프로필","마이페이지 (내 글/북마크/알림)","알림 센터","메시지/쪽지","랭킹/리더보드","관리자 대시보드"],
};

// 유형별 필수 기능
const TYPE_FEATURES: Record<string, string[]> = {
  "쇼핑몰": ["반응형 디자인","장바구니 (수량/옵션 변경)","결제 (PG 연동)","회원 인증 (이메일/소셜)","상품 검색 (자동완성/필터/정렬)","상품 옵션 선택 (사이즈/색상)","재고 관리/품절 표시","쿠폰/할인코드","포인트/적립금","배송지 관리","주문 상태 추적","상품 리뷰/평점","위시리스트","추천/관련 상품","교환/반품/환불","SEO 최적화"],
  "포트폴리오": ["반응형 디자인","스무스 스크롤 네비게이션","프로젝트 필터링 (카테고리별)","이미지/영상 갤러리 (라이트박스)","스크롤 기반 애니메이션","연락처 폼 (이메일 발송)","이력서 PDF 다운로드","소셜 미디어 링크","다크모드 전환","SEO 최적화","빠른 로딩 속도"],
  "랜딩페이지": ["반응형 디자인","히어로 섹션 (헤드라인+CTA)","CTA 버튼 (다수 배치)","리드 캡처 폼","폼 유효성 검사","이메일 마케팅 연동","고객 후기/사회적 증거","카운트다운 타이머","스크롤 애니메이션","A/B 테스트 지원","전환 추적 (GA/Pixel)","팝업/모달","영상 임베드","FAQ 아코디언","SEO 최적화"],
  "블로그": ["반응형 디자인","리치 텍스트 에디터","카테고리/태그 시스템","검색 기능","댓글 시스템","소셜 공유 버튼","목차(TOC) 자동 생성","읽기 시간 표시","관련 글 추천","페이지네이션/무한스크롤","RSS 피드","SEO 최적화","코드 하이라이팅","다크모드","뉴스레터 구독"],
  "회사 소개": ["반응형 디자인","회사 연혁 타임라인","팀원 프로필 카드","지도 API (오시는 길)","연락처/견적 문의 폼","회사 소개 영상","숫자 카운트 애니메이션","고객사 로고 슬라이더","뉴스/보도자료 관리","채용 공고/지원서 접수","다국어 지원","SEO 최적화"],
  "예약/예매 사이트": ["반응형 디자인","실시간 예약 가능 여부","캘린더 날짜/시간 선택","좌석 배치도 선택","인원/수량 선택","실시간 가격 계산","결제 (PG 연동)","예약 확인 이메일/SMS","예약 변경/취소 (환불)","일정 관리 (관리자)","리뷰/평점","검색 필터링","지도 연동","알림/리마인더","QR코드 티켓","SEO 최적화"],
  "SaaS 대시보드": ["반응형 디자인","사용자 인증 (SSO/2FA)","역할 기반 접근 제어 (RBAC)","대시보드 위젯 (차트/KPI)","실시간 데이터 업데이트","데이터 시각화 (차트/그래프)","데이터 테이블 (정렬/필터/검색)","CSV/Excel/PDF 내보내기","날짜 범위 선택","알림 시스템","구독/빌링 관리","팀/조직 관리","API 키 관리","온보딩 가이드","다크모드","감사 로그"],
  "커뮤니티/포럼": ["반응형 디자인","게시글 CRUD","리치 텍스트 에디터","댓글/대댓글 (스레드)","좋아요/추천 (투표)","북마크/스크랩","멘션 (@사용자)","해시태그/태그","검색 기능","정렬 (최신/인기/댓글순)","실시간 알림","쪽지/DM","사용자 등급/레벨","뱃지/업적","신고/차단","관리자 모더레이션"],
};

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
    pages: [...TYPE_PAGES["쇼핑몰"]] as string[],
    features: [...TYPE_FEATURES["쇼핑몰"]] as string[],
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
                  <select value={form.websiteType} onChange={e=>{
                    const t = e.target.value;
                    setForm({...form, websiteType: t, pages: [...(TYPE_PAGES[t]||[])], features: [...(TYPE_FEATURES[t]||[])]});
                  }}>
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
              <h3>3. 페이지 구성 <span style={{fontSize:"0.8rem",color:"var(--text-muted)",fontWeight:400}}>— {form.websiteType} 기준</span></h3>
              <div className="checkbox-grid">
                {(TYPE_PAGES[form.websiteType]||[]).map(p=>(
                  <label key={p} className="checkbox-item">
                    <input type="checkbox" checked={form.pages.includes(p)} onChange={()=>setForm({...form,pages:toggleArrayItem(form.pages,p)})} />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>4. 필수 기능 <span style={{fontSize:"0.8rem",color:"var(--text-muted)",fontWeight:400}}>— {form.websiteType} 기준</span></h3>
              <div className="checkbox-grid">
                {(TYPE_FEATURES[form.websiteType]||[]).map(f=>(
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
