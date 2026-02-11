import { GoogleGenAI } from "@google/genai";
import { Transaction, FinancialSummary } from "../types";

export const analyzeFinances = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<string> => {
  // ガイドラインに従い、リクエストのタイミングでインスタンスを作成します。
  // process.env.API_KEY は実行環境から提供されます。
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  try {
    const transactionHistory = transactions
      .map(t => `- ${t.date}: ${t.description} (${t.type}) - ¥${t.amount.toLocaleString()}`)
      .join('\n');

    const prompt = `
      You are a friendly and practical financial advisor. Analyze the following monthly financial snapshot for a user living in Japan.
      
      Summary:
      - Starting Balance: ¥${summary.startBalance.toLocaleString()}
      - Total Income: ¥${summary.totalIncome.toLocaleString()}
      - Total Expenses: ¥${summary.totalExpense.toLocaleString()}
      - Projected Month-End Balance: ¥${summary.projectedBalance.toLocaleString()}

      Transaction Details:
      ${transactionHistory}

      Please provide:
      1. A brief assessment of the financial health (Good, Tight, or Risky).
      2. One specific actionable tip to improve savings or manage cash flow better based on the specific entries provided.
      3. A short encouraging closing remark.

      Keep the response concise (under 200 words) and format it with clear bullet points or short paragraphs. Use Japanese language.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "アドバイスを生成できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI分析中にエラーが発生しました。");
  }
};