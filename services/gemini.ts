
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { AppState, Task } from "../types";

export const generateAIReport = async (state: AppState) => {
  // Fix: Use process.env.API_KEY directly as a named parameter as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    用户信息：
    姓名：${state.profile.name || '学霸'}
    连续打卡天数：${state.profile.streak}
    任务总数：${Object.keys(state.tasks).length}
    未完成任务：${(Object.values(state.tasks) as Task[]).filter(t => t.status === 'todo').length}
    最近一次打卡日期：${state.profile.lastCheckinDate || '无'}
    
    请根据以上数据生成监督报告。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "生成报告失败，请检查网络或稍后再试。";
  }
};
