import { GoogleGenAI } from "@google/genai";
import { Transaction, FinancialSummary } from "../types";

export const analyzeFinances = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<string> => {
  // 環境変数からAPIキーを取得
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API_KEY is not defined in process.env");
    throw new Error("AI診断をご利用いただくにはAPIキーの設定が必要です。");
  }

  // リクエストのたびに新しいインスタンスを生成して最新のキーを使用
  const ai = new GoogleGenAI({ apiKey });

  try {
    const transactionHistory = transactions
      .map(t => `- ${t.date}: ${t.description} (${t.type === 'income' ? '収入' : '支出'}) - ¥${t.amount.toLocaleString()}`)
      .join('\n');

    const prompt = `
      あなたは親しみやすく的確なファイナンシャルアドバイザーです。以下の家計状況を分析し、日本語でアドバイスをください。
      
      状況サマリー:
      - 月初残高: ¥${summary.startBalance.toLocaleString()}
      - 収入合計: ¥${summary.totalIncome.toLocaleString()}
      - 支出合計: ¥${summary.totalExpense.toLocaleString()}
      - 月末予想残高: ¥${summary.projectedBalance.toLocaleString()}

      明細データ:
      ${transactionHistory}

      以下の3点について、簡潔に（200文字程度で）回答してください：
      1. 現在の収支バランスの評価（良好、注意、または危険）。
      2. 具体的な改善アクション（節約のヒントや資金繰りのアドバイス）。
      3. 短く前向きな応援メッセージ。
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