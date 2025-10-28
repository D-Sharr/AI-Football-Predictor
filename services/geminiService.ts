import { GoogleGenAI, Type } from "@google/genai";
import { Fixture, PredictionResult } from "../types";

// The API key is injected from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
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


export async function getMatchPrediction(fixture: Fixture): Promise<PredictionResult> {
  const { league, teams, fixture: fixtureDetails } = fixture;

  const prompt = `
You are a world-class professional football analyst providing expert betting insights. Analyze the following match and return your analysis in a structured JSON format. Your knowledge is up-to-date.

**Match Information:**
- **League:** ${league.name} (${league.country})
- **Round:** ${league.round}
- **Match:** ${teams.home.name} (Home) vs ${teams.away.name} (Away)
- **Date:** ${new Date(fixtureDetails.date).toUTCString()}

**Your Task:**
1.  **Deep Dive Analysis:** Perform a comprehensive analysis by considering the following critical factors.
    - **Current Form & Momentum:** Analyze the last 5-10 official matches for both teams. Note winning/losing streaks, goals scored/conceded, and overall performance trends.
    - **Head-to-Head (H2H) Deep Dive:** Examine the last 5-10 meetings between these teams. Pay close attention to who was home/away for each match, the final scores, and any recurring patterns (e.g., high-scoring games, one team's dominance).
    - **Team News, Injuries & Suspensions:** This is crucial. Access the most recent team news to confirm player availability. List any key players who are injured, suspended, or likely to be rested. The absence of a star player can completely change the outcome.
    - **League Context & Motivation:** Consider their current league positions, importance of the match (e.g., relegation battle, title race, derby), and potential for squad rotation.
    - **Tactical Matchup:** Compare their likely formations, playing styles (e.g., possession-based vs. counter-attacking), and how they might counter each other's strengths.
2.  **Generate Betting Tips:** Based on your analysis, provide a comprehensive list of at least 10-15 betting tips with a confidence score (0-100) for each. Ensure you cover a wide variety of markets. The 'tips' array in your JSON response **must** include predictions for the following categories where sufficient data exists to make a confident prediction:
    - **Match Result** (W1, X, W2)
    - **Double Chance** (1X, 12, 2X)
    - **BTTS** (BTTS, BTTS-NO)
    - **Total Goals** (e.g., TO 2.5, TU 3.5)
    - **Team Total Goals** (e.g., 1TO 1.5, 2TU 0.5)
    - **Asian Handicap** (e.g., H -1.5, A +0.5)
    - **Total Corners** (e.g., CO 9.5, CU 10.5)
    - **Team Corners** (e.g., 1CO 5.5, 2CU 3.5)
    - **HT/FT Result** (e.g., W1/W1, X/W2)
3.  **Generate Key Tips for Accumulators:**
    - **Safe Tip:** Identify the single safest tip with the highest probability of success (typically confidence > 80%). This is a foundational bet for a low-risk accumulator. It must be returned in the 'safeTip' field.
    - **Value Tip:** Identify a tip that represents excellent value. This is where your analysis indicates a significantly higher probability of success than what typical market odds would suggest. It should be a well-reasoned bet that has a strong chance of winning but is also priced attractively. Avoid extremely risky long-shots; focus on 'mispriced' opportunities with solid analytical backing. It must be returned in the 'valueTip' field.
4.  **Write a Detailed Preview:** Compose a professional, in-depth match preview in Markdown format. Structure it with these sections:
    - **Match Preview:** Briefly introduce the match, its context, and importance.
    - **Recent Form Analysis:** Detail the recent performance of both teams.
    - **H2H Insights:** Summarize key findings from their head-to-head history.
    - **Injury & Team News:** List significant player absences and their potential impact.
    - **Tactical Breakdown:** Analyze the expected tactical battle.
    - **Key Players:** Identify one player from each team who could be decisive.
    - **Prediction Rationale:** Conclude with a summary of your reasoning for the predictions.
    - **Betting Odds Analysis:** Compare your analysis with typical market odds (e.g., from a major bookmaker). This comparison is critical for identifying value. Highlight where your calculated confidence diverges positively from the implied probability of the odds. This is the foundation for your 'Value Tip'. Suggest potential tips on secondary markets like corners, cards, or HT/FT results if there are strong indicators.
5.  **Predict Correct Scores:** Based on your analysis, provide a list of the three most probable final scores.

**JSON Output Instructions & Value Formatting:**
Return ONLY the JSON object. The JSON object must conform to the provided schema, including the 'safeTip', 'valueTip', and 'correctScores' array. The analysis must be a single string with markdown formatting.
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as PredictionResult;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse prediction data. The AI may have returned an invalid format.");
    }
    throw new Error("An error occurred while generating the prediction.");
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
        model: 'gemini-2.5-pro',
        contents: prompt,
      });

      return response.text;
  } catch (error) {
      console.error("Gemini accumulator API call failed:", error);
      throw new Error("An error occurred while generating the accumulator tips.");
  }
}