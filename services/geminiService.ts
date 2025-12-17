
import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult, BatchPrediction } from "../types";

// The API key must be obtained exclusively from process.env.API_KEY
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not configured. Please add it to your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const singlePredictionSchema = {
  type: Type.OBJECT,
  properties: {
    winResult: {
      type: Type.OBJECT,
      description: "Match outcome prediction. MUST be one of: W1 (Home), W2 (Away), X (Draw), 1X (Home/Draw), 2X (Away/Draw).",
      properties: {
        bet: { type: Type.STRING },
        value: { type: Type.STRING },
        confidence: { type: Type.INTEGER },
      },
      required: ["bet", "value", "confidence"],
    },
    totalGoals: {
      type: Type.OBJECT,
      description: "Total goals prediction. MUST be formatted as '[Number] Over' or '[Number] Under' (e.g., '2.5 Over', '2.5 Under', '1.5 Over').",
      properties: {
        bet: { type: Type.STRING },
        value: { type: Type.STRING },
        confidence: { type: Type.INTEGER },
      },
      required: ["bet", "value", "confidence"],
    },
    tips: {
      type: Type.ARRAY,
      description: "Exactly 3 supplementary betting tips.",
      items: {
        type: Type.OBJECT,
        properties: {
          bet: { type: Type.STRING },
          value: { type: Type.STRING },
          confidence: { type: Type.INTEGER },
        },
        required: ["bet", "value", "confidence"],
      },
    },
    analysis: {
      type: Type.STRING,
      description: "MOST POSSIBLE and COMPLETE match analysis using detailed KP Astrology logic (House Significators 1,6,7,11, Sub-lords) in Markdown.",
    },
    correctScores: {
      type: Type.ARRAY,
      description: "3 most likely correct scores.",
      items: { type: Type.STRING }
    }
  },
  required: ["winResult", "totalGoals", "tips", "analysis", "correctScores"],
};

const batchResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      fixtureId: { type: Type.INTEGER },
      prediction: singlePredictionSchema,
    },
    required: ["fixtureId", "prediction"],
  }
};

export async function getLeaguePredictions(
  fixtures: Fixture[],
  onPredictionReceived: (prediction: BatchPrediction) => void,
  onError: (error: Error) => void,
  onComplete: () => void
) {
  const ai = getAIClient();
  const fixtureList = fixtures.map(f =>
    `- Match: ${f.teams.home.name} vs ${f.teams.away.name} (ID: ${f.fixture.id})`
  ).join('\n');

  const prompt = `
Act as a professional KP Astrology Football Analyst. Provide a MOST POSSIBLE and COMPLETE analysis for the following matches.

For each match, follow these strict rules:
1. **Win Result Logic**: You must choose ONLY ONE from: W1 (Home Win), W2 (Away Win), X (Draw), 1X (Home Win or Draw), 2X (Away Win or Draw).
2. **Total Goals Logic**: You must provide a specific line with Over or Under. Format: "[Number] Over" or "[Number] Under" (e.g., "2.5 Over", "2.5 Under", "1.5 Over").
3. **KP Analysis Structure**:
   - ### House Significators: Detailed breakdown of 1st, 6th, 7th, and 11th houses for both sides.
   - ### Sub-Lord Strength: Analysis of the 6th and 11th house sub-lords to determine the winner's strength.
   - ### Planetary Transits: Impact of current planets on the match timing and teams.
   - ### Conclusion: Final summary of the astrological reason for the prediction.

Matches:
${fixtureList}

Return JSON array of objects {fixtureId, prediction}.
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: batchResponseSchema,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    let buffer = '';
    for await (const chunk of response) {
      buffer += chunk.text;
      
      let lastProcessedIndex = 0;
      let depth = 0;
      let inString = false;
      let startIdx = -1;

      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        if (char === '"' && buffer[i-1] !== '\\') inString = !inString;
        if (!inString) {
          if (char === '{') {
            if (depth === 0) startIdx = i;
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0 && startIdx !== -1) {
              const potentialJson = buffer.substring(startIdx, i + 1);
              try {
                const parsed = JSON.parse(potentialJson);
                if (parsed.fixtureId && parsed.prediction) {
                  onPredictionReceived(parsed as BatchPrediction);
                  lastProcessedIndex = i + 1;
                }
              } catch (e) {}
              startIdx = -1;
            }
          }
        }
      }
      if (lastProcessedIndex > 0) buffer = buffer.substring(lastProcessedIndex);
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let msg = "Analysis failed. Please try again later.";
    if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
      msg = "API Quota exceeded. Please try again in a few minutes.";
    }
    onError(new Error(msg));
  } finally {
    onComplete();
  }
}

export async function translateTextStream(
  text: string,
  targetLanguage: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const ai = getAIClient();
  const prompt = `Translate to ${targetLanguage}. Keep Markdown and professional football/astrology terminology.\n\n${text}`;
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    for await (const chunk of response) {
      if (chunk.text) onChunk(chunk.text);
    }
  } catch (error) {}
}
