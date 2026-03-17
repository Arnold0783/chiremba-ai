const axios = require("axios");

const API_KEY = "sk_ba20d1824da646e5af943d030898e41ca87b8f914ba10dfb";

async function testKey() {
  try {
    const response = await axios.get(
      "https://api.elevenlabs.io/v1/voices",
      {
        headers: {
          "xi-api-key": API_KEY
        }
      }
    );

    console.log("✅ API Key works!");
    console.log("Available voices:");
    console.log(response.data);

  } catch (error) {
    console.log("❌ API Key failed");
    console.log(error.response?.status);
    console.log(error.response?.data);
  }
}

testKey();