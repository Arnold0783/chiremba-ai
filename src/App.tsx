import React, { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import axios from "axios";
import { FiSend, FiMic, FiRefreshCw, FiVolume2, FiVolumeX } from "react-icons/fi";

// Web Speech API
const SpeechRecognitionConstructor =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;

interface ChatMessage {
  sender: "user" | "doctor";
  text: string;
  audio?: boolean;
}

const App: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [typing, setTyping] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [mute, setMute] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Track current audio/speech
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    if (!SpeechRecognitionConstructor) return alert("Voice recognition not supported.");
    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.start();
      setRecording(true);
      setRecognitionInstance(recognition);

      recognition.onresult = (event: any) => {
        let transcript = "";
        const startIndex = event.resultIndex ?? 0;
        for (let i = startIndex; i < event.results.length; i++) {
          if (event.results[i][0]) transcript += event.results[i][0].transcript;
        }
        setMessage(transcript);
      };

      recognition.onend = () => {
        setRecording(false);
        if (recognitionInstance) recognition.start();
      };
    } catch {
      alert("Voice recognition failed. Use Chrome for best results.");
    }
  };

  const toggleRecording = () => {
    if (!recognitionInstance) return startListening();
    if (recording) {
      recognitionInstance.stop();
      setRecording(false);
    } else {
      recognitionInstance.start();
      setRecording(true);
    }
  };

  // Stop current speech/audio immediately
  const stopSpeech = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentUtteranceRef.current) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
  };

  const speakText = (text: string, lang?: string) => {
    if (mute) return;
    const speech = new SpeechSynthesisUtterance(text);
    currentUtteranceRef.current = speech;
    speech.lang = lang || detectLanguage(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
  };

  const playAudio = (base64Audio: string | null, text: string) => {
    if (mute) return;

    if (base64Audio) {
      try {
        const base64Data = base64Audio.replace(/^data:audio\/mpeg;base64,/, "");
        const byteChars = atob(base64Data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.play();
        audio.onended = () => (currentAudioRef.current = null);
        return;
      } catch {
        // fallback if audio fails
      }
    }
    // Always speak text if audio is missing
    speakText(text);
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    setChat(prev => [...prev, { sender: "user", text: message }]);
    setLoading(true);
    setTyping(true);

    try {
      const res = await axios.post("https://chiremba-ai.onrender.com/chat", { message });
      const reply: string = res.data.response;

      // Add doctor message immediately
      setChat(prev => [...prev, { sender: "doctor", text: reply, audio: !!res.data.audio }]);
      playAudio(res.data.audio ?? null, reply);
      setTyping(false);
      setLoading(false);
    } catch {
      const errorMsg = "Server error";
      setChat(prev => [...prev, { sender: "doctor", text: errorMsg }]);
      speakText(errorMsg);
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value);

  const toggleMute = () => {
    setMute(prev => {
      const newMute = !prev;
      if (newMute) stopSpeech(); // stop any ongoing audio/speech immediately
      return newMute;
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatBox}>
        {/* HEADER */}
        <div style={styles.header}>
          <img src="/zim-flag.png" alt="Zimbabwe Flag" style={styles.flag} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", fontSize: 20, color: "#0277bd" }}>DR. CHIREMBA</span>
            <span style={{ fontWeight: "normal", fontSize: 10, color: "#555" }}>
              Full stack development by Arnold Ndlovu
            </span>
          </div>
        </div>

        {/* CHAT AREA */}
        <div style={styles.chatArea}>
          {chat.map((msg, idx) => (
            <div key={idx} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === "user" ? "flex-end" : "flex-start"
            }}>
              <span style={{
                padding: "10px 14px",
                borderRadius: 20,
                maxWidth: "75%",
                background: msg.sender === "user" ? "linear-gradient(135deg,#0277bd,#81d4fa)" : "linear-gradient(135deg,#6a1b9a,#ab47bc)",
                color: "#fff",
                fontSize: 15,
                wordWrap: "break-word",
                boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
              }}>{msg.text}</span>
            </div>
          ))}
          {typing && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* INPUT AREA */}
        <div style={styles.inputArea}>
          <input
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={buttonStyle}><FiSend size={20} /></button>
          <button onClick={toggleRecording} style={buttonStyle}>
            <FiMic size={20} color={recording ? "#f44336" : "#fff"} />
          </button>
          <button onClick={toggleMute} style={buttonStyle}>
            {mute ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
          </button>
          <button onClick={resetConversation} style={{ ...buttonStyle, background: "rgba(244,67,54,0.6)" }}><FiRefreshCw size={20} /></button>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "linear-gradient(135deg, #e0f7fa, #b2ebf2)", padding: 5 },
  chatBox: { width: "100%", maxWidth: 420, height: "95vh", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", boxShadow: "0 15px 40px rgba(0,0,0,0.15)", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(25px)", WebkitBackdropFilter: "blur(25px)", border: "1px solid rgba(255,255,255,0.3)" },
  header: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: "bold", fontSize: 20, color: "#0277bd", padding: 8, background: "rgba(224,247,250,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderBottom: "1px solid rgba(2,1,82,0.3)" },
  flag: { width: 40, height: 30, borderRadius: 20 },
  chatArea: { flex: 1, padding: 6, display: "flex", flexDirection: "column", overflowY: "auto", gap: 6, backgroundImage: "url('/chat-bg.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
  inputArea: { display: "flex", alignItems: "center", padding: 6, borderTop: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", gap: 5 },
  input: { flex: 1, padding: "8px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.5)", fontSize: 14, outline: "none", background: "rgba(255,255,255,0.25)", color: "#0277bd", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }
};

const buttonStyle: React.CSSProperties = { padding: 8, borderRadius: "50%", background: "rgba(3,169,244,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

const TypingIndicator: React.FC = () => (
  <div style={{ display: "flex", justifyContent: "flex-start" }}>
    <span style={{ padding: "4px 10px", borderRadius: 15, background: "rgba(77,12,126,0.25)", color: "#f8fbfc", fontSize: 12, animation: "blink 1.2s infinite" }}>
      Dr. Chiremba is typing...
    </span>
  </div>
);

export default App;