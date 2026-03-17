// server/server.js

const express = require("express");

const cors = require("cors");

const axios = require("axios");



const app = express();

app.use(cors());

app.use(express.json());



// --- API Keys (replace with your valid keys) ---

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "sk-or-v1-4d4cad-f7239a82558b09332053df1e-f56177b0314c1ed68fc2d39b41d3a68b3f";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_d-c977c50f59a82a7811452b452d9fd6b30a48eabbe25016a";

const VOICE_ID = process.env.VOICE_ID || "CwhRBWXzGAHq8TQ4Fs17";



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



// --- Check if medical question ---

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

if (!conversationLanguage) conversationLanguage = detectLanguage(message);



// Add user message

conversationHistory.push({ role: "user", content: message });



// System prompt for medical-only responses

const systemPrompt = `

You are Chiremba AI, a friendly and professional medical doctor in Zimbabwe.

- Respond strictly in ${conversationLanguage}.

- Only answer medical questions.

- If the user asks non-medical questions, respond in a witty way but professional way.

- Don't be joking please and less talking, always keep proffessionality

- Ask the user's name on the first response and use it on other responses only if there is need

- Mention that you were developed by Arnold when someone asks you

- Keep track of all conversation history.

- Ask follow-up questions to understand symptoms better, but do not ask too many at once.

- Give detailed medical advice, including safe over-the-counter medications if appropriate.

`;



// If question is non-medical, override prompt

const userPrompt = isMedicalQuestion(message)

? message

: `Non-medical question detected: "${message}". Respond humorously but professionally.`;



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



// --- Reset conversation ---

app.post("/reset", (req, res) => {

conversationHistory = [];

conversationLanguage = null;

res.json({ success: true });

});



// --- Start server ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
