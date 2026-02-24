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

export async function POST(req: NextRequest) {
  const form = await req.json();
  const logs: LogEntry[] = [];
  const maxRounds = form.maxRounds || 3;
  const autoApprove = form.autoApprove ?? true;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

  const reqText = formatRequirements(form);

  try {
    // === Phase 1: 기획 (GPT) ===
    logs.push({ agent: "System", stage: "planning", message: "기획 단계를 시작합니다...", round: 1 });

    const planRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `당신은 10년 경력의 시니어 웹 기획자입니다.\n\n다음 요구사항을 분석하여 웹사이트 기획서를 작성하세요.\n\n${reqText}\n\n기획서에 포함할 내용:\n1. 전체 사이트맵\n2. 각 페이지별 섹션 구성\n3. 디자인 가이드라인\n4. 반응형 브레이크포인트\n\n한국어로 작성하세요.`
      }],
      temperature: 0.7,
    });

    const planOutput = planRes.choices[0]?.message?.content || "";
    logs.push({ agent: "Planner", stage: "planning", message: planOutput, round: 1 });

    // === Phase 2~N: 개발 → 리뷰 반복 ===
    let codeOutput = "";
    let approved = false;
    let reviewOutput = "";
    let roundsUsed = 0;

    for (let round = 1; round <= maxRounds; round++) {
      roundsUsed = round;

      // 개발 (Claude)
      logs.push({ agent: "System", stage: "developing", message: `Round ${round}: 개발 단계...`, round });

      const devPrompt = round === 1
        ? `다음 기획서를 바탕으로 웹사이트 코드를 작성하세요.\n\n[기획서]\n${planOutput}\n\n[기술 요구사항]\n- 메인 색상: ${form.primaryColor}\n- 보조 색상: ${form.secondaryColor}\n- 반응형 디자인 필수\n- 시맨틱 HTML5, 모던 CSS3, 바닐라 JS\n\n반드시 아래 형식으로 분리:\n\`\`\`html\n(코드)\n\`\`\`\n\`\`\`css\n(코드)\n\`\`\`\n\`\`\`javascript\n(코드)\n\`\`\``
        : `이전 리뷰 피드백을 반영하여 코드를 수정하세요.\n\n[피드백]\n${reviewOutput}\n\n반드시 아래 형식으로 분리:\n\`\`\`html\n(코드)\n\`\`\`\n\`\`\`css\n(코드)\n\`\`\`\n\`\`\`javascript\n(코드)\n\`\`\``;

      const devRes = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: devPrompt }],
      });

      codeOutput = devRes.content.map(b => b.type === "text" ? b.text : "").join("");
      logs.push({ agent: "Developer", stage: "developing", message: codeOutput, round });

      // 리뷰 (Gemini)
      logs.push({ agent: "System", stage: "reviewing", message: `Round ${round}: 리뷰 단계...`, round });

      const reviewModel = genai.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
      const reviewRes = await reviewModel.generateContent(
        `당신은 코드 리뷰 전문가입니다.\n\n다음 코드를 리뷰하세요:\n${codeOutput}\n\n[사용자 요구사항]\n${reqText}\n\n[리뷰 기준]\n1. HTML 시맨틱\n2. CSS 반응형/효율성\n3. JS 로직\n4. 접근성\n5. 요구사항 충족\n\n모든 항목이 만족스러우면 반드시 'APPROVED'를 포함하세요. 개선이 필요하면 구체적 피드백을 제공하세요.`
      );

      reviewOutput = reviewRes.response.text();
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
