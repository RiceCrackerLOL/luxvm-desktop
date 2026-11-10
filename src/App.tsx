import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Settings, 
  Bot, 
  User, 
  X, 
  Plus, 
  Trash2, 
  Code2,
  Rocket,
  Layers,
  Palette,
  Paperclip,
  ArrowUpIcon
} from "lucide-react";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface ApiProfile {
  id: string;
  name: string;
  key: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_PROFILES: ApiProfile[] = [
  {
    id: '1',
    name: 'OpenAI Default',
    key: '',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  {
    id: '2',
    name: 'Groq Cloud',
    key: '',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile'
  }
];

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'behavior'>('keys');

  const [profiles, setProfiles] = useState<ApiProfile[]>(() => {
    const saved = localStorage.getItem('luxvm_profiles');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
  });
  
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem('luxvm_active_profile') || '1';
  });

  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('luxvm_system_prompt') || 'You are LuxVM, an advanced, helpful, and concise AI assistant.';
  });

  const [editingProfiles, setEditingProfiles] = useState<ApiProfile[]>(profiles);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    if (!activeProfile || !activeProfile.key.trim()) {
      setShowSettings(true);
      setActiveTab('keys');
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: 'user', content: query }
      ];

      const response = await fetch(activeProfile.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeProfile.key.trim()}`
        },
        body: JSON.stringify({
          model: activeProfile.model.trim() || 'gpt-4o-mini',
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API Request failed');
      }

      const aiText = data.choices?.[0]?.message?.content || 'No response generated.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: aiText }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { 
          id: Date.now().toString(), 
          sender: 'ai', 
          text: `LuxVM Error: ${err.message || 'Failed to reach endpoint. Check your Base URL and API Key.'}` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = () => {
    setProfiles(editingProfiles);
    setSystemPrompt(tempSystemPrompt);
    localStorage.setItem('luxvm_profiles', JSON.stringify(editingProfiles));
    localStorage.setItem('luxvm_system_prompt', tempSystemPrompt);
    localStorage.setItem('luxvm_active_profile', activeProfileId);
    setShowSettings(false);
  };

  const addProfile = () => {
    const newId = Date.now().toString();
    setEditingProfiles([
      ...editingProfiles,
      { id: newId, name: 'New Provider', key: '', baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
    ]);
  };

  const removeProfile = (id: string) => {
    if (editingProfiles.length <= 1) return;
    setEditingProfiles(editingProfiles.filter(p => p.id !== id));
    if (activeProfileId === id) {
      const remaining = editingProfiles.filter(p => p.id !== id);
      setActiveProfileId(remaining[0].id);
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center text-white overflow-hidden"
      style={{
        backgroundImage: "url('https://cdn.21st.dev/assets/mirror/c3/c333918af688a4a8a3d004652e6c0ee219457a9d84d380eeb31f513d4b59a09f.png')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Top Header */}
      <div className="w-full max-w-5xl flex items-center justify-between p-4 z-10 bg-black/40 backdrop-blur-md border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-400" />
          <span className="font-bold tracking-wider">LuxVM</span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeProfileId}
            onChange={(e) => {
              setActiveProfileId(e.target.value);
              localStorage.setItem('luxvm_active_profile', e.target.value);
            }}
            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.model})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setEditingProfiles(JSON.parse(JSON.stringify(profiles)));
              setTempSystemPrompt(systemPrompt);
              setShowSettings(true);
            }}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs transition"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center overflow-y-auto px-4 space-y-4 my-auto">
        {messages.length === 0 ? (
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-white drop-shadow-sm">
              LuxVM AI
            </h1>
            <p className="mt-2 text-neutral-300 text-sm">
              Universal custom endpoints unlocked — start chatting or select a quick action below.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4 py-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && <Bot className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />}
                <div
                  className={`max-w-xl p-3.5 rounded-xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-neutral-900/80 backdrop-blur-md text-neutral-200 rounded-bl-none border border-neutral-800'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === 'user' && <User className="w-5 h-5 text-neutral-400 mt-1 flex-shrink-0" />}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center text-neutral-400 text-xs animate-pulse">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>LuxVM is generating response...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Dock */}
      <div className="w-full max-w-3xl mb-8 px-4">
        <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700 shadow-2xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask LuxVM anything..."
            className="w-full px-4 py-3 resize-none border-none bg-transparent text-white text-sm focus:outline-none placeholder:text-neutral-400 min-h-[48px]"
            style={{ overflow: "hidden" }}
          />

          <div className="flex items-center justify-between p-3 border-t border-neutral-800/50">
            <button className="text-neutral-400 hover:text-white transition">
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className={`flex items-center gap-1 p-2 rounded-lg transition-colors ${
                input.trim() 
                  ? "bg-indigo-600 text-white hover:bg-indigo-500" 
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
          <QuickAction icon={<Code2 className="w-4 h-4" />} label="Generate Code" onClick={() => handleSend("Generate a clean React component")} />
          <QuickAction icon={<Rocket className="w-4 h-4" />} label="Launch App" onClick={() => handleSend("How do I structure a full-stack web application?")} />
          <QuickAction icon={<Layers className="w-4 h-4" />} label="UI Components" onClick={() => handleSend("Show me modern UI component layouts")} />
          <QuickAction icon={<Palette className="w-4 h-4" />} label="Theme Ideas" onClick={() => handleSend("Suggest a color palette for a dark mode app")} />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl w-full max-w-2xl relative shadow-2xl max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">LuxVM Configuration</h2>
            </div>

            <div className="flex border-b border-neutral-800 mb-4 gap-4">
              <button
                onClick={() => setActiveTab('keys')}
                className={`pb-2 text-sm font-medium border-b-2 transition ${
                  activeTab === 'keys' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                API Providers & Keys
              </button>
              <button
                onClick={() => setActiveTab('behavior')}
                className={`pb-2 text-sm font-medium border-b-2 transition ${
                  activeTab === 'behavior' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                System Prompt & Behavior
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTab === 'keys' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">
                      Add any custom API provider with custom Base URLs and custom models.
                    </p>
                    <button
                      onClick={addProfile}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Provider
                    </button>
                  </div>

                  {editingProfiles.map((prof, index) => (
                    <div key={prof.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={prof.name}
                          onChange={(e) => {
                            const updated = [...editingProfiles];
                            updated[index].name = e.target.value;
                            setEditingProfiles(updated);
                          }}
                          className="bg-transparent font-semibold text-sm text-white border-b border-transparent hover:border-neutral-700 focus:border-indigo-500 focus:outline-none"
                          placeholder="Provider Name"
                        />
                        {editingProfiles.length > 1 && (
                          <button
                            onClick={() => removeProfile(prof.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">API Key</label>
                          <input
                            type="password"
                            value={prof.key}
                            onChange={(e) => {
                              const updated = [...editingProfiles];
                              updated[index].key = e.target.value;
                              setEditingProfiles(updated);
                            }}
                            placeholder="gsk_... or sk-..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">Model Name (Custom)</label>
                          <input
                            type="text"
                            value={prof.model}
                            onChange={(e) => {
                              const updated = [...editingProfiles];
                              updated[index].model = e.target.value;
                              setEditingProfiles(updated);
                            }}
                            placeholder="e.g. llama-3.3-70b-versatile or gpt-4o"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">API Endpoint Base URL</label>
                        <input
                          type="text"
                          value={prof.baseUrl}
                          onChange={(e) => {
                            const updated = [...editingProfiles];
                            updated[index].baseUrl = e.target.value;
                            setEditingProfiles(updated);
                          }}
                          placeholder="https://api.groq.com/openai/v1/chat/completions"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs text-neutral-300">
                    System Prompt / AI Behavior Instructions
                  </label>
                  <p className="text-[11px] text-neutral-400">
                    Define how LuxVM should respond, what persona it should adopt, or formatting rules it should follow.
                  </p>
                  <textarea
                    value={tempSystemPrompt}
                    onChange={(e) => setTempSystemPrompt(e.target.value)}
                    rows={5}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="You are LuxVM, an expert coding assistant..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800 mt-4">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-xs rounded-lg hover:bg-neutral-800 text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs transition"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
