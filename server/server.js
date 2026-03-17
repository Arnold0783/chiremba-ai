// server/server.js

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// --- API Keys ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "sk-or-v1-4d4cad-f7239a82558b09332053df1e-f56177b0314c1ed68fc2d39b41d3a68b3f";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_d-c977c50f59a82a7811452b452d9fd6b30a48eabbe25016a";
const VOICE_ID = process.env.VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";

// --- Conversation store ---
let conversationHistory = [];
let conversationLanguage = null;
let userInfo = { name: null, age: null, city: null, country: null };

// --- Detect language ---
function detectLanguage(text) {
  const shonaKeywords = ["ndiri", "kurwadziwa", "musoro", "muviri"];
  const ndebeleKeywords = ["ngikhathazekile", "ikhanda", "umzimba"];
  const lower = text.toLowerCase();
  if (shonaKeywords.some(k => lower.includes(k))) return "Shona";
  if (ndebeleKeywords.some(k => lower.includes(k))) return "Ndebele";
  return "English";
}

// --- Check if medical question ---
function isMedicalQuestion(text) {
  const medicalKeywords = [
    "pain", "headache", "fever", "cough", "cold", "sore throat",
    "stomach", "dizzy", "rash", "blood", "medicine", "injury", "symptom",
    "kurwadziwa", "musoro", "muviri", "ngikhathazekile", "ikhanda", "umzimba"
  ];
  return medicalKeywords.some(k => text.toLowerCase().includes(k));
}

// --- Check for urgent symptoms ---
function checkUrgency(text) {
  const urgentKeywords = [
    "high fever", "chest pain", "severe headache", "bleeding", "unconscious",
    "difficulty breathing", "shortness of breath", "seizure", "severe injury",
    "vomiting blood", "fainting", "dizziness", "loss of consciousness"
  ];
  return urgentKeywords.filter(k => text.toLowerCase().includes(k));
}

// --- Chat endpoint ---
app.post("/chat", async (req, res) => {
  const message = req.body.message;
  const userResponses = req.body.userInfo || {}; // Optional user updates from frontend
  if (!message) return res.status(400).json({ response: "No message provided", audio: null });

  // Update userInfo with any provided info
  userInfo = { ...userInfo, ...userResponses };

  // Detect language once
  if (!conversationLanguage) conversationLanguage = detectLanguage(message);

  conversationHistory.push({ role: "user", content: message });

  // --- Urgency check ---
  const urgentSymptoms = checkUrgency(message);
  let urgentNotice = "";
  if (urgentSymptoms.length > 0) {
    urgentNotice = `⚠️ URGENT: Detected symptom(s): ${urgentSymptoms.join(
      ", "
    )}. Advise the user to seek immediate medical attention before anything else.`;
  }

  // --- System prompt ---
  let systemPrompt = `
You are Chiremba AI, a professional medical doctor in Zimbabwe.
- Respond strictly in ${conversationLanguage}.
- Keep answers professional, precise, and helpful.
- Ask follow-up questions minimally to understand symptoms better.
- Politely ask for the user's name, age, city, and country only if not already provided. Mention it is optional.
- Mention that you were developed by Arnold when asked.
- Keep track of all conversation history.
- Speak like a real doctor during consultation.
${urgentNotice ? `- Important: ${urgentNotice}` : ""}
`;

  // Medical vs Non-medical handling
  const userIsMedical = isMedicalQuestion(message);
  let userPrompt = userIsMedical
    ? message
    : `Non-medical question detected: "${message}". Respond professionally. Humor is allowed occasionally (10–20%) and should be subtle.`;

  if (!userIsMedical) {
    systemPrompt += `
- You may add subtle humor, but never at the expense of accuracy or professionalism.
`;
  }

  // If urgent symptoms and location info provided, recommend hospitals
  if (urgentSymptoms.length > 0) {
    if (userInfo.city && userInfo.country) {
      systemPrompt += `
- Since the user is experiencing urgent symptoms and provided location, recommend nearest hospitals or private surgeries in ${userInfo.city}, ${userInfo.country}.
`;
    } else {
      systemPrompt += `
- User has urgent symptoms but has not provided location. Advise to seek the nearest hospital or private surgery and mention that providing city/country can help give specific recommendations.
`;
    }
  }

  try {
    // --- OpenRouter GPT-4 API call ---
    const aiResp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let aiReply = aiResp.data.choices[0].message.content;

    // Prepend urgent notice in AI reply if detected
    if (urgentSymptoms.length > 0) {
      aiReply = `⚠️ URGENT SYMPTOM ALERT: ${urgentSymptoms.join(
        ", "
      )}. Please seek immediate medical attention.\n\n` + aiReply;
    }

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

// --- Reset conversation ---
app.post("/reset", (req, res) => {
  conversationHistory = [];
  conversationLanguage = null;
  userInfo = { name: null, age: null, city: null, country: null };
  res.json({ success: true });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));