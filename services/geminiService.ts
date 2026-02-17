import { GoogleGenAI, Type } from "@google/genai";
import { Employee } from "../types";

export const parseDocument = async (
  fileBase64: string,
  mimeType: string,
  employees: Employee[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const employeeList = employees.map(e => `${e.firstName} ${e.lastName}`).join(", ");
  
  const prompt = `Z tohto dokumentu zisti informácie o služobných pohotovostiach. 
  Pre každý nájdený týždeň (ak ich je v dokumente viac) vytvor samostatný záznam.
  1. Identifikuj zamestnanca zo zoznamu: ${employeeList}.
  2. Extrahuj rozsah dátumov (napr. 26.01.2026-01.02.2026).
  3. Extrahuj presný dátum pondelka daného týždňa (startDate) vo formáte D.M.YYYY (bez popredných núl, napríklad 1.5.2026 namiesto 01.05.2026).
  4. Vypočítaj poradové číslo týždňa v ROKU (1-53) na základe dátumu pondelka.
  
  Vráť odpoveď ako pole objektov. Ak je v dokumente len jeden týždeň, pole bude mať jeden prvok.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64.split(',')[1] || fileBase64, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            extractedName: { type: Type.STRING, description: "Meno nájdené v dokumente" },
            matchedEmployeeName: { type: Type.STRING, description: "Meno zo zoznamu, ktoré sa najviac zhoduje" },
            dateRange: { type: Type.STRING, description: "Rozsah dátumov (napr. 26.01.2026-01.02.2026)" },
            startDate: { type: Type.STRING, description: "Dátum začiatku týždňa (pondelok) vo formáte D.M.YYYY" },
            weekOfYear: { type: Type.INTEGER, description: "Číslo týždňa v roku" }
          },
          required: ["extractedName", "matchedEmployeeName", "dateRange", "startDate", "weekOfYear"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI nevrátila žiadne dáta.");
  }

  return JSON.parse(text);
};