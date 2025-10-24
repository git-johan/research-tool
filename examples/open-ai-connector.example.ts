/**
 * OpenAI Connector Utility
 * Clean GPT-5 API integration for AI operations
 */

import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  verbose?: boolean;
}

export interface CostSummary {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

/**
 * OpenAI GPT-5 connection manager
 */
export class OpenAIConnector {
  private client: OpenAI;
  private model: string;
  private verbose: boolean;

  // Cost tracking
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private totalCost: number = 0;

  // Pricing per 1M tokens for GPT-5
  private readonly INPUT_PRICE_PER_1M = 2.0; // $2 per 1M input tokens
  private readonly OUTPUT_PRICE_PER_1M = 10.0; // $10 per 1M output tokens

  constructor(config?: OpenAIConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY in .env file",
      );
    }

    this.client = new OpenAI({ apiKey });
    this.model = config?.model || "gpt-5";
    this.verbose = config?.verbose !== undefined ? config.verbose : true;

    if (this.verbose) {
      console.log(`🤖 OpenAI connector initialized with model: ${this.model}`);
    }
  }

  /**
   * Generate text using OpenAI Responses API
   * Simple, direct text generation for queries and evaluations
   * Includes automatic retry logic for transient failures
   */
  async generateText(
    prompt: string,
    options?: {
      reasoning?: "low" | "medium" | "high";
      verbosity?: "low" | "medium" | "high";
      metadata?: any;
      onPrompt?: (prompt: string) => void | Promise<void>;
      onResponse?: (
        response: any,
        usage: any,
        duration: number,
      ) => void | Promise<void>;
    },
  ): Promise<string> {
    if (this.verbose) {
      console.log("🤖 Generating text with OpenAI...");
      console.log(
        `   Input size: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens)`,
      );
    }
    const startTime = Date.now();

    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    // Call onPrompt callback before first attempt
    if (options?.onPrompt) {
      await options.onPrompt(prompt);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.client.responses.create({
          model: this.model,
          input: prompt,
          reasoning: { effort: options?.reasoning || "low" },
          text: { verbosity: options?.verbosity || "medium" },
        });

        const apiTime = Date.now() - startTime;
        if (this.verbose) {
          console.log(`✅ Text generation completed in ${apiTime}ms`);
        }

        if (!response.output_text) {
          throw new Error("No output_text from OpenAI Responses API");
        }

        // Track costs
        this.trackCost(response);

        // Save successful prompt if debugging
        if (options?.metadata?.debugSave) {
          this.saveSuccessfulPrompt(prompt, response, options.metadata);
        }

        // Call onResponse callback
        if (options?.onResponse) {
          const usage = {
            input_tokens: response.usage?.input_tokens || 0,
            output_tokens: response.usage?.output_tokens || 0,
            total_tokens:
              (response.usage?.input_tokens || 0) +
              (response.usage?.output_tokens || 0),
            estimated_cost:
              ((response.usage?.input_tokens || 0) / 1_000_000) *
                this.INPUT_PRICE_PER_1M +
              ((response.usage?.output_tokens || 0) / 1_000_000) *
                this.OUTPUT_PRICE_PER_1M,
          };
          await options.onResponse(response, usage, apiTime);
        }

        return response.output_text;
      } catch (error: any) {
        const apiTime = Date.now() - startTime;
        const isLastAttempt = attempt === maxRetries - 1;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || isLastAttempt) {
          console.error(
            `❌ Text generation failed after ${apiTime}ms (attempt ${attempt + 1}/${maxRetries}):`,
            error,
          );

          // Save prompt to file if it's a 500 error for debugging
          if (error.status === 500) {
            this.saveFailingPrompt(prompt, error, options?.metadata);
          }

          throw error;
        }

        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);

        // Always log retry attempts (not just in verbose mode)
        console.log(
          `⚠️ Attempt ${attempt + 1}/${maxRetries} failed: ${error.status || "unknown"} - ${error.message || "No message"}`,
        );
        console.log(`   Request ID: ${error.requestID || "N/A"}`);
        console.log(`   Time elapsed: ${apiTime}ms`);
        console.log(`🔄 Retrying in ${(delay / 1000).toFixed(1)}s...`);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to throw in loop, but TypeScript requires it
    throw new Error("All retry attempts exhausted");
  }

  /**
   * Check if an error is retryable (transient server errors)
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND"
    ) {
      return true;
    }

    // OpenAI API errors with retryable status codes
    if (error.status) {
      const retryableStatuses = [429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // Default: don't retry
    return false;
  }

  /**
   * Save a failing prompt to file for debugging
   */
  private saveFailingPrompt(
    prompt: string,
    error: any,
    metadata?: any,
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `failed-prompt-${timestamp}.txt`;
    const filepath = path.join(process.cwd(), filename);

    const content = `
================================================================================
FAILED OPENAI REQUEST
================================================================================
Timestamp: ${new Date().toISOString()}
Error Status: ${error.status || "unknown"}
Error Code: ${error.code || "unknown"}
Error Message: ${error.message || "No message"}
Request ID: ${error.requestID || "N/A"}
Model: ${this.model}
${metadata ? `Product ID: ${metadata.productId || "unknown"}` : ""}

Prompt Characteristics:
- Length: ${prompt.length} characters
- Estimated tokens: ~${Math.ceil(prompt.length / 4)}
- Lines: ${prompt.split("\n").length}
- Has unicode: ${/[^\x00-\x7F]/.test(prompt)}
- Has control chars: ${/[\x00-\x1F\x7F-\x9F]/.test(prompt)}

================================================================================
FULL PROMPT:
================================================================================
${prompt}

================================================================================
ERROR DETAILS:
================================================================================
${JSON.stringify(error, null, 2)}
`;

    try {
      fs.writeFileSync(filepath, content, "utf-8");
      console.log(`📝 Saved failing prompt to: ${filename}`);
      return filepath;
    } catch (writeError) {
      console.error("❌ Failed to save prompt:", writeError);
      return "";
    }
  }

  /**
   * Save a successful prompt to file for debugging
   */
  private saveSuccessfulPrompt(
    prompt: string,
    response: any,
    metadata?: any,
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `successful-prompt-${timestamp}.txt`;
    const filepath = path.join(process.cwd(), filename);

    const content = `
================================================================================
SUCCESSFUL OPENAI REQUEST
================================================================================
Timestamp: ${new Date().toISOString()}
Model: ${this.model}
${metadata ? `Product ID: ${metadata.productId || "unknown"}` : ""}

Prompt Characteristics:
- Length: ${prompt.length} characters
- Estimated tokens: ~${Math.ceil(prompt.length / 4)}
- Lines: ${prompt.split("\n").length}
- Has unicode: ${/[^\x00-\x7F]/.test(prompt)}
- Has control chars: ${/[\x00-\x1F\x7F-\x9F]/.test(prompt)}

Response Characteristics:
- Output length: ${response.output_text?.length || 0} characters
- Input tokens: ${response.usage?.input_tokens || 0}
- Output tokens: ${response.usage?.output_tokens || 0}

================================================================================
FULL PROMPT:
================================================================================
${prompt}

================================================================================
RESPONSE:
================================================================================
${response.output_text || "No output"}
`;

    try {
      fs.writeFileSync(filepath, content, "utf-8");
      console.log(`📝 Saved successful prompt to: ${filename}`);
      return filepath;
    } catch (writeError) {
      console.error("❌ Failed to save prompt:", writeError);
      return "";
    }
  }

  /**
   * Generate JSON response for structured outputs
   */
  async generateJSON(
    prompt: string,
    schema?: object,
    metadata?: any,
  ): Promise<any> {
    const jsonPrompt = `${prompt}\n\nRespond with valid JSON only, no additional text.`;

    const response = await this.generateText(jsonPrompt, {
      reasoning: "low",
      verbosity: "low",
      metadata,
    });

    // Try multiple JSON extraction approaches
    return this.extractAndParseJSON(response);
  }

  /**
   * Robust JSON extraction and parsing with multiple fallback strategies
   */
  private extractAndParseJSON(response: string): any {
    if (this.verbose) {
      console.log(
        `🔍 Attempting to parse JSON from response (${response.length} chars)`,
      );
    }

    // Strategy 1: Find complete JSON object with proper brace matching
    let jsonStr = this.extractCompleteJSON(response);
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (this.verbose) {
          console.log(
            "✅ Successfully parsed JSON with complete object extraction",
          );
        }
        return parsed;
      } catch (error) {
        if (this.verbose) {
          console.log("❌ Strategy 1 failed:", (error as Error).message);
        }
      }
    }

    // Strategy 2: Original greedy regex as fallback
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (this.verbose) {
          console.log("✅ Successfully parsed JSON with greedy regex");
        }
        return parsed;
      } catch (error) {
        if (this.verbose) {
          console.log("❌ Strategy 2 failed:", (error as Error).message);
        }
      }
    }

    // Strategy 3: Clean and retry
    if (jsonMatch) {
      const cleanedJson = this.cleanJSONString(jsonMatch[0]);
      try {
        const parsed = JSON.parse(cleanedJson);
        if (this.verbose) {
          console.log("✅ Successfully parsed JSON after cleaning");
        }
        return parsed;
      } catch (error) {
        if (this.verbose) {
          console.log("❌ Strategy 3 failed:", (error as Error).message);
        }
      }
    }

    // All strategies failed - provide detailed error
    console.error("\n🚨 ALL JSON PARSING STRATEGIES FAILED");
    console.error("📄 Full response:");
    console.error(response);
    console.error("\n🔍 Extracted JSON attempt:");
    console.error(jsonMatch ? jsonMatch[0] : "No JSON pattern found");

    if (jsonMatch) {
      console.error("\n📊 JSON Analysis:");
      const jsonContent = jsonMatch[0];
      console.error(`  Length: ${jsonContent.length} characters`);
      console.error(`  First 200 chars: ${jsonContent.substring(0, 200)}...`);
      console.error(
        `  Last 200 chars: ...${jsonContent.substring(Math.max(0, jsonContent.length - 200))}`,
      );

      // Check for common issues
      const braceBalance = this.checkBraceBalance(jsonContent);
      console.error(
        `  Brace balance: ${braceBalance.balanced ? "✅" : "❌"} (open: ${braceBalance.open}, close: ${braceBalance.close})`,
      );
    }

    throw new Error("Invalid JSON in response - see detailed logs above");
  }

  /**
   * Extract complete JSON object with proper brace matching
   */
  private extractCompleteJSON(text: string): string | null {
    let braceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === "{") {
        if (startIndex === -1) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === "}") {
        braceCount--;

        if (braceCount === 0 && startIndex !== -1) {
          // Found complete JSON object
          return text.substring(startIndex, i + 1);
        }
      }
    }

    return null;
  }

  /**
   * Clean JSON string by handling common issues
   */
  private cleanJSONString(jsonStr: string): string {
    return (
      jsonStr
        // Remove any trailing text after the JSON
        .replace(/\}[\s\S]*$/, "}")
        // Normalize quotes (though this is risky)
        .trim()
    );
  }

  /**
   * Check brace balance in JSON string
   */
  private checkBraceBalance(jsonStr: string): {
    balanced: boolean;
    open: number;
    close: number;
  } {
    let openBraces = 0;
    let closeBraces = 0;

    for (const char of jsonStr) {
      if (char === "{") openBraces++;
      if (char === "}") closeBraces++;
    }

    return {
      balanced: openBraces === closeBraces,
      open: openBraces,
      close: closeBraces,
    };
  }

  /**
   * Track costs for a response
   */
  private trackCost(response: any): void {
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;

    const inputCost = (inputTokens / 1_000_000) * this.INPUT_PRICE_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * this.OUTPUT_PRICE_PER_1M;
    const requestCost = inputCost + outputCost;

    this.totalCost += requestCost;

    if (this.verbose) {
      console.log(
        `💰 Cost: $${requestCost.toFixed(4)} (${inputTokens} in, ${outputTokens} out)`,
      );
    }
  }

  /**
   * Get cumulative cost summary
   */
  getCostSummary(): CostSummary {
    return {
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      totalCost: this.totalCost,
    };
  }

  /**
   * Reset cost tracking
   */
  resetCostTracking(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalCost = 0;
    if (this.verbose) {
      console.log("💰 Cost tracking reset");
    }
  }

  /**
   * Test connection with a simple prompt
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateText(
        'Say "connection successful" in 3 words.',
      );
      console.log("✅ OpenAI connection test:", response);
      return true;
    } catch (error) {
      console.error("❌ OpenAI connection test failed:", error);
      return false;
    }
  }
}
