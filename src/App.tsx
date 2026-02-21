/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  MessageSquare, 
  Image as ImageIcon, 
  FileText, 
  Send, 
  Upload, 
  Loader2, 
  Play, 
  Plus, 
  MapPin, 
  Sparkles,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Key,
  Mic,
  MicOff,
  Search,
  Wand2,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Global Declarations ---
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  isGrounding?: boolean;
  sources?: { uri: string; title: string }[];
}

interface ReelScript {
  id: string;
  title: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
}

// --- Constants ---
const REEL_SCRIPTS: ReelScript[] = [
  {
    id: 'reel-1',
    title: '“AI se Paisa kaise kama rahe log?” (HOOK Reel)',
    hook: 'Sach bataun? Log 2026 me job nahi… AI se paisa kama rahe hain 😳',
    script: '🎥 Camera on face\n🗣️\n“Sach bataun?\nLog 2026 me job nahi… AI se paisa kama rahe hain 😳\nBlog, Instagram, Freelancing…\nAur tum abhi bhi soch rahe ho ‘kaise?’\nComment me likho AI — main free roadmap dunga 🔥”',
    caption: 'AI sirf trend nahi hai, income machine hai 💰\nLate ho gaye to pachtana padega 😶\n👇 Comment karo AI',
    hashtags: ['#AIIncome', '#OnlineEarning', '#FutureSkills', '#AIMoney', '#DigitalIndia']
  },
  {
    id: 'reel-2',
    title: '“Before / After Creator Life” (Relatable + Viral)',
    hook: 'Jab tak AI ko seriously nahi liya… Tab tak zero tha',
    script: '🎥 Split screen\nLeft: 😔 “No views, no money”\nRight: 😎 “AI + Consistency = Growth”\n\n🗣️ Voiceover:\n“Jab tak AI ko seriously nahi liya…\nTab tak zero tha\nAaj views bhi hain\nAur future bhi 🔥”',
    caption: 'Sab ka zero se start hota hai 💯\nBas rukna nahi hota 💪',
    hashtags: ['#CreatorJourney', '#InstagramGrowth', '#AICreator', '#MotivationReel']
  },
  {
    id: 'reel-3',
    title: '“Top 3 AI Tools jo creators use kar rahe hain” (Value Reel)',
    hook: 'Top 3 AI tools jo har creator ko use karni chahiye👇',
    script: '🎥 Text + voice\n“Top 3 AI tools jo har creator ko use karni chahiye👇\n1️⃣ Content likhne ke liye\n2️⃣ Images & reels ke liye\n3️⃣ Automation ke liye\n\nSave kar lo, warna bhool jaoge 😅”',
    caption: 'Smart creators hard nahi, smart work karte hain 🤖\nSave 🔖 this reel',
    hashtags: ['#AITools', '#ContentCreator', '#SmartWork', '#AIReels', '#TechHindi']
  },
  {
    id: 'reel-4',
    title: '“Log AI se darte kyu hain?” (Psychology Reel)',
    hook: 'Log AI se darte isliye nahi kyunki AI khatarnak hai…',
    script: '🎥 Close face, serious tone\n“Log AI se darte isliye nahi\nkyunki AI khatarnak hai…\nBalki isliye\nkyunki AI unse tez seekh raha hai 😶”\n\n(Beat drop)',
    caption: 'AI tumhari job nahi lega\nTumhari ignorance legi ❌',
    hashtags: ['#Mindset', '#AIFuture', '#SuccessThinking', '#GrowthMindset']
  },
  {
    id: 'reel-5',
    title: '“Follow kyun kare mujhe?” (Branding Reel)',
    hook: 'Agar tum chahte ho AI se earn karna...',
    script: '🎥 Confident tone\n“Agar tum chahte ho\nAI se earn karna\nInstagram grow karna\nAur future ready banna\nTo ye page tumhare liye hai 🔥\nFollow kar lo — free knowledge milegi 💯”',
    caption: 'Main yahan hype nahi\nReal value deta hoon ✔️\nFollow & grow 🚀',
    hashtags: ['#FollowForValue', '#AIHindi', '#DigitalGrowth', '#ReelsIndia']
  }
];

// --- Components ---

