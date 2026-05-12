import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Sparkles, Cpu, Cloud, X, MessageCircle, Loader2, ChevronDown, RotateCcw, Maximize2, Minimize2, GripVertical, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import useAppStore from '../store/useAppStore';

/**
 * Safe Parse : Garantit que les données de messages sont toujours une chaîne lisible.
 * Utilisé pour contrer les erreurs de lecture CLOB potentielles.
 */
const safeParseMessage = (rawData) => {
  if (!rawData) return "";
  try {
    if (typeof rawData === 'string') {
      let cleaned = rawData.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        try { 
          const parsed = JSON.parse(cleaned);
          return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch { return cleaned; }
      }
      return cleaned;
    }
    return typeof rawData === 'object' ? JSON.stringify(rawData, null, 2) : String(rawData);
  } catch (e) {
    console.error("safeParseMessage error:", e);
    return "Erreur de formatage du message";
  }
};

export default function ChatWidget({ context, title = "Expert DBA Oracle", isDrawer = false, isOpen: externalIsOpen, onToggle }) {
  const { chatbotWidth, setChatbotWidth } = useAppStore();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isOpen = isDrawer ? externalIsOpen : internalIsOpen;
  const setIsOpen = isDrawer ? onToggle : setInternalIsOpen;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [model, setModel] = useState("auto"); // auto, llama3, nemotron
  const [status, setStatus] = useState("connecté"); // connecté, déconnecté, en cours...
  const [isStreaming, setIsStreaming] = useState(false);
  
  const ws = useRef(null);
  const scrollRef = useRef(null);
  const convIdRef = useRef(localStorage.getItem('og_chat_conv_id') || `conv_${Date.now()}`);
  const isResizing = useRef(false);

  // 1. Initialisation : Charger l'historique et connecter le WebSocket
  useEffect(() => {
    localStorage.setItem('og_chat_conv_id', convIdRef.current);
    fetchHistory();
    connectWS();
    return () => { if (ws.current) ws.current.close(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, isOpen]);

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/api/chat/history/${convIdRef.current}`);
      const history = res.data.map(m => ({
        role: m.role,
        content: safeParseMessage(m.content)
      }));
      setMessages(history);
    } catch (err) {
      console.error("Erreur historique chat:", err);
    }
  };

  const connectWS = () => {
    const userId = "user_123";
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    
    ws.current = new WebSocket(`${protocol}//${host}/api/chat/ws/${userId}/${convIdRef.current}`);

    ws.current.onopen = () => setStatus("connecté");
    ws.current.onclose = () => {
      setStatus("déconnecté");
      setTimeout(connectWS, 5000);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chunk") {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content += data.content;
            return newMessages;
          } else {
            return [...prev, { role: "assistant", content: data.content }];
          }
        });
      } else if (data.type === "status") {
        setStatus(data.content);
      } else if (data.type === "done") {
        setIsStreaming(false);
        setStatus("connecté");
      } else if (data.type === "error") {
        setIsStreaming(false);
        setStatus("erreur");
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${data.content}` }]);
      }
    };
  };

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;

    const userMsg = { role: "user", content: inputText };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        message: inputText,
        context: context,
        model: model
      }));
      setInputText("");
    } else {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Erreur : Connexion WebSocket perdue." }]);
      setIsStreaming(false);
    }
  };

  const resetConversation = () => {
    convIdRef.current = `conv_${Date.now()}`;
    localStorage.setItem('og_chat_conv_id', convIdRef.current);
    setMessages([]);
    if (ws.current) ws.current.close();
    connectWS();
  };

  const startResizing = (e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResize = (e) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < 800) {
      setChatbotWidth(newWidth);
    }
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  const suggestions = [
    "Explique les erreurs ORA présentes.",
    "Pourquoi l'audit a retourné 0 ligne ?",
    "Quelles sont les solutions pour ces goulots ?",
    "Optimise ce script SQL."
  ];

  const renderChatContent = () => (
    <>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Bot size={24} color="#a78bfa" />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: status === 'connecté' ? '#10b981' : '#ef4444', border: '1px solid #0f172a' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{title}</div>
            <div style={{ fontSize: '0.7rem', color: status === 'connecté' ? '#94a3b8' : '#ef4444' }}>{status}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={resetConversation} title="Nouvelle conversation" style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><RotateCcw size={18} /></button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>
      </div>

      {/* Model Selector */}
      <div style={{ padding: '8px 20px', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 10, fontSize: '0.75rem' }}>
         <button onClick={() => setModel("auto")} style={{ color: model === 'auto' ? '#a78bfa' : '#64748b', borderBottom: model === 'auto' ? '2px solid #a78bfa' : 'none', padding: '4px 0', background: 'none', cursor: 'pointer' }}>AUTO</button>
         <button onClick={() => setModel("llama3")} style={{ color: model === 'llama3' ? '#38bdf8' : '#64748b', borderBottom: model === 'llama3' ? '2px solid #38bdf8' : 'none', padding: '4px 0', background: 'none', cursor: 'pointer' }}>LLAMA 3 (Local)</button>
         <button onClick={() => setModel("nemotron")} style={{ color: model === 'nemotron' ? '#10b981' : '#64748b', borderBottom: model === 'nemotron' ? '2px solid #10b981' : 'none', padding: '4px 0', background: 'none', cursor: 'pointer' }}>NEMOTRON (Cloud)</button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', marginBottom: '16px' }}><Bot size={32} color="#a78bfa" /></div>
            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '1rem' }}>Comment puis-je vous aider ?</div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px' }}>Posez-moi une question sur vos audits Oracle.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: '20px' }}>
               {suggestions.map((s, i) => (
                 <button key={i} onClick={() => setInputText(s)} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', color: '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer' }}>{s}</button>
               ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            display: 'flex', gap: 10,
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: m.role === 'user' ? '#334155' : 'rgba(139, 92, 246, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {m.role === 'user' ? <User size={16} color="#94a3b8" /> : <Bot size={16} color="#a78bfa" />}
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
              background: m.role === 'user' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              color: m.role === 'user' ? 'white' : '#cbd5e1',
              fontSize: '0.9rem', lineHeight: '1.5',
              boxShadow: m.role === 'user' ? '0 4px 15px rgba(139, 92, 246, 0.2)' : 'none'
            }}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={16} color="#a78bfa" /></div>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px 16px 16px 2px' }}>
              <Loader2 size={16} className="animate-spin" color="#64748b" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', background: 'rgba(30, 41, 59, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez votre question..."
            style={{
              width: '100%', padding: '12px 48px 12px 16px',
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', color: 'white', outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isStreaming}
            style={{
              position: 'absolute', right: 8, top: 8,
              width: 32, height: 32, borderRadius: '8px',
              background: inputText.trim() ? '#8b5cf6' : 'transparent',
              border: 'none', color: inputText.trim() ? 'white' : '#64748b',
              cursor: inputText.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', marginTop: '10px' }}>
          OracleGuard AI v2.0 - Réponses générées par intelligence artificielle.
        </div>
      </div>
    </>
  );

  if (isDrawer) {
    return (
      <div style={{
        width: isOpen ? chatbotWidth : 0,
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(30px)',
        borderLeft: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: isResizing.current ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.3)' : 'none',
        zIndex: 1000,
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {/* Resize Handle */}
        {isOpen && (
          <div 
            onMouseDown={startResizing}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: 'col-resize',
              zIndex: 10,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          />
        )}
        {isOpen && renderChatContent()}
      </div>
    );
  }

  return (
    <div className="chat-widget-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="hover-lift"
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
            border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)', cursor: 'pointer'
          }}
        >
          <MessageSquare size={30} />
          {messages.length > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', border: '2px solid #0f172a' }}>
              {messages.length}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div style={{
          width: '400px', height: '600px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden'
        }}>
          {renderChatContent()}
        </div>
      )}
    </div>
  );
}
