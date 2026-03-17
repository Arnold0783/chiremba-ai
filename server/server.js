// server/server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// --- API Keys ---
const OPENROUTER_API_KEY = "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";
const ELEVENLABS_API_KEY = "sk_dc977c50f59a82a7811452b452d9fd6b30a48eabbe25016a";
const VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17";

// --- Conversation store ---
let conversationHistory = [];
let conversationLanguage = null;

// --- Detect language ---
function detectLanguage(text) {
  const shonaKeywords = ["ndiri", "kurwadziwa", "musoro", "muviri"];
  const ndebeleKeywords = ["ngikhathazekile", "ikhanda", "umzimba"];
  const lower = text.toLowerCase();
  if (shonaKeywords.some(k => lower.includes(k))) return "Shona";
  if (ndebeleKeywords.some(k => lower.includes(k))) return "Ndebele";
  return "English";
}

// --- Detect if question is medical ---
function isMedicalQuestion(text) {
  const medicalKeywords = [
    "pain", "headache", "fever", "cough", "cold", "sore throat",
    "stomach", "dizzy", "rash", "blood", "medicine", "injury", "symptom",
    "kurwadziwa", "musoro", "muviri", "ngikhathazekile", "ikhanda", "umzimba"
  ];
  const lower = text.toLowerCase();
  return medicalKeywords.some(k => lower.includes(k));
}

// --- Chat endpoint ---
app.post("/chat", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.status(400).json({ response: "No message provided", audio: null });

  // Detect language once
  if (!conversationLanguage) {
    conversationLanguage = detectLanguage(message);
  }

  // Add user message to history
  conversationHistory.push({ role: "user", content: message });

  // System prompt: enforce medical-only responses
  const systemPrompt = `
You are Chiremba AI, a friendly and professional doctor in Zimbabwe.
- Respond strictly in ${conversationLanguage}.
- Only answer medical questions.
- If the user asks anything non-medical, reply in a humorous/funny way (still professional).
- Keep track of all conversation history.
- Ask follow-ups to understand symptoms better but do not ask too many at once.
- Give detailed medical advice, including safe OTC medications if appropriate.
- Use natural, conversational phrases, never mix languages.
`;

  try {
    const aiResp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiReply = aiResp.data.choices[0].message.content;

    // Add AI reply to history
    conversationHistory.push({ role: "assistant", content: aiReply });

    // --- ElevenLabs TTS ---
    let audio = null;
    try {
      const ttsResp = await axios({
        method: "post",
        url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY
        },
        responseType: "arraybuffer",
        data: {
          text: aiReply,
          voice_settings: { stability: 0.8, similarity_boost: 0.9 }
        }
      });
      const base64Audio = Buffer.from(ttsResp.data).toString("base64");
      audio = `data:audio/mpeg;base64,${base64Audio}`;
    } catch (ttsError) {
      console.log("ElevenLabs TTS failed, using browser fallback.");
    }

    res.json({ response: aiReply, audio });
  } catch (error) {
    console.log("Error in /chat:", error.response?.status, error.response?.data || error.message);
    res.json({ response: "Sorry, I cannot respond right now.", audio: null });
  }
});

// --- Reset ---
app.post("/reset", (req, res) => {
  conversationHistory = [];
  conversationLanguage = null;
  res.json({ success: true });
});

// --- Start server ---
app.listen(5000, () => {
  console.log("Server running on port 5000");
});