// Piston API client for code execution
// API Documentation: https://github.com/engineer-man/piston

const PISTON_API_URL = process.env.NEXT_PUBLIC_PISTON_API_URL || "https://emkc.org/api/v2/piston";

export interface ExecutionResult {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

export interface ExecutionRequest {
  language: string;
  version: string;
  files: Array<{
    name?: string;
    content: string;
  }>;
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

// Language to Piston runtime mapping
export const languageRuntimeMap: Record<string, { language: string; version: string }> = {
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  csharp: { language: "csharp", version: "6.12.0" },
  go: { language: "go", version: "1.16.2" },
  rust: { language: "rust", version: "1.68.2" },
  php: { language: "php", version: "8.2.3" },
  ruby: { language: "ruby", version: "3.0.1" },
  swift: { language: "swift", version: "5.3.3" },
  kotlin: { language: "kotlin", version: "1.8.20" },
  scala: { language: "scala", version: "3.2.2" },
  r: { language: "r", version: "4.1.1" },
  bash: { language: "bash", version: "5.2.0" },
  lua: { language: "lua", version: "5.4.4" },
  perl: { language: "perl", version: "5.36.0" },
  haskell: { language: "haskell", version: "9.0.1" },
};

// Get filename extension for language
export const getFileExtension = (language: string): string => {
  const extensions: Record<string, string> = {
    javascript: ".js",
    typescript: ".ts",
    python: ".py",
    java: ".java",
    cpp: ".cpp",
    c: ".c",
    csharp: ".cs",
    go: ".go",
    rust: ".rs",
    php: ".php",
    ruby: ".rb",
    swift: ".swift",
    kotlin: ".kt",
    scala: ".scala",
    r: ".r",
    bash: ".sh",
    lua: ".lua",
    perl: ".pl",
    haskell: ".hs",
  };
  return extensions[language] || ".txt";
};

// Execute code using Piston API
export async function executeCode(
  language: string,
  code: string,
  stdin?: string
): Promise<ExecutionResult> {
  const runtime = languageRuntimeMap[language.toLowerCase()];
  
  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const request: ExecutionRequest = {
    language: runtime.language,
    version: runtime.version,
    files: [
      {
        name: `main${getFileExtension(language)}`,
        content: code,
      },
    ],
    stdin: stdin || "",
    compile_timeout: 10000,
    run_timeout: 3000,
    compile_memory_limit: -1,
    run_memory_limit: -1,
  };

  const response = await fetch(`${PISTON_API_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Piston API error: ${response.statusText}`);
  }

  return await response.json();
}

// Get available runtimes from Piston
export async function getAvailableRuntimes(): Promise<Array<{ language: string; version: string; aliases: string[] }>> {
  const response = await fetch(`${PISTON_API_URL}/runtimes`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch runtimes: ${response.statusText}`);
  }

  return await response.json();
}
