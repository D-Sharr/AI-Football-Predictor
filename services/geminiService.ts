
import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult, BatchPrediction } from "../types";

// The API key must be obtained exclusively from process.env.API_KEY
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
};

const singlePredictionSchema = {
  type: Type.OBJECT,
  properties: {
    winResult: {
      type: Type.OBJECT,
      description: "Match outcome. Allowed: W1, W2, X, 1X, 2X ONLY.",
      properties: {
        bet: { type: Type.STRING },
        value: { type: Type.STRING, description: "One of: W1, W2, X, 1X, 2X" },
        confidence: { type: Type.INTEGER },
      },
      required: ["bet", "value", "confidence"],
    },
    totalGoals: {
      type: Type.OBJECT,
      description: "Goals prediction. Format: '[Number] Over' or '[Number] Under' (e.g. '2.5 Over').",
      properties: {
        bet: { type: Type.STRING },
        value: { type: Type.STRING },
        confidence: { type: Type.INTEGER },
      },
      required: ["bet", "value", "confidence"],
    },
    tips: {
      type: Type.ARRAY,
      description: "Exactly 3 betting tips.",
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
      description: "Complete KP Astrology analysis (House 1,6,7,11) in Markdown.",
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
    `- ID: ${f.fixture.id} | ${f.teams.home.name} vs ${f.teams.away.name}`
  ).join('\n');

  const prompt = `
Act as an expert Football Analyst using Krishnamurti Paddhati (KP) Astrology. Analyze these matches:
${fixtureList}

RULES FOR WIN RESULT:
- Home Win = W1
- Away Win = W2
- Draw = X
- Home Win or Draw = 1X
- Away Win or Draw = 2X
Return ONLY one of these 5 labels in the "value" field.

RULES FOR GOALS:
- Format as "[Number] Over" or "[Number] Under" (e.g., "2.5 Over", "1.5 Under", "3.5 Over").
- Never show just the number or just the text. Show both together.

ANALYSIS:
- Provide a detailed KP analysis covering House Significators (1,6,7,11) and Sub-lords.

Return the result as a JSON array.
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
    const processedIds = new Set<number>();

    for await (const chunk of response) {
      buffer += chunk.text;
      
      // Attempt to extract complete JSON objects from the streaming array
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
                if (parsed.fixtureId && !processedIds.has(parsed.fixtureId)) {
                  onPredictionReceived(parsed as BatchPrediction);
                  processedIds.add(parsed.fixtureId);
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
    onError(error);
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
  const prompt = `Translate to ${targetLanguage}. Keep Markdown.\n\n${text}`;
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
