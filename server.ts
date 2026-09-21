import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser middleware with large payload limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy/Safe Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: Date.now() 
  });
});

/**
 * Endpoint: POST /api/ai-draw-subject
 * Uses Gemini API to detect, isolate, and transform the subject into a hand-drawn pencil/ink sketch.
 */
app.post("/api/ai-draw-subject", async (req, res) => {
  try {
    const { 
      imageBase64, 
      detailLevel = "simple", // simple | medium | detailed
      cleanLines = true,
      subjectHint = "", 
      seedPoint = null,
      backgroundMode = "transparent"
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 payload" });
    }

    // Clean base64 string
    const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    const mimeType = match ? match[1] : "image/png";
    const base64Data = match ? match[2] : imageBase64;

    const ai = getGeminiClient();

    if (!ai) {
      // Return helpful message so frontend can use our built-in high-precision client-side Neural Drawing Engine
      return res.json({
        success: false,
        source: "client-engine-fallback",
        message: "Gemini API Key is not configured on the server. Falling back to high-precision local AI engine.",
      });
    }

    // Build prompt for subject-only clean line art / line drawing
    let subjectDescriptor = "the primary foreground subject (such as a person, animal, vehicle, or product)";
    if (subjectHint) {
      subjectDescriptor = `the subject specified as: "${subjectHint}"`;
    } else if (seedPoint) {
      subjectDescriptor = `the specific subject located around relative coordinate (${Math.round(seedPoint.x)}, ${Math.round(seedPoint.y)})`;
    }

    const detailInstruction = detailLevel === "very_simple"
      ? "VERY SIMPLE / ROUGH INITIAL SKETCH (DEFAULT): Extract ONLY the outer silhouette outline (contour) and the absolute most essential structural lines (head oval, basic face placement, simplified hair outline, main clothing silhouette, and primary limb lines). This must look like the very first rough pencil stage before adding details. Absolutely NO fine lines, NO wrinkles, NO micro-details."
      : detailLevel === "simple"
      ? "SIMPLE: Extract the clean outer outline plus essential structural lines (facial features, hair flow, garment borders, arms and legs). Omit all fine creases, pores, and textures."
      : "MEDIUM: Extract the clean outer outline, primary structural lines, and key secondary lines (main facial features and prominent garment seams) as a clean pencil drawing.";

    const systemPrompt = `You are a master artist specializing in clean initial pencil sketches (رسم مبدئي بالقلم الرصاص).

TASK:
1. Identify ${subjectDescriptor} in the image.
2. COMPLETELY REMOVE AND DISCARD THE BACKGROUND: Render the area outside the subject as pure transparent or solid white. Do NOT draw any background objects (no streets, buildings, ground, trees, sky, furniture, or surrounding people).
3. Transform ONLY the isolated subject into a CLEAN ROUGH INITIAL PENCIL SKETCH (رسم مبدئي بالقلم الرصاص).
4. DETAIL LEVEL:
   ${detailInstruction}
5. STRICT NEGATIVE RULES (WHAT TO ELIMINATE COMPLETELY):
   - NO colors, NO skin tone, NO clothing colors, NO grayscale photographic tones.
   - NO shadows, NO shading, NO cross-hatching, NO gradients, NO lighting reflections.
   - NO skin pores, NO skin texture, NO hair strands (only hair outline/flow), NO wrinkles, NO fabric texture.
   - NO noise, NO stray dots, NO jittery double lines.
   - NO background elements or surroundings.
6. CRITICAL PRESERVATION:
   - Accurately preserve the subject's exact pose, proportions, anatomy, and likeness.
   - Do NOT alter the person or object, and do NOT make it cartoonish or distorted.
   - The result must look exactly like an artist's first-stage rough pencil sketch on white/transparent paper.`;

    // Call Gemini 3.1 Flash Image model for multi-modal image-to-image transformation
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K",
          },
        },
      });

      let generatedImageDataUrl: string | null = null;
      let textOutput = "";

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || "image/png";
            generatedImageDataUrl = `data:${outMime};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textOutput += part.text;
          }
        }
      }

      if (generatedImageDataUrl) {
        return res.json({
          success: true,
          source: "gemini-3.1-flash-image",
          imageUrl: generatedImageDataUrl,
          description: textOutput || "AI Hand-drawn Subject Sketch generated successfully.",
        });
      }

      // If image part wasn't returned, use flash text model for semantic segmentation guidance or return client-engine guidance
      return res.json({
        success: false,
        source: "client-engine-fallback",
        message: textOutput || "Gemini text analysis received; routing to high-precision local AI engine.",
      });
    } catch (genError: any) {
      console.warn("Gemini generation attempt error, using client fallback:", genError?.message || genError);
      return res.json({
        success: false,
        source: "client-engine-fallback",
        error: genError?.message || "AI image generation service unavailable.",
      });
    }
  } catch (error: any) {
    console.error("AI Subject Drawing Server Error:", error);
    return res.status(500).json({
      error: "Internal server error during AI subject drawing",
      details: error?.message || String(error),
    });
  }
});

/**
 * Start Server with Vite Middleware
 */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
