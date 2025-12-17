
import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult, BatchPrediction } from "../types";

// The API key is injected from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
- Use the match start time for the Horary chart.
- Combine astrological insights with team form.

**Matches:**
${fixtureList}

**Output Requirements:**
- Provide tips ONLY for Match Result, Double Chance, and Over/Under.
- Include the "correctScores" property with the 3 most likely goal outcomes (e.g., "2-1", "1-1", "0-2").
- Provide a detailed "KP Astrology Analysis" for each match.

Return a JSON array conforming to the provided schema.
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
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
      while (true) {
        const objectStartIndex = buffer.indexOf('{', lastProcessedIndex);
        if (objectStartIndex === -1) break;
        let braceCount = 1;
        let objectEndIndex = -1;
        for (let i = objectStartIndex + 1; i < buffer.length; i++) {
          if (buffer[i] === '{') braceCount++;
          else if (buffer[i] === '}') braceCount--;
          if (braceCount === 0) {
            objectEndIndex = i;
            break;
          }
        }
        if (objectEndIndex !== -1) {
          const jsonString = buffer.substring(objectStartIndex, objectEndIndex + 1);
          try {
            const parsedObject = JSON.parse(jsonString) as BatchPrediction;
            if (parsedObject.fixtureId && parsedObject.prediction) {
               onPredictionReceived(parsedObject);
               lastProcessedIndex = objectEndIndex + 1;
            } else break;
          } catch { break; }
        } else break;
      }
      if (lastProcessedIndex > 0) buffer = buffer.substring(lastProcessedIndex);
    }
  } catch (error) {
    console.error("Gemini API stream failed:", error);
    onError(new Error("Analysis failed. Please try again."));
  } finally {
    onComplete();
  }
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const prompt = `Translate the following football match analysis to ${targetLanguage}. Keep the tone professional and astrological. Maintain the Markdown formatting.\n\n${text}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation failed:", error);
    return text; // Return original on failure
  }
}
