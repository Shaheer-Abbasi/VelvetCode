import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    console.log('AI API called with request');
    const { kind, language, code } = await request.json();
    console.log('Request data:', { kind, language, codeLength: code?.length });

    if (!process.env.GEMINI_API_KEY) {
      console.log('GEMINI_API_KEY not found in environment');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('GEMINI_API_KEY found, proceeding...');

    if (!kind || !language || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: kind, language, code' },
        { status: 400 }
      );
    }

    // Get the generative model with correct model name
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Create prompts based on the request type
    let prompt = '';
    
    switch (kind) {
      case 'improve':
        prompt = `Analyze this ${language} code and suggest improvements for better performance, readability, and best practices. Provide specific recommendations:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Specific improvements
2. Reasoning for each suggestion
3. Updated code examples where helpful`;
        break;

      case 'explain':
        prompt = `Explain this ${language} code in a clear and concise way. Break down what it does, how it works, and any important concepts:

\`\`\`${language}
${code}
\`\`\`

Please explain:
1. What the code does overall
2. Key components and their purpose
3. Any algorithms or patterns used
4. Potential use cases`;
        break;

      case 'test':
        prompt = `Generate comprehensive unit tests for this ${language} code. Create test cases that cover different scenarios:

\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Test cases for normal operation
2. Edge cases and error conditions
3. Mock data where needed
4. Testing framework appropriate for ${language}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid kind. Must be: improve, explain, or test' },
          { status: 400 }
        );
    }

    // Generate content using Gemini
    console.log('Calling Gemini API with prompt length:', prompt.length);
    const result = await model.generateContent(prompt);
    console.log('Gemini API responded');
    const response = await result.response;
    const text = response.text();
    console.log('Response text length:', text.length);

    return NextResponse.json({
      message: text,
      kind,
      language
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Handle specific API errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}