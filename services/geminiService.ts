import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult, BatchPrediction } from "../types";

// The API key is injected from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const singlePredictionSchema = {
  type: Type.OBJECT,
  properties: {
    safeTip: {
      type: Type.OBJECT,
      description: "The single safest betting tip with a very high probability of success, suitable for accumulators.",
      properties: {
        bet: { type: Type.STRING, description: "The type of bet (e.g., 'Match Result', 'Total Goals')." },
        value: { type: Type.STRING, description: "The predicted outcome (e.g., 'W1', 'TO 2.5')." },
        confidence: { type: Type.INTEGER, description: "Confidence level from 0 to 100." },
      },
      required: ["bet", "value", "confidence"],
    },
    valueTip: {
      type: Type.OBJECT,
      description: "A tip that represents excellent value. This is a well-reasoned bet where the AI's analysis indicates a higher probability of success than typical market odds might suggest, offering a powerful and accurate betting opportunity.",
      properties: {
        bet: { type: Type.STRING, description: "The type of bet (e.g., 'Match Result', 'Total Goals')." },
        value: { type: Type.STRING, description: "The predicted outcome (e.g., 'W1', 'TO 2.5')." },
        confidence: { type: Type.INTEGER, description: "Confidence level from 0 to 100." },
      },
      required: ["bet", "value", "confidence"],
    },
    tips: {
      type: Type.ARRAY,
      description: "A list of various betting tips with their confidence levels.",
      items: {
        type: Type.OBJECT,
        properties: {
          bet: { type: Type.STRING, description: "The type of bet." },
          value: { type: Type.STRING, description: "The predicted outcome for the bet." },
          confidence: { type: Type.INTEGER, description: "Confidence level from 0 to 100." },
        },
        required: ["bet", "value", "confidence"],
      },
    },
    analysis: {
      type: Type.STRING,
      description: "A detailed, professional analysis of the match in Markdown format, covering team form, tactics, key players, and reasoning for the prediction.",
    },
    correctScores: {
      type: Type.ARRAY,
      description: "A list of the three most likely correct scores for the match.",
      items: {
        type: Type.STRING,
        description: "A correct score prediction, e.g., '2-1'."
      }
    }
  },
  required: ["safeTip", "valueTip", "tips", "analysis", "correctScores"],
};


const batchResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      fixtureId: {
        type: Type.INTEGER,
        description: "The unique ID of the fixture being analyzed."
      },
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
    `- **Match:** ${f.teams.home.name} vs ${f.teams.away.name} (${f.league.name})\n  - **Fixture ID:** ${f.fixture.id}\n  - **Date:** ${new Date(f.fixture.date).toUTCString()}`
  ).join('\n');

  const prompt = `
You are a world-class professional football analyst providing expert betting insights. Analyze ALL of the following matches and return your analysis in a structured JSON array format. Your knowledge is up-to-date.

**Matches to Analyze:**
${fixtureList}

**Your Task:**
For EACH match in the list, perform a comprehensive analysis by considering the following critical factors:
- Current Form & Momentum
- Head-to-Head (H2H) Deep Dive
- Team News, Injuries & Suspensions
- League Context & Motivation
- Tactical Matchup

Based on your analysis for each match, provide:
1.  A list of 10-15 varied betting tips with confidence scores.
2.  A single "Safe Tip" for accumulators.
3.  A "Value Tip" representing a mispriced opportunity.
4.  A detailed, professional match preview in Markdown.
5.  A list of the three most likely correct scores.

**JSON Output Instructions & Value Formatting:**
Return ONLY a single JSON array. Each element in the array must be an object corresponding to one of the matches provided.
Each object in the array MUST conform to the following schema:
{
  "fixtureId": <The integer ID of the fixture>,
  "prediction": { ... the detailed prediction object ... }
}
The 'prediction' object must contain 'safeTip', 'valueTip', 'tips', 'analysis', and 'correctScores'. The analysis must be a single string with markdown formatting.
**Crucially, for the 'value' field in all tips, you MUST use the following standardized abbreviations. Do NOT use team names or descriptive text.**
- **Match Result:** Use 'W1' for Home Win, 'X' for Draw, 'W2' for Away Win.
- **Double Chance:** Use '1X' for Home Win or Draw, '12' for Home or Away Win, '2X' for Away Win or Draw.
- **BTTS (Both Teams to Score):** Use 'BTTS' for Yes, and 'BTTS-NO' for No.
- **Total Goals:** Use 'TO' for Over and 'TU' for Under, followed by the goal line (e.g., 'TO 2.5', 'TU 1.5').
- **Team Total Goals:** Use '1TO'/'1TU' for Home Team Over/Under and '2TO'/'2TU' for Away Team Over/Under (e.g., '1TO 1.5').
- **Total Corners:** Use 'CO' for Over and 'CU' for Under, followed by the line (e.g., 'CO 9.5').
- **Team Corners:** Use '1CO'/'1CU' for Home Team Over/Under and '2CO'/'2CU' for Away Team Over/Under (e.g., '2CU 4.5').
- **HT/FT Result:** Use 'W1/W1', 'W1/X', 'X/W2', etc.
- **Asian Handicap:** Use 'H' for Home team and 'A' for Away team, followed by the line (e.g., 'H -0.5', 'A +1.0').
- **Correct Score:** Provide the score (e.g., '2-1', '1-1').
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: batchResponseSchema,
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
        // Search for the matching closing brace, respecting nested braces
        for (let i = objectStartIndex + 1; i < buffer.length; i++) {
          const char = buffer[i];
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
          }
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
            } else {
               break; 
            }
          } catch (e) {
            // Incomplete JSON object in buffer, wait for more chunks
            break;
          }
        } else {
          // No complete object found yet, wait for more chunks
          break;
        }
      }
      
      if (lastProcessedIndex > 0) {
        buffer = buffer.substring(lastProcessedIndex);
      }
    }
  } catch (error) {
    console.error("Gemini API stream failed:", error);
    onError(new Error("An error occurred while streaming league predictions."));
  } finally {
    onComplete();
  }
}

export async function getAccumulatorPrediction(fixtures: Fixture[], leagueName: string): Promise<string> {
  const fixtureList = fixtures.map(f => `- ${f.teams.home.name} vs ${f.teams.away.name}`).join('\n');

  const prompt = `
You are an expert football betting analyst who specializes in creating accumulator (parlay) bets. Your task is to analyze the provided list of matches for the **${leagueName}** and create two distinct accumulator bets with detailed justifications.

**Matches for Analysis:**
${fixtureList}

**Your Task:**
1.  **Analyze All Matches:** Briefly consider the likely outcomes for all provided matches based on general knowledge of team strength, form, and league context.
2.  **Create a "Safe Accumulator":**
    *   Select 2-4 matches from the list.
    *   Choose predictions with a very high probability of success (e.g., strong favorites to win, 'Over 1.5 Goals' in a high-scoring matchup, Double Chance '1X' for a dominant home team).
    *   The goal is a low-risk, modest-return bet.
    *   Provide a detailed rationale for why you chose each specific leg of the accumulator.
3.  **Create a "Value Accumulator":**
    *   Select 3-5 matches from the list.
    *   Look for value where the market odds might be underestimated. This could include a draw, an underdog on a double chance, a specific 'Both Teams to Score' bet, or a slightly riskier 'Over 2.5 Goals' bet.
    *   The goal is a higher-risk, high-reward bet.
    *   Provide a detailed rationale for your selections, explaining where you see the value.

**Output Format:**
- Use Markdown for formatting.
- Use '###' for the titles: '### Safe Accumulator' and '### Value Accumulator'.
- Use bullet points ('*') to list the selections for each accumulator.
- For each selection, clearly state the match and the bet (e.g., '* **Man City vs Arsenal:** Man City to Win (W1)').
- Follow the list of selections with a paragraph titled '**Rationale:**' explaining your strategy.
- Return ONLY the Markdown text. Do not include any other text or introductions.
`;
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
  } catch (error) {
      console.error("Gemini accumulator API call failed:", error);
      throw new Error("An error occurred while generating the accumulator tips.");
  }
}