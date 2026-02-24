import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 300;

type LogEntry = { agent: string; stage: string; message: string; round: number };

// 코드 블록 추출
function extractCode(text: string) {
  const html = text.match(/```html\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  const css = text.match(/```css\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  const js = text.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  return { html, css, js };
}

// Gemini 헬퍼
async function geminiGenerate(genai: GoogleGenerativeAI, model: string, prompt: string): Promise<string> {
  const m = genai.getGenerativeModel({ model });
  const res = await m.generateContent(prompt);
  return res.response.text();
}

// URL에서 HTML 가져오기 (서버사이드)
async function fetchHtmlFromUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoAIDev/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    // 너무 길면 잘라냄 (토큰 절약)
    return html.length > 30000 ? html.slice(0, 30000) + "\n<!-- ... 이하 생략 -->" : html;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const logs: LogEntry[] = [];
  const maxRounds = body.maxRounds || 3;
  const autoApprove = body.autoApprove ?? true;
  const freeMode = body.freeMode ?? false;
  const focusAreas = (body.focusAreas as string[]) || [];
  const additionalNotes = body.additionalNotes || "";

  const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  const openai = freeMode ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = freeMode ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // === Step 0: HTML 코드 확보 ===
    let originalHtml = body.htmlCode || "";
    if (!originalHtml && body.url) {
      logs.push({ agent: "System", stage: "analyzing", message: `URL에서 HTML을 가져오는 중: ${body.url}`, round: 0 });
      originalHtml = await fetchHtmlFromUrl(body.url);
      if (!originalHtml) {
        logs.push({ agent: "System", stage: "error", message: "URL에서 HTML을 가져올 수 없습니다. HTML 코드를 직접 입력해주세요.", round: 0 });
        return NextResponse.json({ success: false, logs, roundsUsed: 0, error: "URL fetch failed" }, { status: 400 });
      }
    }

    if (!originalHtml.trim()) {
      return NextResponse.json({ success: false, logs, roundsUsed: 0, error: "No HTML provided" }, { status: 400 });
    }

    const focusText = focusAreas.length > 0 ? `\n[개선 초점 영역]\n${focusAreas.join(", ")}` : "";
    const notesText = additionalNotes ? `\n[사용자 추가 요구사항]\n${additionalNotes}` : "";

    // === Phase 1: 분석 (Analyzer) ===
    logs.push({ agent: "System", stage: "analyzing", message: "기존 웹사이트 분석을 시작합니다...", round: 1 });

    const analyzePrompt = `당신은 10년 경력의 시니어 웹 UX/UI 전문가이자 프론트엔드 아키텍트입니다.

다음 웹사이트 HTML 코드를 철저히 분석하세요.

[기존 HTML 코드]
${originalHtml}
${focusText}
${notesText}

분석 보고서를 작성하세요:
1. **현재 상태 요약**: 어떤 웹사이트인지, 구조, 사용된 기술
2. **문제점 목록**: 디자인, 반응형, 성능, 접근성, SEO, 코드 품질 등
3. **개선 우선순위**: 가장 영향력 큰 순서로 정렬
4. **구체적 개선 제안**: 각 문제에 대한 해결 방안
5. **개선 후 기대 효과**

한국어로 작성하세요.`;

    let analyzeOutput = "";

    if (freeMode) {
      analyzeOutput = await geminiGenerate(genai, "gemini-2.0-flash", analyzePrompt);
    } else {
      const res = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: analyzePrompt }],
        temperature: 0.7,
      });
      analyzeOutput = res.choices[0]?.message?.content || "";
    }

    logs.push({ agent: "Analyzer", stage: "analyzing", message: analyzeOutput, round: 1 });

    // === Phase 2~N: 개선 개발 → 리뷰 반복 ===
    let codeOutput = "";
    let approved = false;
    let reviewOutput = "";
    let roundsUsed = 0;

    for (let round = 1; round <= maxRounds; round++) {
      roundsUsed = round;

      // 개선 개발
      logs.push({ agent: "System", stage: "developing", message: `Round ${round}: 개선 개발 단계...`, round });

      const devPrompt = round === 1
        ? `당신은 시니어 프론트엔드 개발자입니다.

다음 분석 보고서를 바탕으로 기존 웹사이트를 대폭 개선한 코드를 작성하세요.

[분석 보고서]
${analyzeOutput}

[기존 HTML 코드]
${originalHtml}
${focusText}
${notesText}

[개선 요구사항]
- 기존 구조와 콘텐츠를 최대한 유지하면서 개선
- 모든 개선사항을 반영
- 반응형 디자인 필수
- 시맨틱 HTML5, 모던 CSS3, 바닐라 JS
- 완전히 동작하는 코드

반드시 아래 형식으로 분리:
\`\`\`html
(코드)
\`\`\`
\`\`\`css
(코드)
\`\`\`
\`\`\`javascript
(코드)
\`\`\``
        : `이전 리뷰 피드백을 반영하여 코드를 추가 개선하세요.

[피드백]
${reviewOutput}

[이전 코드]
${codeOutput}

반드시 전체 코드를 아래 형식으로 분리:
\`\`\`html
(코드)
\`\`\`
\`\`\`css
(코드)
\`\`\`
\`\`\`javascript
(코드)
\`\`\``;

      if (freeMode) {
        codeOutput = await geminiGenerate(genai, "gemini-2.5-pro-preview-05-06", devPrompt);
      } else {
        const devRes = await anthropic!.messages.create({
          model: "claude-sonnet-4-5-20250514",
          max_tokens: 8192,
          messages: [{ role: "user", content: devPrompt }],
        });
        codeOutput = devRes.content.map(b => b.type === "text" ? b.text : "").join("");
      }

      logs.push({ agent: "Developer", stage: "developing", message: codeOutput, round });

      // 리뷰
      logs.push({ agent: "System", stage: "reviewing", message: `Round ${round}: 리뷰 단계...`, round });

      const reviewModelName = freeMode ? "gemini-2.0-flash" : "gemini-2.5-pro-preview-05-06";
      reviewOutput = await geminiGenerate(genai, reviewModelName,
        `당신은 코드 리뷰 전문가입니다.

다음은 기존 웹사이트를 개선한 코드입니다. 개선이 제대로 되었는지 리뷰하세요.

[개선된 코드]
${codeOutput}

[원본 분석 보고서]
${analyzeOutput}
${focusText}
${notesText}

[리뷰 기준]
1. 분석 보고서의 문제점이 해결되었는가
2. HTML 시맨틱/접근성
3. CSS 반응형/효율성
4. JS 로직/성능
5. 기존 콘텐츠/기능이 유지되었는가
6. 전반적 품질 개선

모든 항목이 만족스러우면 반드시 'APPROVED'를 포함하세요. 개선이 필요하면 구체적 피드백을 제공하세요.`
      );

      logs.push({ agent: "Reviewer", stage: "reviewing", message: reviewOutput, round });

      if (reviewOutput.toUpperCase().includes("APPROVED")) {
        approved = true;
        logs.push({ agent: "System", stage: "complete", message: `Round ${round}에서 개선 코드가 승인되었습니다!`, round });
        break;
      }

      if (!autoApprove) {
        logs.push({ agent: "System", stage: "reviewing", message: "자동 허용 모드 OFF. 중단합니다.", round });
        break;
      }

      if (round < maxRounds) {
        logs.push({ agent: "System", stage: "revising", message: `리뷰 미통과. Round ${round + 1}으로 추가 개선...`, round });
      }
    }

    const code = extractCode(codeOutput);

    return NextResponse.json({
      success: approved,
      code,
      logs,
      roundsUsed,
    });

  } catch (error) {
    logs.push({ agent: "System", stage: "error", message: `오류: ${error}`, round: 0 });
    return NextResponse.json({ success: false, logs, roundsUsed: 0, error: String(error) }, { status: 500 });
  }
}
