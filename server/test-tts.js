const axios = require("axios");
const fs = require("fs");

const API_KEY = "sk_dc977c50f59a82a7811452b452d9fd6b30a48eabbe25016a";
const VOICE_ID = "CwhRBWXzGAHq8TQ4Fs17";

async function testTTS() {
  try {
    const res = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      responseType: "arraybuffer",
      data: {
        text: "Hello, this is a test of the ElevenLabs voice system."
      }
    });

    fs.writeFileSync("voice.mp3", res.data);
    console.log("✅ SUCCESS: voice.mp3 created");

  } catch (err) {
    console.log("❌ ERROR:", err.response?.status);
    console.log(err.response?.data || err.message);
  }
}

testTTS();