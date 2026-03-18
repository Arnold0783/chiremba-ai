// server/server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// --- API Keys ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_d-c977c50f59a82a7811452b452d9fd6b30a48eabbe25016a";
const VOICE_ID = process.env.VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";

// --- Conversation store ---
let conversationHistory = [];
let conversationLanguage = null;
let userInfo = { name: null, age: null, city: null, country: null };

// --- Language detection ---
function detectLanguage(text) {
  const shona = ["ndiri", "kurwadziwa", "musoro", "muviri", "tsandanyama", "fivha", "kubuda ropa", "kuzvimba", "kusvotwa"];
  const ndebele = ["ngikhathazekile", "ikhanda", "umzimba", "ukugula", "ubuhlungu", "umkhuhlane"];
  const lower = text.toLowerCase();
  if (shona.some(k => lower.includes(k))) return "Shona";
  if (ndebele.some(k => lower.includes(k))) return "Ndebele";
  return "English";
}

// --- Emergency symptoms detection ---
function checkUrgency(text) {
  const urgent = [
    "high fever","chest pain","severe headache","bleeding","unconscious",
    "difficulty breathing","shortness of breath","seizure","severe injury",
    "vomiting blood","fainting","dizziness","loss of consciousness"
  ];
  return urgent.filter(k => text.toLowerCase().includes(k));
}

// --- Greetings/Farewells detection ---
const greetings = /(hi|hello|hey|good morning|good afternoon|good evening)/i;
const farewells = /(bye|goodbye|see you|later|night)/i;

// --- Chat endpoint ---
app.post("/chat", async (req, res) => {
  const message = req.body.message;
  const userResponses = req.body.userInfo || {};
  if (!message) return res.status(400).json({ response: "No message provided", audio: null });

  // Update user info
  userInfo = { ...userInfo, ...userResponses };

  // Detect language if not set
  if (!conversationLanguage) conversationLanguage = detectLanguage(message);

  conversationHistory.push({ role: "user", content: message });

  const isDeveloperQuery = /who (developed|made) you/i.test(message);

  // --- Emergency check ---
  const urgentSymptoms = checkUrgency(message);
  let urgentNotice = "";
  if (urgentSymptoms.length > 0) {
    urgentNotice = `Detected emergency symptom(s): ${urgentSymptoms.join(", ")}. Seek immediate medical attention.`;
  }

  // --- Compose system prompt ---
  let systemPrompt = `
You are Chiremba AI, a professional medical doctor in Zimbabwe.
- Respond naturally, clearly, and helpfully in ${conversationLanguage}.
- Use the user's name naturally if available.
- Alert if any emergency symptoms are detected.
- Remember previous conversation context and symptoms.
- Ask for missing user info (name, age, city, country) naturally if needed.
${urgentNotice ? `- ${urgentNotice}` : ""}
`;

  if (isDeveloperQuery) systemPrompt += "- Answer: 'I was developed by Arnold Ndlovu.'\n";

  if (urgentSymptoms.length > 0) {
    if (userInfo.city && userInfo.country) systemPrompt += `- Suggest nearest hospitals or private surgeries in ${userInfo.city}, ${userInfo.country}.\n`;
    else systemPrompt += "- Advise to seek the nearest hospital or private surgery immediately.\n";
  }

  // --- Check for missing user info ---
  const missing = [];
  if (!userInfo.name) missing.push("your name");
  if (!userInfo.age) missing.push("your age");
  if (!userInfo.city) missing.push("your city");
  if (!userInfo.country) missing.push("your country");

  let followUpPrompt = "";
  if (missing.length > 0) followUpPrompt = missing.slice(0, 2).map(info => `Could you tell me ${info}?`).join(" ");

  // --- Polite health-focused redirect for non-medical input ---
  let nonMedicalRedirect = "";
  if (!isDeveloperQuery && !message.match(/fever|pain|headache|cough|stomach|dizzy|injury|rash|blood|breathing|vomiting|chest|shortness/i)) {
    nonMedicalRedirect = "I’m here to help with your health. Could you describe any symptoms or health concerns you have?";
  }

  const userPrompt = `${message}${followUpPrompt ? "\n\n" + followUpPrompt : ""}${nonMedicalRedirect ? "\n\n" + nonMedicalRedirect : ""}`;

  try {
    const aiResp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" } }
    );

    let aiReply = aiResp.data.choices[0].message.content;

    // Prepend emergency alert if detected
    if (urgentSymptoms.length > 0) aiReply = `Emergency alert: ${urgentSymptoms.join(", ")}. Seek immediate medical attention.\n\n${aiReply}`;

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
        data: { text: aiReply, voice_settings: { stability: 0.8, similarity_boost: 0.9 } }
      });
      audio = `data:audio/mpeg;base64,${Buffer.from(ttsResp.data).toString("base64")}`;
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