# 🩺 Dr. Chiremba AI



![React](https://img.shields.io/badge/React-Frontend-blue)

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)

![AI](https://img.shields.io/badge/AI-GPT4o-purple)

![Voice](https://img.shields.io/badge/Voice-ElevenLabs-orange)

![License](https://img.shields.io/badge/License-MIT-lightgrey)



Dr. Chiremba AI is a **voice-enabled AI medical assistant built for Zimbabwe 🇿🇼** that helps people understand symptoms and receive basic medical guidance using **text or voice**.



The system supports **English, Shona, and Ndebele**, making healthcare information more accessible to local communities.



———————————————

# 🌍 Vision



Millions of people in Africa struggle to access immediate medical guidance.



Dr. Chiremba AI aims to provide:



• Instant symptom understanding

• Medical guidance in local languages

• Voice interaction for accessibility

• Basic healthcare education



This project demonstrates how **AI can improve healthcare accessibility in developing regions.**

———————————————



# ✨ Features



## 🧠 AI Medical Doctor



Powered by **GPT-4o via OpenRouter**



• Understands symptoms

• Provides medical advice

• Suggests safe OTC medication

• Maintains conversation context



———————————————



## 🌐 Multilingual Support



Automatically detects and replies in:



🇬🇧 English

🇿🇼 Shona

🇿🇼 Ndebele



———————————————



## 🎤 Voice Input



Users can **speak symptoms** instead of typing.



Uses:



• Web Speech API

• Real-time speech recognition



———————————————



## 🔊 AI Voice Response



Responses are spoken using:



**ElevenLabs Text-to-Speech**



If ElevenLabs fails, the browser uses **SpeechSynthesis fallback**.



———————————————



## 💬 Smart Conversation Memory



The AI remembers the conversation:



• Tracks symptoms over time

• Asks follow-up questions

• Maintains context



———————————————



## 🧑‍⚕️ Medical Only Responses



The AI is configured to:



✔ Answer **medical questions only**

✔ Refuse unrelated topics



If a user asks something unrelated, it replies humorously like a real doctor.



Example:



User:

Who won the World Cup?



Dr. Chiremba AI:

Ahh my friend 😄 I treat headaches, not football scores. But if watching the match gave you stress, tell me about your symptoms!



———————————————



# 🎨 Modern Interface



The UI uses **glassmorphism inspired by modern iOS design**.



Features:



• Frosted glass chat interface

• Medical blue theme

• Chat background image

• Smooth scrolling

• Mobile friendly



———————————————



# 🖥️ Screenshots



/screen.png
/chat.png



———————————————



# 🏗️ System Architecture



` ` `

User (Voice/Text)

│

▼

React Frontend (App.tsx)

│

▼

Node.js Express Server

│

▼

OpenRouter GPT-4o

│

▼

AI Response

│

▼

ElevenLabs Voice

│

▼

Audio + Text Response

│

▼

Frontend Chat UI

```



———————————————



# 🛠 Tech Stack



Frontend



• React

• TypeScript

• Axios

• React Icons



Backend



• Node.js

• Express

• Axios



AI Services



• OpenRouter (GPT-4o)

• ElevenLabs Voice AI



———————————————



# 📂 Project Structure



```

chiremba-ai

│

├── public

│ ├── chat-bg.png

│ └── zim-flag.png

│

├── src

│ └── App.tsx

│

├── server

│ └── server.js

│

├── screenshots

│ └── chat.png

│

├── package.json

└── README.md

```



———————————————



# ⚙️ Installation



## 1 Clone the Repository



```

git clone https://github.com/YOUR_USERNAME/chiremba-ai.git

cd chiremba-ai

```

———————————————



## 2 Install Frontend Dependencies



```

npm install

```



———————————————



## 3 Install Backend Dependencies



```

cd server

npm install express cors axios

```



———————————————



# 🔑 Environment Setup



Edit:



```

server/server.js

```



Add your API keys:



```

const OPENROUTER_API_KEY = "YOUR_OPENROUTER_KEY";

const ELEVENLABS_API_KEY = "YOUR_ELEVENLABS_KEY";

```



———————————————



# ▶ Running the Application



## Start Backend Server



```

node server/server.js

```



Server runs on:



```

http://localhost:5000

```



———————————————

## Start Frontend



```

npm start

```



Frontend runs on:



```

http://localhost:3000

```



———————————————



# 📱 How It Works



1. User types or speaks symptoms

2. React sends request to backend

3. Backend sends message to GPT-4o

4. AI generates medical guidance

5. ElevenLabs converts response to speech

6. Chat interface displays and plays the response



———————————————



# ⚠️ Medical Disclaimer



Dr. Chiremba AI is **not a licensed medical professional**.



This system provides **general health information only** and **must not replace professional medical advice.**



For serious conditions always consult a **qualified doctor or hospital.**



———————————————



# 🚀 Future Improvements



• WhatsApp integration

• Offline rural mode

• Zimbabwe hospital locator

• Medication database

• Mobile app version



———————————————



# 👨‍💻 Author



**Arnold Ndlovu**

Creator of **Dr. Chiremba AI**



Zimbabwe 🇿🇼



———————————————



# ⭐ Support the Project



If you like this project:



⭐ Star the repository

🍴 Fork the project

🚀 Share with others