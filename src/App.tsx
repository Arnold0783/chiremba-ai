import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FiSend, FiMic, FiRefreshCw } from "react-icons/fi";
import { JSX } from "react/jsx-runtime";

// Web Speech API
const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

function App(): JSX.Element {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ sender: "user" | "doctor"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      recognition.onresult = (event: any) =>
        setMessage(event.results[0][0].transcript);
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
      for (let i = 0; i < byteChars.length; i++)
        byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      new Audio(url).play();
    } catch {
      speakFallback(text);
    }
  };

  const sendMessage = async () => {
    if (message.trim() === "" || loading) return;
    setChat(prev => [...prev, { sender: "user", text: message }]);
    setLoading(true);
    setTyping(true);
    try {
      const res = await axios.post("https://chiremba-ai.onrender.com/chat", { message });
      const reply = res.data.response;
      setTimeout(() => {
        setChat(prev => [...prev, { sender: "doctor", text: reply }]);
        playAudio(res.data.audio, reply);
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

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
      background: "linear-gradient(135deg, #e0f7fa, #b2ebf2)", // soft medical background
      padding: "10px"
    }}>
      {/* MAIN CHAT CONTAINER */}
      <div style={{
        width: "420px",
        height: "90vh",
        maxHeight: "800px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "25px",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
        background: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        border: "1px solid rgba(255,255,255,0.3)",
      }}>
        {/* HEADER */}
        <div style={{
          padding: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontWeight: "bold",
          fontSize: "35px",
          color: "#0277bd", // deep blue for readability
          background: "rgba(224,247,250,0.6)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(2, 1, 82, 0.3)",
          flexShrink: 0,
        }}>
          <img src="/zim-flag.png" alt="Zimbabwe Flag" style={{ width: '70px', height: '60px', borderRadius: '40px' }} />
          DR. CHIREMBA
        </div>

        {/* CHAT AREA */}
        <div style={{
          flex: 1,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          gap: "8px",
          borderRadius: "20px",
          backgroundImage: "url('/chat-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}>
          {chat.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
            }}>
              <span style={{
                padding: "12px 18px",
                borderRadius: "25px",
                maxWidth: "75%",
                background: msg.sender === "user"
                  ? "rgba(2, 57, 82, 0.6)"      // light blue bubble
                  : "rgba(94, 2, 118, 0.3)",  // glassy doctor bubble
                color: msg.sender === "user" ? "#fff" : "#fff",
                fontSize: "20px",
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
                borderRadius: "20px",
                background: "rgba(77, 12, 126, 0.25)",
                color: "#f8fbfc",
                fontSize: "18px",
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
          padding: "12px",
          borderTop: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          gap: "8px",
          flexShrink: 0
        }}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "30px",
              border: "1px solid rgba(255,255,255,0.5)",
              fontSize: "14px",
              outline: "none",
              background: "rgba(255,255,255,0.25)",
              color: "#0277bd",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={{
            padding: "12px",
            borderRadius: "50%",
            background: "rgba(3,169,244,0.6)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px"
          }}><FiSend /></button>
          <button onClick={startListening} style={{
            padding: "12px",
            borderRadius: "50%",
            background: "rgba(3,169,244,0.6)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px"
          }}><FiMic /></button>
          <button onClick={resetConversation} style={{
            padding: "12px",
            borderRadius: "50%",
            background: "rgba(244,67,54,0.6)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "18px"
          }}><FiRefreshCw /></button>
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
}

export default App;