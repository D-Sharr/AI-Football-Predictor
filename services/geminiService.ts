
import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult, BatchPrediction } from "../types";

// The API key must be obtained exclusively from process.env.API_KEY
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const singlePredictionSchema = {
  type: Type.OBJECT,
  properties: {
    safeTip: {
      type: Type.OBJECT,
      description: "The single safest betting tip (Win/Draw or Over/Under only) with high probability.",
      properties: {
        bet: { type: Type.STRING, description: "The type of bet (Match Result, Double Chance, or Total Goals)." },
        value: { type: Type.STRING, description: "The outcome abbreviation (W1, X, W2, 1X, 12, 2X, TO, TU)." },
        confidence: { type: Type.INTEGER, description: "Confidence level 0-100." },
      },
      required: ["bet", "value", "confidence"],
    },
    valueTip: {
      type: Type.OBJECT,
      description: "A value tip focused on Win/Draw or Over/Under markets.",
      properties: {
        bet: { type: Type.STRING, description: "The type of bet." },
        value: { type: Type.STRING, description: "The outcome abbreviation." },
        confidence: { type: Type.INTEGER, description: "Confidence level 0-100." },
      },
      required: ["bet", "value", "confidence"],
    },
    tips: {
      type: Type.ARRAY,
      description: "A list of 6-10 betting tips focusing ONLY on Win/Draw/Double Chance and Goal Over/Under.",
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
      description: "Professional match analysis using KP Astrology (Krishnamurti Paddhati) logic in Markdown format.",
    },
    correctScores: {
      type: Type.ARRAY,
      description: "Three most likely goals/correct scores based on astrological significators.",
      items: { type: Type.STRING }
    }
  },
  required: ["safeTip", "valueTip", "tips", "analysis", "correctScores"],
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
    `- **Match:** ${f.teams.home.name} vs ${f.teams.away.name} (${f.league.name})\n  - **ID:** ${f.fixture.id}\n  - **Time:** ${f.fixture.date}`
  ).join('\n');

  const prompt = `
You are an expert football analyst and a master of Krishnamurti Paddhati (KP) Astrology. 
Your task is to analyze the following matches and provide predictions focusing EXCLUSIVELY on:
1. Match Results (W1, X, W2)
2. Double Chance (1X, 12, 2X)
3. Total Goals Over/Under (TO/TU)
4. Most Likely Correct Scores (Goals Prediction)

**KP Astrology Methodology:**
- Home team = 1st House (Lagna); Away team = 7th House.
- Analysis of 6th House (Victory) and 11th House (Gain).
- The number of goals is determined by the strength of the 2nd (wealth/gain) and 5th (creativity/play) cusps in relation to the main significators.
- Combine astrological insights with team form.

**Matches:**
${fixtureList}

Return a JSON array of objects, one for each match ID provided.
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview', // Upgraded for complex reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: batchResponseSchema,
        thinkingConfig: { thinkingBudget: 32768 } // Max budget for pro reasoning
      },
    });

    let buffer = '';
    for await (const chunk of response) {
      buffer += chunk.text;
      
      // Attempt to extract individual objects from the growing JSON array string
      let lastProcessedIndex = 0;
      let depth = 0;
      let inString = false;
      let startIdx = -1;

      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        
        if (char === '"' && buffer[i-1] !== '\\') {
          inString = !inString;
        }

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
              } catch (e) {
                // Not a complete valid object yet, continue
              }
              startIdx = -1;
            }
          }
        }
      }
      if (lastProcessedIndex > 0) {
        buffer = buffer.substring(lastProcessedIndex);
      }
    }
  } catch (error) {
    console.error("Gemini API stream failed:", error);
    onError(error instanceof Error ? error : new Error("Analysis failed."));
  } finally {
    onComplete();
  }
}

// Added translateText function to resolve the import error in FixtureItem.tsx
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const ai = getAIClient();
  const prompt = `Translate the following football match analysis to ${targetLanguage}. Keep the tone professional and astrological. Maintain the Markdown formatting.\n\n${text}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Fastest model for translation
      contents: prompt,
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation failed:", error);
    return text;
  }
}

export async function translateTextStream(
  text: string,
  targetLanguage: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const ai = getAIClient();
  const prompt = `Translate the following football match analysis to ${targetLanguage}. Keep the tone professional and astrological. Maintain the Markdown formatting.\n\n${text}`;
  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview', // Fastest model for translation
      contents: prompt,
    });
    for await (const chunk of response) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Translation stream failed:", error);
  }
}
