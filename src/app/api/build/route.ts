import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 300; // Vercel Pro: 5분 제한

type LogEntry = { agent: string; stage: string; message: string; round: number };

// 코드 블록 추출
function extractCode(text: string) {
  const html = text.match(/```html\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  const css = text.match(/```css\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  const js = text.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/)?.[1]?.trim() || "";
  return { html, css, js };
}

// 요구사항 텍스트 생성
function formatRequirements(form: Record<string, unknown>) {
  return [
    `- 프로젝트명: ${form.projectName}`,
    `- 웹사이트 종류: ${form.websiteType}`,
    `- 디자인 스타일: ${form.designStyle}`,
    `- 메인 색상: ${form.primaryColor}`,
    `- 보조 색상: ${form.secondaryColor}`,
    `- 포함 페이지: ${(form.pages as string[]).join(", ")}`,
    `- 필수 기능: ${(form.features as string[]).join(", ")}`,
    form.referenceUrl ? `- 참고 사이트: ${form.referenceUrl}` : "",
    form.additionalNotes ? `- 추가 요구사항: ${form.additionalNotes}` : "",
  ].filter(Boolean).join("\n");
}

// ===== Gemini 헬퍼 (무료 모드용) =====
async function geminiGenerate(genai: GoogleGenerativeAI, model: string, prompt: string): Promise<string> {
  const m = genai.getGenerativeModel({ model });
  const res = await m.generateContent(prompt);
  return res.response.text();
}

export async function POST(req: NextRequest) {
  const form = await req.json();
  const logs: LogEntry[] = [];
  const maxRounds = form.maxRounds || 3;
  const autoApprove = form.autoApprove ?? true;
  const freeMode = form.freeMode ?? false;

  const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

  // 유료 모드에서만 초기화
  const openai = freeMode ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = freeMode ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const reqText = formatRequirements(form);

  try {
    // === Phase 1: 기획 ===
    logs.push({ agent: "System", stage: "planning", message: `기획 단계를 시작합니다... (${freeMode ? "무료 모드 — Gemini Only" : "프로 모드"})`, round: 1 });

    let planOutput = "";

    if (freeMode) {
      // 무료: Gemini 2.0 Flash로 기획
      planOutput = await geminiGenerate(genai, "gemini-2.0-flash",
        `당신은 10년 경력의 시니어 웹 기획자입니다.\n\n다음 요구사항을 분석하여 웹사이트 기획서를 작성하세요.\n\n${reqText}\n\n기획서에 포함할 내용:\n1. 전체 사이트맵\n2. 각 페이지별 섹션 구성\n3. 디자인 가이드라인\n4. 반응형 브레이크포인트\n\n한국어로 작성하세요.`
      );
    } else {
      // 유료: GPT-4o로 기획
      const planRes = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: `당신은 10년 경력의 시니어 웹 기획자입니다.\n\n다음 요구사항을 분석하여 웹사이트 기획서를 작성하세요.\n\n${reqText}\n\n기획서에 포함할 내용:\n1. 전체 사이트맵\n2. 각 페이지별 섹션 구성\n3. 디자인 가이드라인\n4. 반응형 브레이크포인트\n\n한국어로 작성하세요.`
        }],
        temperature: 0.7,
      });
      planOutput = planRes.choices[0]?.message?.content || "";
    }

    logs.push({ agent: "Planner", stage: "planning", message: planOutput, round: 1 });

    // === Phase 2~N: 개발 → 리뷰 반복 ===
    let codeOutput = "";
    let approved = false;
    let reviewOutput = "";
    let roundsUsed = 0;

    for (let round = 1; round <= maxRounds; round++) {
      roundsUsed = round;

      // 개발
      logs.push({ agent: "System", stage: "developing", message: `Round ${round}: 개발 단계...`, round });

      const devPrompt = round === 1
        ? `다음 기획서를 바탕으로 웹사이트 코드를 작성하세요.\n\n[기획서]\n${planOutput}\n\n[기술 요구사항]\n- 메인 색상: ${form.primaryColor}\n- 보조 색상: ${form.secondaryColor}\n- 반응형 디자인 필수\n- 시맨틱 HTML5, 모던 CSS3, 바닐라 JS\n\n반드시 아래 형식으로 분리:\n\`\`\`html\n(코드)\n\`\`\`\n\`\`\`css\n(코드)\n\`\`\`\n\`\`\`javascript\n(코드)\n\`\`\``
        : `이전 리뷰 피드백을 반영하여 코드를 수정하세요.\n\n[피드백]\n${reviewOutput}\n\n[이전 코드]\n${codeOutput}\n\n반드시 전체 코드를 아래 형식으로 분리:\n\`\`\`html\n(코드)\n\`\`\`\n\`\`\`css\n(코드)\n\`\`\`\n\`\`\`javascript\n(코드)\n\`\`\``;

      if (freeMode) {
        // 무료: Gemini 2.5 Pro로 개발
        codeOutput = await geminiGenerate(genai, "gemini-2.5-pro-preview-05-06", devPrompt);
      } else {
        // 유료: Claude로 개발
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
        `당신은 코드 리뷰 전문가입니다.\n\n다음 코드를 리뷰하세요:\n${codeOutput}\n\n[사용자 요구사항]\n${reqText}\n\n[리뷰 기준]\n1. HTML 시맨틱\n2. CSS 반응형/효율성\n3. JS 로직\n4. 접근성\n5. 요구사항 충족\n\n모든 항목이 만족스러우면 반드시 'APPROVED'를 포함하세요. 개선이 필요하면 구체적 피드백을 제공하세요.`
      );

      logs.push({ agent: "Reviewer", stage: "reviewing", message: reviewOutput, round });

      if (reviewOutput.toUpperCase().includes("APPROVED")) {
        approved = true;
        logs.push({ agent: "System", stage: "complete", message: `Round ${round}에서 코드가 승인되었습니다!`, round });
        break;
      }

      if (!autoApprove) {
        logs.push({ agent: "System", stage: "reviewing", message: "자동 허용 모드 OFF. 중단합니다.", round });
        break;
      }

      if (round < maxRounds) {
        logs.push({ agent: "System", stage: "revising", message: `리뷰 미통과. Round ${round + 1}으로 수정 진행...`, round });
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
