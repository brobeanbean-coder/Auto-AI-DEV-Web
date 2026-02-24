import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ApiStatus = "connected" | "error" | "not_set";

async function checkGoogle(): Promise<ApiStatus> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return "not_set";
  try {
    const genai = new GoogleGenerativeAI(key);
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
    await model.generateContent("Hi");
    return "connected";
  } catch {
    return "error";
  }
}

async function checkOpenAI(): Promise<ApiStatus> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "not_set";
  try {
    const openai = new OpenAI({ apiKey: key });
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 1,
    });
    return "connected";
  } catch {
    return "error";
  }
}

async function checkAnthropic(): Promise<ApiStatus> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "not_set";
  try {
    const anthropic = new Anthropic({ apiKey: key });
    await anthropic.messages.create({
      model: "claude-haiku-4-5-20250414",
      max_tokens: 1,
      messages: [{ role: "user", content: "Hi" }],
    });
    return "connected";
  } catch {
    return "error";
  }
}

export async function GET() {
  const [google, openai, anthropic] = await Promise.all([
    checkGoogle(),
    checkOpenAI(),
    checkAnthropic(),
  ]);

  return NextResponse.json({ google, openai, anthropic });
}
