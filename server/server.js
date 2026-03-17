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

// --- Language detection ---
function detectLanguage(text) {
  const shona = ["ndiri", "kurwadziwa", "musoro", "muviri", "tsandanyama", "fivha", "kubuda ropa", "kuzvimba", "kusvotwa"];
  const ndebele = ["ngikhathazekile", "ikhanda", "umzimba", "ukugula", "ubuhlungu", "umkhuhlane"];
  const lower = text.toLowerCase();
  if (shona.some(k => lower.includes(k))) return "Shona";
  if (ndebele.some(k => lower.includes(k))) return "Ndebele";
  return "English";
}

// --- Medical keyword detection ---
function isMedicalQuestion(text) {
  const keywords = [
    "pain","headache","fever","cough","cold","sore throat","stomach","dizzy","rash","blood",
    "medicine","injury","symptom","vomiting","diarrhea","nausea","infection","swelling","bruise",
    "allergy","fatigue","weakness","chest pain","breathing","shortness of breath","flu","migraine",
    "kurwadziwa","musoro","muviri","tsandanyama","kupisa","fivha","kubuda ropa","kuzvimba",
    "kudikitira","kusvotwa","kurutsa","kupera simba",
    "ngikhathazekile","ikhanda","umzimba","ukugula","ubuhlungu","umkhuhlane",
    "ukukhwehlela","ukukhathele","ukuzizwa kabi"
  ];
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

// --- Urgent symptoms ---
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

// --- Generate safe medication suggestion ---
function generateMedicationPrompt(symptomText, userInfo) {
  const age = userInfo.age || "unknown age";
  return `Based on these symptoms: "${symptomText}" and user age: ${age}, recommend safe first-line or over-the-counter medications if appropriate. ` +
         `Always advise seeing a doctor for severe or persistent symptoms.`;
}

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
  const userIsMedical = isMedicalQuestion(message);

  // --- Greetings ---
  if (greetings.test(message)) {
    let greetMsg = "Hello! 😄 ";
    if (!userInfo.name) greetMsg += "May I have your name please? ";
    greetMsg += "How are you feeling today? Any health concerns I can help with?";
    return res.json({ response: greetMsg, audio: null });
  }

  // --- Farewell ---
  if (farewells.test(message)) {
    let byeMsg = "Goodbye! Take care and stay healthy 😎.";
    if (userInfo.name) byeMsg = `Goodbye ${userInfo.name}! Take care and stay healthy 😎.`;
    return res.json({ response: byeMsg, audio: null });
  }

  // --- Non-medical witty response ---
  if (!userIsMedical && !isDeveloperQuery) {
    return res.json({
      response: "Haha 😅 I’m your friendly doctor AI, not a trivia bot… but I can help with your health! Any symptoms you want to discuss?",
      audio: null
    });
  }

  // --- Urgent symptoms ---
  const urgentSymptoms = checkUrgency(message);
  let urgentNotice = urgentSymptoms.length > 0 ? `Detected symptom(s): ${urgentSymptoms.join(", ")}. Please seek immediate medical attention.` : "";

  // --- Gentle guidance questions (max 2 per message) ---
  let followUpPrompt = "";
  if (userIsMedical) {
    const missing = [];
    if (!userInfo.name) missing.push("your name");
    if (!userInfo.age) missing.push("your age");
    if (!userInfo.city) missing.push("your city");
    if (!userInfo.country) missing.push("your country");

    if (missing.length > 0) followUpPrompt = missing.slice(0,2).map(info => `Could you tell me ${info}?`).join(" ");
    else followUpPrompt = "Can you describe the severity and duration of your symptoms?";
  }

  // --- System prompt ---
  let systemPrompt = `
You are Chiremba AI, a professional medical doctor in Zimbabwe.
- Respond strictly in ${conversationLanguage} for medical symptoms.
- Keep answers professional, precise, and helpful.
- Recommend safe OTC or first-line medications where appropriate.
- Ask up to 2 follow-up questions per message when needed.
- Politely ask for the user's name, age, city, and country if not provided.
${urgentNotice ? `- ${urgentNotice}` : ""}
`;

  if (isDeveloperQuery) systemPrompt += "- Answer: 'I was developed by Arnold Ndlovu.'\n";

  if (urgentSymptoms.length > 0) {
    if (userInfo.city && userInfo.country) systemPrompt += `- Recommend nearest hospitals or private surgeries in ${userInfo.city}, ${userInfo.country}.\n`;
    else systemPrompt += "- Advise to seek the nearest hospital or private surgery.\n";
  }

  const userPrompt = `${message}${followUpPrompt ? "\n\n" + followUpPrompt : ""}\n\n${generateMedicationPrompt(message, userInfo)}`;

  try {
    const aiResp = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role:"system", content: systemPrompt },
          ...conversationHistory,
          { role:"user", content: userPrompt }
        ],
        temperature:0.7
      },
      { headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" } }
    );

    let aiReply = aiResp.data.choices[0].message.content;
    if (urgentSymptoms.length > 0) aiReply = `Important symptom alert: ${urgentSymptoms.join(", ")}. Seek immediate medical attention.\n\n${aiReply}`;
    conversationHistory.push({ role: "assistant", content: aiReply });

    // --- ElevenLabs TTS ---
    let audio = null;
    try {
      const ttsResp = await axios({
        method: "post",
        url:`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        headers:{ "Accept":"audio/mpeg", "Content-Type":"application/json","xi-api-key":ELEVENLABS_API_KEY },
        responseType:"arraybuffer",
        data:{ text:aiReply, voice_settings:{stability:0.8, similarity_boost:0.9} }
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
app.post("/reset", (req,res)=>{
  conversationHistory = [];
  conversationLanguage = null;
  userInfo = { name:null, age:null, city:null, country:null };
  res.json({ success:true });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));