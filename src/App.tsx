import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import axios from "axios";
import { FiSend, FiMic, FiRefreshCw } from "react-icons/fi";

// Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

interface ChatMessage {
  sender: "user" | "doctor";
  text: string;
}

const App: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [typing, setTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typing]);

  const detectLanguage = (text: string) => {
    const shonaKeywords = ["ndiri", "kurwadziwa", "musoro", "muviri"];
    const ndebeleKeywords = ["ngikhathazekile", "ikhanda", "umzimba"];
    const lower = text.toLowerCase();
    if (shonaKeywords.some(k => lower.includes(k))) return "sn-ZW";
    if (ndebeleKeywords.some(k => lower.includes(k))) return "nd-ZW";
    return "en-US";
  };

  const startListening = () => {
    if (!SpeechRecognition) return alert("Voice recognition not supported.");
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.start();

      // ✅ Fix for TypeScript
      recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
      };
    } catch {
      alert("Voice recognition failed. Use Chrome for best results.");
    }
  };

  const speakFallback = (text: string, lang?: string) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = lang || detectLanguage(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  const playAudio = (base64Audio: string | null, text: string) => {
    if (!base64Audio) return speakFallback(text);
    try {
      const base64Data = base64Audio.replace(/^data:audio\/mpeg;base64,/, "");
      const byteChars = atob(base64Data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
    } catch {
      speakFallback(text);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    setChat(prev => [...prev, { sender: "user", text: message }]);
    setLoading(true);
    setTyping(true);

    try {
      const res = await axios.post("https://chiremba-ai.onrender.com/chat", { message });
      const reply: string = res.data.response;
      setTimeout(() => {
        setChat(prev => [...prev, { sender: "doctor", text: reply }]);
        playAudio(res.data.audio ?? null, reply);
        setTyping(false);
        setLoading(false);
      }, 400);
    } catch {
      setChat(prev => [...prev, { sender: "doctor", text: "Server error" }]);
      setTyping(false);
      setLoading(false);
    }

    setMessage("");
  };

  const resetConversation = async () => {
    try { await axios.post("https://chiremba-ai.onrender.com/reset"); } catch {}
    setChat([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
      background: "linear-gradient(135deg, #e0f7fa, #b2ebf2)",
      padding: 10
    }}>
      <div style={{
        width: 420,
        height: "90vh",
        maxHeight: 800,
        display: "flex",
        flexDirection: "column",
        borderRadius: 25,
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        border: "1px solid rgba(255,255,255,0.3)"
      }}>
        {/* HEADER */}
        <div style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontWeight: "bold",
          fontSize: 35,
          color: "#0277bd",
          background: "rgba(224,247,250,0.6)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(2,1,82,0.3)"
        }}>
          <img src="/zim-flag.png" alt="Zimbabwe Flag" style={{ width: 70, height: 60, borderRadius: 40 }} />
          DR. CHIREMBA
        </div>

        {/* CHAT AREA */}
        <div style={{
          flex: 1,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          gap: 8,
          borderRadius: 20,
          backgroundImage: "url('/chat-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}>
          {chat.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
            }}>
              <span style={{
                padding: "12px 18px",
                borderRadius: 25,
                maxWidth: "75%",
                background: msg.sender === "user" ? "rgba(2,57,82,0.6)" : "rgba(94,2,118,0.3)",
                color: "#fff",
                fontSize: 20,
                wordWrap: "break-word",
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)"
              }}>
                {msg.text}
              </span>
            </div>
          ))}
          {typing && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <span style={{
                padding: "8px 14px",
                borderRadius: 20,
                background: "rgba(77,12,126,0.25)",
                color: "#f8fbfc",
                fontSize: 18,
                animation: "blink 1.2s infinite",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)"
              }}>Dr. Chiremba is typing...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: 12,
          borderTop: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          gap: 8
        }}>
          <input
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.5)",
              fontSize: 14,
              outline: "none",
              background: "rgba(255,255,255,0.25)",
              color: "#0277bd",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
          />
          <button onClick={sendMessage} style={buttonStyle}><FiSend size={22} /></button>
          <button onClick={startListening} style={buttonStyle}><FiMic size={22} /></button>
          <button onClick={resetConversation} style={{ ...buttonStyle, background: "rgba(244,67,54,0.6)" }}><FiRefreshCw size={22} /></button>
        </div>

        <style>{`
          @keyframes blink {
            0% { opacity: 0.2; }
            20% { opacity: 1; }
            100% { opacity: 0.2; }
          }
        `}</style>
      </div>
    </div>
  );
};

// button style reused
const buttonStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: "50%",
  background: "rgba(3,169,244,0.6)",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 18
};

export default App;