const TabButton = ({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
      active 
        ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
    )}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'video' | 'image' | 'scripts' | 'live'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Sat Sri Akal! Main Punjab Area Expert Agent haan. Mainu Punjab de shehran, pindan, rasteyan te local jankari baare pucho, ya fir AI content creation vich madad lao. Ki haal hai tuhada?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  
  // New States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [videoRefImage, setVideoRefImage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const userMessage: Message = { role: 'user', text: input, image: selectedImage || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages.concat(userMessage).map(m => ({
          role: m.role,
          parts: [
            ...(m.image ? [{ inlineData: { data: m.image.split(',')[1], mimeType: 'image/jpeg' } }] : []),
            { text: m.text }
          ]
        })),
        config: {
          systemInstruction: "You are a 'Punjab Area Expert Agent'. Your job is to help people with information about Punjab's cities, villages, directions, and local information. You speak in Hindi, Punjabi, and Hinglish. You are respectful and helpful. When asked about locations, provide Google Maps links if possible. You also help creators with AI content strategies, especially for Reels. If an image is provided, analyze it thoroughly and provide insights relevant to Punjab or content creation. Use Google Search to provide the most accurate and up-to-date information.",
          tools: [{ googleSearch: {} }]
        }
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title
      })).filter((s: any) => s.uri) || [];

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || 'Maaf karna, main samajh nahi paya.',
        isGrounding: sources.length > 0,
        sources: sources
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Error: Connection fail ho gayi hai. Please dobara try karo.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'chat' | 'video' = 'chat') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'video') {
          setVideoRefImage(reader.result as string);
        } else {
          setSelectedImage(reader.result as string);
          setActiveTab('chat');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async () => {
    if (!selectedImage || !editPrompt.trim()) return;
    setIsEditingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: selectedImage.split(',')[1], mimeType: 'image/jpeg' } },
            { text: editPrompt }
          ]
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setSelectedImage(`data:image/png;base64,${part.inlineData.data}`);
          setEditPrompt('');
          break;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditingImage(false);
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive) {
      stopLiveSession();
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
            };
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
              const pcmData = new Int16Array(audioData);
              const floatData = new Float32Array(pcmData.length);
              for (let i = 0; i < pcmData.length; i++) {
                floatData[i] = pcmData[i] / 0x7FFF;
              }
              const buffer = audioContextRef.current!.createBuffer(1, floatData.length, 16000);
              buffer.getChannelData(0).set(floatData);
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current!.destination);
              source.start();
            }
            
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setLiveTranscription(prev => prev + ' ' + message.serverContent?.modelTurn?.parts?.[0]?.text);
            }
          },
          onclose: () => stopLiveSession(),
          onerror: (e) => console.error(e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } } },
          systemInstruction: "You are a helpful Punjab Expert. Speak naturally and warmly.",
        },
      });
      liveSessionRef.current = session;
    } catch (error) {
      console.error(error);
    }
  };

  const stopLiveSession = () => {
    setIsLiveActive(false);
    liveSessionRef.current?.close();
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    setLiveTranscription('');
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() && !videoRefImage) return;
    if (!hasApiKey) {
      handleOpenKeySelector();
      return;
    }

    setIsGeneratingVideo(true);
    setVideoStatus('Video generate ho rahi hai... Is vich kuch minute lagg sakde ne.');
    setGeneratedVideoUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const videoConfig: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: videoPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '9:16'
        }
      };

      if (videoRefImage) {
        videoConfig.image = {
          imageBytes: videoRefImage.split(',')[1],
          mimeType: 'image/jpeg'
        };
      }

      let operation = await ai.models.generateVideos(videoConfig);

      while (!operation.done) {
        setVideoStatus('Processing... Please wait.');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
        });
        const blob = await response.blob();
        setGeneratedVideoUrl(URL.createObjectURL(blob));
        setVideoStatus('Video ready hai! 🔥');
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setVideoStatus('API Key error. Please select key again.');
      } else {
        setVideoStatus('Video generation fail ho gayi. Please try again.');
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Punjab AI Creator Hub</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Expert Agent & Creator Tools</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-2">
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageSquare} label="Expert Chat" />
            <TabButton active={activeTab === 'live'} onClick={() => startLiveSession()} icon={isLiveActive ? MicOff : Mic} label={isLiveActive ? "Stop Live" : "Live Voice"} />
            <TabButton active={activeTab === 'video'} onClick={() => setActiveTab('video')} icon={Video} label="Video Gen" />
            <TabButton active={activeTab === 'image'} onClick={() => setActiveTab('image')} icon={ImageIcon} label="Analyze" />
            <TabButton active={activeTab === 'scripts'} onClick={() => setActiveTab('scripts')} icon={FileText} label="Scripts" />
          </nav>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-lg border border-zinc-800 rounded-full p-1.5 flex gap-1 shadow-2xl">
        <button onClick={() => setActiveTab('chat')} className={cn("p-3 rounded-full transition-colors", activeTab === 'chat' ? "bg-orange-600 text-white" : "text-zinc-400")}><MessageSquare size={20} /></button>
        <button onClick={() => startLiveSession()} className={cn("p-3 rounded-full transition-colors", isLiveActive ? "bg-red-600 text-white" : "text-zinc-400")}><Mic size={20} /></button>
        <button onClick={() => setActiveTab('video')} className={cn("p-3 rounded-full transition-colors", activeTab === 'video' ? "bg-orange-600 text-white" : "text-zinc-400")}><Video size={20} /></button>
        <button onClick={() => setActiveTab('image')} className={cn("p-3 rounded-full transition-colors", activeTab === 'image' ? "bg-orange-600 text-white" : "text-zinc-400")}><ImageIcon size={20} /></button>
        <button onClick={() => setActiveTab('scripts')} className={cn("p-3 rounded-full transition-colors", activeTab === 'scripts' ? "bg-orange-600 text-white" : "text-zinc-400")}><FileText size={20} /></button>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-32 md:pb-8">
        <AnimatePresence mode="wait">
          {/* Live Mode Overlay */}
          {isLiveActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-zinc-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-12">
                <div className="w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="text-white" size={48} />
                </div>
                <div className="absolute inset-0 w-32 h-32 border-4 border-orange-600 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 w-32 h-32 border-4 border-orange-600 rounded-full animate-ping opacity-10 delay-300" />
              </div>
              
              <h2 className="text-3xl font-bold mb-4">Live with Punjab Expert</h2>
              <p className="text-zinc-400 max-w-md mx-auto mb-8">Bolna shuru karo, main sun raha haan... (Start speaking, I am listening...)</p>
              
              <div className="w-full max-w-2xl bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 min-h-[100px] flex items-center justify-center">
                <p className="text-lg text-zinc-300 italic">
                  {liveTranscription || "Waiting for audio..."}
                </p>
              </div>
              
              <button 
                onClick={stopLiveSession}
                className="mt-12 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                <MicOff size={20} /> Stop Conversation
              </button>
            </motion.div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col h-[calc(100vh-12rem)]"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm",
                      msg.role === 'user' 
                        ? "bg-orange-600 text-white rounded-tr-none" 
                        : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                    )}>
                      {msg.image && (
                        <img src={msg.image} alt="Uploaded" className="w-full h-auto rounded-lg mb-3 border border-white/10" />
                      )}
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                      {msg.isGrounding && msg.sources && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                            <Search size={10} /> Sources
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, idx) => (
                              <a 
                                key={idx} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                              >
                                {source.title} <ExternalLink size={8} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm animate-pulse">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Punjab Expert soch raha hai...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="mt-6 relative">
                {selectedImage && (
                  <div className="absolute bottom-full mb-4 left-0 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-2 shadow-2xl min-w-[300px]">
                    <div className="flex items-center gap-3">
                      <img src={selectedImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Selected Image</p>
                        <button type="button" onClick={() => setSelectedImage(null)} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"><Trash2 size={10} /> Remove</button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="AI Edit: 'Add retro filter'..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-3 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600/50"
                      />
                      <button 
                        type="button"
                        onClick={handleEditImage}
                        disabled={isEditingImage || !editPrompt.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 hover:text-orange-500 disabled:opacity-50"
                      >
                        {isEditingImage ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      </button>
                    </div>
                  </div>
                )}
                <div className="relative group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Punjab baare pucho ya AI script likhvao..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-14 pr-16 focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all"
                  />
                  <label className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-500 hover:text-orange-500 transition-colors">
                    <Upload size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/20"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Video Gen Tab */}
          {activeTab === 'video' && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Video className="text-orange-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">AI Video Generator (Veo)</h2>
                <p className="text-zinc-400 max-w-md mx-auto">Apni script likho te AI naal viral reel generate karo. 1080p Portrait mode vich.</p>
                
                {!hasApiKey && (
                  <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-4 flex items-start gap-3 text-left max-w-lg mx-auto">
                    <AlertCircle className="text-orange-600 shrink-0" size={20} />
                    <div className="space-y-2">
                      <p className="text-sm text-orange-200 font-medium">API Key Required</p>
                      <p className="text-xs text-orange-200/70">Video generation de layi tuhade kol paid Google Cloud project di API key honi chahidi hai.</p>
                      <button 
                        onClick={handleOpenKeySelector}
                        className="flex items-center gap-2 bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors"
                      >
                        <Key size={14} />
                        Select API Key
                      </button>
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-[10px] text-orange-400 hover:underline">Billing Documentation</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Reference Image (Optional)</label>
                    <label className="block aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl hover:border-orange-600/50 transition-all cursor-pointer group relative overflow-hidden">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'video')} />
                      {videoRefImage ? (
                        <div className="relative w-full h-full">
                          <img src={videoRefImage} alt="Ref" className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.preventDefault(); setVideoRefImage(null); }}
                            className="absolute top-2 right-2 bg-black/50 p-2 rounded-full hover:bg-black/80 transition-colors"
                          >
                            <Trash2 size={16} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                          <ImageIcon className="text-zinc-600 group-hover:text-orange-500 transition-colors" size={24} />
                          <p className="text-[10px] font-medium text-zinc-500">Animate this image</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Video Prompt</label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Describe your video (e.g., A cinematic shot of a modern creator in a studio with neon lights...)"
                      className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-orange-600/50 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={isGeneratingVideo || !videoPrompt.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                  >
                    {isGeneratingVideo ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    {isGeneratingVideo ? 'Generating...' : 'Generate Reel'}
                  </button>
                  {videoStatus && (
                    <p className="text-sm text-zinc-500 text-center italic">{videoStatus}</p>
                  )}
                </div>

                <div className="aspect-[9/16] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative group">
                  {generatedVideoUrl ? (
                    <video 
                      src={generatedVideoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 text-zinc-600">
                      <div className="w-12 h-12 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
                        <Play size={24} />
                      </div>
                      <p className="text-sm">Video preview ethe show hovega</p>
                    </div>
                  )}
                  {isGeneratingVideo && (
                    <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="relative">
                        <Loader2 className="animate-spin text-orange-600" size={48} />
                        <div className="absolute inset-0 animate-ping bg-orange-600/20 rounded-full" />
                      </div>
                      <p className="text-lg font-bold">Crafting your Reel...</p>
                      <p className="text-sm text-zinc-400">Veo AI is working its magic. This usually takes 1-2 minutes.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Image Analysis Tab */}
          {activeTab === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="text-orange-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Image Analyzer</h2>
                <p className="text-zinc-400">Upload any photo to get insights, captions, or local Punjab context.</p>
              </div>

              <label className="block aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-3xl hover:border-orange-600/50 transition-all cursor-pointer group relative overflow-hidden">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">Click to upload or drag & drop</p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
                  <h3 className="font-bold text-orange-500">Local Context</h3>
                  <p className="text-xs text-zinc-400">Identify Punjab landmarks, culture, and traditional items.</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2">
                  <h3 className="font-bold text-orange-500">Creator Insights</h3>
                  <p className="text-xs text-zinc-400">Get viral caption ideas and hashtag suggestions for your photos.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Scripts Tab */}
          {activeTab === 'scripts' && (
            <motion.div
              key="scripts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Viral Reel Scripts</h2>
                  <p className="text-zinc-400">Ready-to-use scripts for your next AI content.</p>
                </div>
                <button 
                  onClick={() => {
                    setActiveTab('chat');
                    setInput('Mera naya reel script likho AI de baare vich...');
                  }}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-sm font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Custom Script
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {REEL_SCRIPTS.map((reel) => (
                  <div key={reel.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-orange-600/30 transition-all group">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-orange-500 transition-colors">{reel.title}</h3>
                      <button 
                        onClick={() => {
                          setVideoPrompt(reel.script);
                          setActiveTab('video');
                        }}
                        className="text-orange-600 hover:text-orange-500 p-2"
                        title="Use in Video Gen"
                      >
                        <Video size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">The Hook</p>
                        <p className="text-sm italic text-zinc-300">"{reel.hook}"</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Script Preview</p>
                        <p className="text-xs text-zinc-400 line-clamp-3 whitespace-pre-line">{reel.script}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                      {reel.hashtags.map(tag => (
                        <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-orange-600" size={20} />
              <span className="font-bold">Punjab AI Creator Hub</span>
            </div>
            <p className="text-sm text-zinc-500">Empowering Punjab's digital creators with cutting-edge AI tools and local expertise.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest">Quick Links</h4>
            <ul className="text-sm text-zinc-400 space-y-2">
              <li><button onClick={() => setActiveTab('chat')} className="hover:text-orange-500">Expert Chat</button></li>
              <li><button onClick={() => setActiveTab('video')} className="hover:text-orange-500">Video Generation</button></li>
              <li><button onClick={() => setActiveTab('scripts')} className="hover:text-orange-500">Reel Scripts</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest">Support</h4>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MapPin size={16} className="text-orange-600" />
              <span>Amritsar, Punjab, India</span>
            </div>
            <p className="text-xs text-zinc-600">Built with ❤️ for the Punjab Creator Community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
