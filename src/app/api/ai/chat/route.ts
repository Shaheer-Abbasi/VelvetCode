import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build the full prompt with context if provided
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Context: I'm working on code in ${context.language || 'a code editor'}.\n\nUser question: ${prompt}\n\nPlease provide a helpful response.`;
    }

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const message = response.text();

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get AI response" },
      { status: 500 }
    );
  }
}
