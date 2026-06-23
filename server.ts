import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize server-side Gemini client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Fact-checking / Show Auto-complete Endpoint
  app.post("/api/fact-check", async (req, res) => {
    const { showName } = req.body;
    if (!showName) {
      return res.status(400).json({ error: "Show name is required" });
    }

    const prompt = `You are an expert TV show database assistant. Fact check the existence, accurate season count, and episodes count of the TV show titled "${showName}". Do your best to search your knowledge bases and retrieve accurate real-world metadata.
    Provide a structured response. If the show is real, provide true information. If the show is unknown, fictional, or misspelled, correct it to the nearest match or state that it is custom/unknown. Do not hallucinate.`;

    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isReal: {
            type: Type.BOOLEAN,
            description: "Whether the show actually exists in real life."
          },
          officialName: {
            type: Type.STRING,
            description: "The official correct name of the show. If isReal is false, keep the original name."
          },
          totalSeasons: {
            type: Type.INTEGER,
            description: "Total number of seasons of the show. Default to 1 if isReal is false or unknown."
          },
          episodesPerSeasonUniform: {
            type: Type.INTEGER,
            description: "Estimate of average episodes count per season (e.g. 10 or 22). Default to 10 if unknown."
          },
          summary: {
            type: Type.STRING,
            description: "A 1-2 sentence real synopsis of the show."
          },
          genre: {
            type: Type.STRING,
            description: "A primary genre (e.g., Drama, Comedy, Sci-Fi)."
          },
          premieredYear: {
            type: Type.STRING,
            description: "Year show premiered (e.g., '2016' or '2024')."
          }
        },
        required: ["isReal", "officialName", "totalSeasons", "episodesPerSeasonUniform", "summary", "genre", "premieredYear"]
      }
    };

    try {
      // Try primary gemini-2.5-flash model (efficient & stable)
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: schemaConfig
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from gemini-2.5-flash");
        const parsed = JSON.parse(text.trim());
        return res.json(parsed);
      } catch (err2_5: any) {
        console.warn("Primary gemini-2.5-flash failed, trying fallback gemini-1.5-flash...", err2_5);
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
          config: schemaConfig
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from gemini-1.5-flash");
        const parsed = JSON.parse(text.trim());
        return res.json(parsed);
      }
    } catch (err: any) {
      console.error("All Gemini API models failed. Triggering client fallback metadata.", err);
      // Graceful baseline metadata fallback
      return res.json({
        isReal: false,
        officialName: showName,
        totalSeasons: 5,
        episodesPerSeasonUniform: 10,
        summary: `Custom profile created for "${showName}".`,
        genre: "Drama",
        premieredYear: new Date().getFullYear().toString(),
        warningMessage: "The AI Fact-Checking service is currently busy or under high demand. A baseline profile has been auto-populated. Feel free to customize its specs!"
      });
    }
  });

  // Vite middleware for dev or static serving for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
