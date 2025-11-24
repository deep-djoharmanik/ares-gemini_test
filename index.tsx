import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import {
  Image as ImageIcon,
  Wand2,
  ScanEye,
  MessageSquare,
  Images,
  Send,
  Upload,
  Download,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Copy,
  Plus,
  Lock,
  Unlock,
  StopCircle,
  Maximize2,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Key,
  LogOut,
  Eye,
  EyeOff,
  Scissors,
  MonitorPlay,
  Zap,
  Clock,
  AlertTriangle,
  Menu,
  Move,
  Layers
} from 'lucide-react';

// --- Types & Interfaces ---

interface GalleryItem {
  id: string;
  type: 'generated' | 'edited';
  src: string;
  prompt: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

// Aggressive Image Compression (384px) to solve Quota Exceeded
const compressImage = async (file: File, maxWidth = 384, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const fileToGenerativePart = async (file: File, isImageForGeneration = false) => {
  if (isImageForGeneration && file.type.startsWith('image/')) {
    const base64String = await compressImage(file, 384, 0.6);
    return {
      inlineData: {
        data: base64String,
        mimeType: 'image/jpeg',
      },
    };
  } else {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

const dataURLtoFile = (dataurl: string, filename: string) => {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error("Error converting data URL to file", e);
    return null;
  }
};

const shareImage = async (dataUrl: string, title: string, text: string) => {
  const file = dataURLtoFile(dataUrl, 'image.png');
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: title,
        text: text,
        files: [file],
      });
    } catch (err) {
      console.error("Share failed", err);
    }
  } else {
    alert("Sharing is not supported on this device or browser.");
  }
};

// --- API Management ---

const getAI = (apiKey: string) => {
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

const permissiveSafetySettings = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

// --- UI Components ---

const Button = ({ children, onClick, disabled, variant = 'primary', className = '', icon: Icon, size='md' }: any) => {
  const baseStyle = "flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/20 border border-indigo-500/50",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20",
    outline: "border border-slate-700 hover:border-slate-600 text-slate-300 bg-transparent"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

const IconButton = ({ onClick, icon: Icon, title, className = '', variant = 'default' }: any) => {
  const variants = {
    default: "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700",
    danger: "bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white border border-red-500/30",
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400",
    active: "bg-indigo-600 text-white border border-indigo-400 shadow-lg shadow-indigo-500/20"
  };
  
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all active:scale-95 ${variants[variant as keyof typeof variants]} ${className}`}
    >
      <Icon size={18} />
    </button>
  );
};

// --- Updated Components (Zoom, Modal, Input) ---

const PanZoomImage = ({ src, alt, className = '' }: { src: string, alt?: string, className?: string }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const zoomOut = () => {
      setScale(s => {
          const n = Math.max(1, s - 0.5);
          if (n === 1) setPosition({x:0, y:0});
          return n;
      });
  };
  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  return (
    <div 
        className={`relative overflow-hidden w-full h-full flex items-center justify-center bg-[#050505] ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <img 
        src={src} 
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain transition-transform duration-150 ease-out select-none"
        style={{ 
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      />
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 bg-black/80 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl z-10">
         <button onClick={zoomOut} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors" title="Zoom Out"><ZoomOut size={16}/></button>
         <span className="text-xs text-slate-400 font-mono py-2 w-12 text-center border-l border-r border-white/10 flex items-center justify-center">{Math.round(scale * 100)}%</span>
         <button onClick={zoomIn} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors" title="Zoom In"><ZoomIn size={16}/></button>
         {scale > 1 && (
             <button onClick={reset} className="p-2 hover:bg-white/10 rounded-full text-indigo-400" title="Reset"><RotateCcw size={16}/></button>
         )}
      </div>
    </div>
  );
};

const Lightbox = ({ src, prompt, onClose, onShare, onDelete, onUsePrompt, showDelete = false }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onUsePrompt) {
        onUsePrompt();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div className="relative w-full h-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
         
         {/* Top Controls */}
         <div className="absolute top-0 right-0 left-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto px-4">
                 <h3 className="text-white font-bold drop-shadow-md flex items-center gap-2"><Maximize2 size={16} className="text-indigo-500"/> Full Preview</h3>
            </div>
            <div className="pointer-events-auto">
                <IconButton onClick={onClose} icon={X} title="Close" variant="danger" className="rounded-full" />
            </div>
         </div>

         {/* Image Area */}
         <div className="flex-1 overflow-hidden relative">
            <PanZoomImage src={src} />
         </div>

         {/* Bottom Controls */}
         <div className="bg-black/90 border-t border-white/10 p-6 flex flex-col md:flex-row justify-between items-center gap-4 z-20 relative">
            <div className="flex-1 w-full md:max-w-3xl">
              <p className="text-slate-300 text-xs line-clamp-2 font-medium mb-2 font-mono bg-slate-900/50 p-2 rounded border border-white/5">{prompt}</p>
              {onUsePrompt && (
                  <button onClick={handleCopy} className="text-indigo-400 text-[10px] hover:text-indigo-300 flex items-center gap-1 transition-colors uppercase tracking-wider font-bold">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy Prompt"}
                  </button>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
               {showDelete && onDelete && (
                 <IconButton onClick={onDelete} icon={Trash2} variant="danger" title="Delete" />
               )}
               <IconButton onClick={() => onShare && onShare()} icon={Share2} title="Share" />
               <a href={src} download={`gemini-gen-${Date.now()}.png`} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30 text-sm">
                  <Download size={18} /> Download
               </a>
            </div>
         </div>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (key: string) => void }) => {
  const [key, setKey] = useState('AIzaSyAyM-xlV6kj7P0C2D2liNX3XhuaCw0BX_4');
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl animate-fade-in">
         <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 rotate-3 border border-white/20">
                <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight text-center">Ares Suite</h1>
            <p className="text-slate-400 mt-2 text-sm text-center">Next-Gen AI Creative Studio</p>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">API Key</label>
                <div className="relative group">
                   <div className="relative flex items-center bg-black/50 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                       <div className="pl-4 text-slate-500"><Key size={18} /></div>
                       <input 
                          type={showKey ? "text" : "password"} 
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                          placeholder="Paste Google AI Key here..."
                          className="w-full bg-transparent border-none px-4 py-4 text-slate-200 focus:ring-0 outline-none font-mono text-sm"
                          autoFocus
                       />
                       <button onClick={() => setShowKey(!showKey)} className="pr-4 text-slate-500 hover:text-slate-300">
                          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                   </div>
                </div>
            </div>
            <button 
                onClick={() => onLogin(key)}
                disabled={!key.trim() || key.length < 10}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.99]"
            >
                Enter Studio
            </button>
         </div>
      </div>
    </div>
  );
};

const ApiKeyModal = ({ isOpen, onSave, onClose, initialKey }: { isOpen: boolean, onSave: (key: string) => void, onClose?: () => void, initialKey: string }) => {
  const [key, setKey] = useState(initialKey);
  const [showKey, setShowKey] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
       <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative bg-slate-900/90">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Settings size={18} /> API Configuration</h3>
          <div className="space-y-4">
             <div className="relative">
                <input 
                   type={showKey ? "text" : "password"} 
                   value={key}
                   onChange={(e) => setKey(e.target.value)}
                   className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-200 outline-none font-mono text-sm focus:border-indigo-500 transition-colors"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                   {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
             </div>
             <div className="flex gap-2 pt-2">
                {onClose && <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>}
                <Button onClick={() => onSave(key)} disabled={!key.trim() || key.length < 10} className="flex-1">Update Key</Button>
             </div>
          </div>
       </div>
    </div>
  );
};

const PromptArea = ({ value, onChange, placeholder, className, label, onEnhance }: any) => {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-between items-center">
        {label && <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
        {onEnhance && (
            <button onClick={onEnhance} className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-md border border-indigo-500/20 transition-all">
                <Wand2 size={12} /> Enhance
            </button>
        )}
      </div>
      <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${className} scrollbar-hide resize-none transition-all placeholder:text-slate-600`}
      />
    </div>
  );
};

const LoadingOverlay = ({ message, onStop }: { message: string, onStop?: () => void }) => (
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
      <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
    </div>
    <p className="text-white font-medium animate-pulse mb-6 text-center px-4 tracking-wide">{message}</p>
    {onStop && (
      <button onClick={onStop} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors text-xs uppercase font-bold tracking-wider">
        <StopCircle size={14} /> Cancel
      </button>
    )}
  </div>
);

// --- Tab Views (Split Screen 50/50 Implementation) ---

const GenerateView = ({ onAddToGallery, externalPrompt, onPromptUsed, apiKey }: { 
    onAddToGallery: (item: GalleryItem) => void, 
    externalPrompt?: string,
    onPromptUsed?: () => void,
    apiKey: string
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showZoom, setShowZoom] = useState(false);
  const [cooldown, setCooldown] = useState(0); 
  
  const [styleExpanded, setStyleExpanded] = useState(true);
  const [artStyle, setArtStyle] = useState('None');
  const [lighting, setLighting] = useState('Auto');
  const [camera, setCamera] = useState('Auto');
  const [viewMode, setViewMode] = useState<'fit' | 'original'>('fit');
  const [modelType, setModelType] = useState<'flash' | 'imagen'>('flash');

  const abortControllerRef = useRef<AbortController | null>(null);
  const [refImages, setRefImages] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [lockFace, setLockFace] = useState(false);

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (externalPrompt) {
        setPrompt(externalPrompt);
        if(onPromptUsed) onPromptUsed();
    }
  }, [externalPrompt, onPromptUsed]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      const remainingSlots = 4 - refImages.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);
      if (filesToAdd.length > 0) {
        const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
        setRefImages(prev => [...prev, ...filesToAdd]);
        setRefPreviews(prev => [...prev, ...newPreviews]);
        setLockFace(false);
      }
    }
  };

  const removeRefImage = (index: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
    setRefPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleEnhancePrompt = async () => {
      if (!prompt.trim()) return;
      setLoading(true);
      try {
        const ai = getAI(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a prompt engineer. Rewrite the following prompt to be detailed, artistic, and descriptive, but keep it safe (PG-13). Output ONLY the prompt text. Input: "${prompt}"`
        });
        if (response.text) setPrompt(response.text.trim());
      } catch (e) {
        console.error("Enhance failed", e);
        setErrorMsg("Failed to enhance prompt.");
      } finally {
        setLoading(false);
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || cooldown > 0) return;
    setLoading(true);
    setGeneratedImage(null);
    setErrorMsg(null);
    abortControllerRef.current = new AbortController();

    try {
      const ai = getAI(apiKey);
      let constructedPrompt = prompt;
      if (artStyle !== 'None') constructedPrompt += `, ${artStyle} art style`;
      if (lighting !== 'Auto') constructedPrompt += `, ${lighting} lighting`;
      if (camera !== 'Auto') constructedPrompt += `, ${camera} view`;

      let imageUrl = null;

      if (modelType === 'flash') {
          // --- GEMINI 2.5 FLASH IMAGE STRATEGY ---
          const parts: any[] = [];
          for (const file of refImages) {
            try {
                const imagePart = await fileToGenerativePart(file, true);
                parts.push(imagePart);
            } catch (err) { console.warn("Skipping bad ref image"); }
          }

          if (refImages.length > 0) {
            if (lockFace) constructedPrompt = "Strictly maintain facial structure. " + constructedPrompt;
            else constructedPrompt = "Use reference as style guide. " + constructedPrompt;
          }
          parts.push({ text: constructedPrompt });
          
          const config: any = {
              imageConfig: {
                numberOfImages: 1,
                ...(aspectRatio !== '1:1' ? { aspectRatio: aspectRatio } : {})
              },
              safetySettings: permissiveSafetySettings
          };

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: config
          });

          if (!loading && !abortControllerRef.current) return;

          const candidate = response.candidates?.[0];
          if (!candidate) throw new Error("No response from AI.");
          
          if (candidate.finishReason === 'SAFETY') throw new Error(`Safety Blocked. Try a different prompt.`);

          let rejectionText = "";
          for (const part of candidate?.content?.parts || []) {
            if (part.inlineData) {
              const mime = part.inlineData.mimeType || 'image/jpeg';
              imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            } else if (part.text) rejectionText += part.text;
          }
          if (!imageUrl && rejectionText) throw new Error(`Model Refused: "${rejectionText}"`);
      } else {
          // --- IMAGEN 3 STRATEGY ---
          const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: constructedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            }
          });
          if (response.generatedImages?.[0]?.image?.imageBytes) {
             imageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
          } else {
             throw new Error("Imagen returned no images.");
          }
      }

      if (!imageUrl) throw new Error("Generation failed. Try switching models.");

      setGeneratedImage(imageUrl);
      onAddToGallery({
        id: generateId(),
        type: 'generated',
        src: imageUrl,
        prompt: constructedPrompt,
        timestamp: Date.now()
      });

    } catch (error: any) {
      if (loading) {
        let msg = error.message || "Failed.";
        const lowerMsg = msg.toLowerCase();
        
        // Handle specific API errors
        if (lowerMsg.includes('429') || lowerMsg.includes('quota')) {
            msg = "⚠️ Quota Exceeded. Cooling down 60s.";
            setCooldown(60);
        } else if (lowerMsg.includes('403') || lowerMsg.includes('permission') || lowerMsg.includes('billing')) {
            msg = "🔒 Access Denied: Check Billing or Domain restrictions on your API Key.";
        } else if (lowerMsg.includes('400') || lowerMsg.includes('invalid')) {
            msg = "❌ Bad Request: Model may not be supported in your region or project.";
        }
        
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      {showZoom && generatedImage && (
         <Lightbox 
            src={generatedImage} 
            prompt={prompt} 
            onClose={() => setShowZoom(false)}
            onShare={() => generatedImage && shareImage(generatedImage, 'Generated Image', prompt)}
            onUsePrompt={() => navigator.clipboard.writeText(prompt)}
         />
      )}

      {/* 50/50 Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
        
        {/* Left Panel: Controls */}
        <div className="glass-panel rounded-2xl flex flex-col overflow-hidden h-full shadow-2xl">
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm tracking-wide">
                    <Wand2 size={16} className="text-indigo-400" /> GENERATOR
                </h3>
                <div className="relative group">
                    <button className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                         <Layers size={12} /> {modelType === 'flash' ? 'Gemini 2.5 Flash' : 'Imagen 3'}
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                        <button onClick={() => setModelType('flash')} className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-500/20 ${modelType === 'flash' ? 'text-indigo-400' : 'text-slate-400'}`}>Gemini 2.5 Flash (Default)</button>
                        <button onClick={() => setModelType('imagen')} className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-500/20 ${modelType === 'imagen' ? 'text-indigo-400' : 'text-slate-400'}`}>Imagen 3 (Alternative)</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6 scrollbar-hide">
                {/* Reference Images - Only for Flash */}
                {modelType === 'flash' && (
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference (Auto-Compress)</label>
                        <span className="text-[10px] text-slate-500 font-mono">{refImages.length}/4</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {refPreviews.map((src, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-slate-800">
                            <img src={src} className="w-full h-full object-cover" />
                            <button onClick={() => removeRefImage(idx)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"><X size={16} /></button>
                        </div>
                        ))}
                        {refImages.length < 4 && (
                        <label className="aspect-square rounded-lg border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-indigo-400">
                            <Plus size={18} />
                            <input type="file" accept="image/*" multiple onChange={handleRefUpload} className="hidden" />
                        </label>
                        )}
                    </div>
                    {refImages.length > 0 && (
                        <button onClick={() => setLockFace(!lockFace)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${lockFace ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800/50 text-slate-400 border-white/5'}`}>
                        {lockFace ? <Lock size={12} /> : <Unlock size={12} />} {lockFace ? 'Mode: Face Lock (Experimental)' : 'Mode: Style Reference'}
                        </button>
                    )}
                </div>
                )}

                {/* Prompt */}
                <div className="flex-1 min-h-[140px]">
                    <PromptArea
                        label="Prompt"
                        value={prompt}
                        onChange={(e: any) => setPrompt(e.target.value)}
                        onEnhance={handleEnhancePrompt}
                        placeholder="Describe your imagination..."
                        className="w-full h-full bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm leading-relaxed"
                    />
                </div>

                {/* Settings Accordion */}
                <div className="border border-white/5 rounded-xl bg-black/20 overflow-hidden">
                    <button onClick={() => setStyleExpanded(!styleExpanded)} className="w-full flex justify-between items-center p-3 text-xs font-bold text-slate-400 uppercase hover:bg-white/5 transition-colors">
                        <span>Config & Style</span>
                        {styleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {styleExpanded && (
                        <div className="p-3 pt-0 grid grid-cols-2 gap-4 mt-2">
                             <div className="col-span-2">
                                <label className="text-[10px] text-slate-500 mb-2 block uppercase tracking-wider">Aspect Ratio</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {['1:1', '16:9', '9:16', '3:4', '4:3'].map((ratio) => (
                                        <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-2 rounded-md text-[10px] font-medium border transition-all ${aspectRatio === ratio ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/50' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-700'}`}>
                                        {ratio}
                                        </button>
                                    ))}
                                </div>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Art Style</label>
                                <div className="relative">
                                    <select value={artStyle} onChange={e => setArtStyle(e.target.value)} className="w-full bg-black/40 text-xs text-slate-300 rounded-lg p-2.5 border border-white/10 outline-none focus:border-indigo-500 appearance-none">
                                        <option>None</option><option>Photorealistic</option><option>Anime</option><option>Cyberpunk</option><option>Oil Painting</option><option>3D Render</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-3 text-slate-500 pointer-events-none"/>
                                </div>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider">Lighting</label>
                                <div className="relative">
                                    <select value={lighting} onChange={e => setLighting(e.target.value)} className="w-full bg-black/40 text-xs text-slate-300 rounded-lg p-2.5 border border-white/10 outline-none focus:border-indigo-500 appearance-none">
                                        <option>Auto</option><option>Cinematic</option><option>Natural</option><option>Neon</option><option>Studio</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-3 text-slate-500 pointer-events-none"/>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-slate-900/50">
                {cooldown > 0 ? (
                    <Button disabled variant="secondary" className="w-full py-3.5 opacity-75">
                        <Clock className="animate-spin" size={16} /> Cooling down ({cooldown}s)
                    </Button>
                ) : (
                    <Button onClick={handleGenerate} disabled={loading || !prompt} variant="primary" className="w-full py-3.5 text-base shadow-indigo-500/20" icon={Wand2}>
                        {loading ? 'Generating...' : 'Generate Image'}
                    </Button>
                )}
            </div>
        </div>

        {/* Right Panel: Result Preview */}
        <div className="glass-panel rounded-2xl relative overflow-hidden flex flex-col group h-full shadow-2xl bg-[#080808]">
          {loading && <LoadingOverlay message={modelType === 'imagen' ? 'Imagen 3 Dreaming...' : 'Gemini Weaving...'} onStop={handleStop} />}
          
          {/* Result Header Toolbar */}
           <div className="absolute top-4 right-4 left-4 z-20 flex justify-between items-start pointer-events-none">
              <div className="pointer-events-auto">
                  {generatedImage && (
                    <div className="flex bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-1">
                        <button onClick={() => setViewMode('fit')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'fit' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Fit</button>
                        <button onClick={() => setViewMode('original')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>100%</button>
                    </div>
                  )}
              </div>
              <div className="flex gap-2 pointer-events-auto">
                {generatedImage && (
                   <>
                    <IconButton onClick={() => generatedImage && shareImage(generatedImage, 'Generated', prompt)} icon={Share2} className="bg-black/50 backdrop-blur" />
                    <a href={generatedImage} download={`gemini-gen-${Date.now()}.png`} className="p-2 rounded-lg bg-black/50 backdrop-blur hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-white/10"><Download size={18} /></a>
                   </>
                )}
                <IconButton onClick={() => {setGeneratedImage(null); setErrorMsg(null);}} icon={X} variant="danger" className="backdrop-blur" />
              </div>
           </div>

          {errorMsg && !loading && (
             <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                 <div className="glass-panel border border-red-500/30 rounded-xl p-8 max-w-sm text-center flex flex-col items-center shadow-2xl bg-slate-900/90">
                     <AlertTriangle className="text-red-400 w-10 h-10 mb-4" />
                     <h3 className="text-white font-bold mb-2 text-lg">Generation Failed</h3>
                     <p className="text-red-200/70 text-sm mb-6 leading-relaxed">{errorMsg}</p>
                     <Button variant="outline" onClick={() => setErrorMsg(null)} size="sm" className="w-full border-red-500/30 hover:bg-red-500/10 text-red-300">Dismiss</Button>
                     
                     {errorMsg.includes('Access Denied') && (
                         <div className="mt-4 text-[10px] text-slate-500 text-left p-3 bg-black/50 rounded border border-white/5">
                            <strong>Fix it:</strong> Go to Google Cloud Console &gt; APIs &gt; Credentials. Edit your API Key. Under "Application restrictions", add your Netlify URL or set to "None".
                         </div>
                     )}
                 </div>
             </div>
          )}

          <div className={`flex-1 relative w-full h-full flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] ${viewMode === 'original' ? 'overflow-auto' : 'overflow-hidden'}`}>
            {generatedImage ? (
                <div className={`relative ${viewMode === 'original' ? 'p-8 min-w-max min-h-max' : 'w-full h-full p-6 flex items-center justify-center'}`}>
                    <img 
                        src={generatedImage} 
                        className={`
                           ${viewMode === 'fit' ? 'max-w-full max-h-full object-contain' : 'max-w-none cursor-grab active:cursor-grabbing'}
                           rounded-lg shadow-2xl drop-shadow-2xl
                        `}
                        onClick={() => viewMode === 'fit' && setShowZoom(true)}
                        style={viewMode === 'fit' ? {cursor: 'zoom-in'} : {}}
                    />
                </div>
            ) : !errorMsg && (
                <div className="text-center text-slate-600 p-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center mb-4 border border-white/5">
                    <Sparkles className="w-8 h-8 opacity-20 text-indigo-500" />
                </div>
                <p className="text-sm font-medium text-slate-500">Result will appear here</p>
                </div>
            )}
          </div>
              
          {generatedImage && viewMode === 'fit' && (
            <div className="p-3 bg-black/60 backdrop-blur-md text-center border-t border-white/5 shrink-0 z-10 relative">
                   <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Click image for full screen • Switch to 100% to scroll</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MagicEditView = ({ onAddToGallery, apiKey }: { onAddToGallery: (item: GalleryItem) => void, apiKey: string }) => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [viewMode, setViewMode] = useState<'fit' | 'original'>('fit');

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) interval = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResultImage(null);
      setErrorMsg(null);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt.trim() || cooldown > 0) return;
    setLoading(true);
    setResultImage(null);
    setErrorMsg(null);

    try {
      const ai = getAI(apiKey);
      const imagePart = await fileToGenerativePart(image, true);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
        config: { safetySettings: permissiveSafetySettings }
      });
      
      const candidate = response.candidates?.[0];
      if (!candidate) throw new Error("No response.");
      
      if (candidate.finishReason === 'SAFETY') throw new Error("Safety Block blocked the edit.");

      let found = false;
      let rejectionText = "";

      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          onAddToGallery({
            id: generateId(),
            type: 'edited',
            src: imageUrl,
            prompt: prompt,
            timestamp: Date.now()
          });
          found = true;
          break;
        } else if (part.text) rejectionText += part.text;
      }
      
      if (!found) {
          if (rejectionText) throw new Error(`AI Refused Edit: "${rejectionText}"`);
          throw new Error("No image returned. Try a clearer prompt.");
      }

    } catch (error: any) {
       let msg = error.message || "Failed.";
       const lowerMsg = msg.toLowerCase();
       if (lowerMsg.includes('429')) { 
           msg = "⚠️ Quota Exceeded. Cooldown 60s."; 
           setCooldown(60); 
       } else if (lowerMsg.includes('403') || lowerMsg.includes('billing')) {
           msg = "🔒 Access Denied: Check Billing or Domain Restrictions on API Key.";
       }
       setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-fade-in">
      {showZoom && resultImage && (
         <Lightbox 
            src={resultImage} 
            prompt={prompt} 
            onClose={() => setShowZoom(false)}
            onShare={() => resultImage && shareImage(resultImage, 'Magic Edit', prompt)}
            onUsePrompt={() => navigator.clipboard.writeText(prompt)}
         />
      )}

      {/* Control Panel */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 overflow-hidden h-full shadow-2xl">
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto scrollbar-hide">
             <div className="border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-pink-500/50 hover:bg-white/5 transition-all cursor-pointer relative min-h-[200px] bg-black/20 group">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {imagePreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                    <img src={imagePreview} className="max-h-48 rounded-lg object-contain shadow-lg" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                        <p className="text-white text-xs font-bold uppercase tracking-widest">Click to Change</p>
                    </div>
                </div>
                ) : (
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <Upload className="text-slate-400" size={20}/>
                    </div>
                    <span className="text-slate-400 text-sm font-medium">Upload Source Image</span>
                    <span className="text-slate-600 text-xs mt-1">JPG, PNG supported</span>
                </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                 {[
                    { l: "Remove BG", p: "Remove background, white background", i: Scissors },
                    { l: "Upscale", p: "High quality, sharpen details, 4k", i: MonitorPlay },
                    { l: "Cyberpunk", p: "Cyberpunk neon style, futuristic", i: Zap },
                    { l: "Sketch", p: "Pencil sketch on paper", i: Wand2 }
                 ].map((t, idx) => (
                    <button key={idx} onClick={() => setPrompt(t.p)} className="flex items-center gap-2 p-3 bg-slate-800/50 border border-white/5 rounded-xl hover:border-pink-500/50 hover:bg-slate-800 transition-all text-xs text-slate-300 group">
                        <t.i size={14} className="text-pink-500 group-hover:scale-110 transition-transform" /> {t.l}
                    </button>
                 ))}
            </div>

            <PromptArea
                label="Instruction"
                value={prompt}
                onChange={(e: any) => setPrompt(e.target.value)}
                placeholder="What should AI change?"
                className="w-full h-32 bg-black/40 border-white/10 rounded-xl p-4 text-slate-200 focus:ring-1 focus:ring-pink-500 text-sm"
            />
        </div>

        {cooldown > 0 ? (
            <Button disabled variant="secondary" className="w-full py-3.5 opacity-75">
                <Clock className="animate-spin" size={16} /> Cooling Down ({cooldown}s)
            </Button>
        ) : (
            <Button onClick={handleEdit} disabled={loading || !image || !prompt} className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border-pink-500/50 shadow-pink-900/20" icon={Sparkles}>
                {loading ? 'Processing...' : 'Apply Magic'}
            </Button>
        )}
      </div>

      {/* Result Panel */}
      <div className="glass-panel rounded-2xl flex flex-col relative overflow-hidden h-full shadow-2xl bg-[#080808]">
        {loading && <LoadingOverlay message="Transforming..." />}
        
        {/* Result Toolbar */}
        <div className="absolute top-4 right-4 left-4 z-20 flex justify-between items-start pointer-events-none">
             <div className="pointer-events-auto">
                 {resultImage && (
                   <div className="flex bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-1">
                       <button onClick={() => setViewMode('fit')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'fit' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Fit</button>
                       <button onClick={() => setViewMode('original')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>100%</button>
                   </div>
                 )}
             </div>
             {errorMsg && !loading && (
                 <div className="pointer-events-auto bg-red-900/80 border border-red-500/30 rounded-lg px-4 py-2 text-red-200 text-xs">
                    {errorMsg} <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold">X</button>
                 </div>
             )}
        </div>

        <div className={`flex-1 relative w-full h-full flex items-center justify-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] ${viewMode === 'original' ? 'overflow-auto' : 'overflow-hidden'}`}>
            {resultImage ? (
                <div className={`relative ${viewMode === 'original' ? 'p-8 min-w-max min-h-max' : 'w-full h-full p-6 flex items-center justify-center'}`}>
                    <img 
                        src={resultImage} 
                        className={`
                           ${viewMode === 'fit' ? 'max-w-full max-h-full object-contain' : 'max-w-none cursor-grab'}
                           rounded-lg shadow-2xl drop-shadow-2xl
                        `}
                        onClick={() => viewMode === 'fit' && setShowZoom(true)}
                        style={viewMode === 'fit' ? {cursor: 'zoom-in'} : {}}
                    />
                </div>
            ) : (
            <div className="text-center text-slate-600">
                <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">Magic awaits...</p>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

// ... (AnalyzeView, ChatView, GalleryView remain mostly similar but adjusted for height) ...

const AnalyzeView = ({ onGenerateFromAnalysis, apiKey }: { onGenerateFromAnalysis: (text: string) => void, apiKey: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setFilePreview({ type: f.type.split('/')[0], url: URL.createObjectURL(f) });
      setAnalysis('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const ai = getAI(apiKey);
      const filePart = await fileToGenerativePart(file);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [filePart, { text: prompt || "Analyze detail." }] }
      });
      setAnalysis(response.text || "No analysis.");
    } catch (e) { setAnalysis("Error."); } finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-fade-in">
       <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 h-full shadow-2xl">
            <div className="border border-dashed border-slate-700 rounded-xl p-4 flex-1 flex flex-col items-center justify-center relative bg-black/20 hover:bg-white/5 transition-colors">
              <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {filePreview ? (
                <div className="flex flex-col items-center justify-center w-full h-full">
                  {filePreview.type === 'image' && <img src={filePreview.url} className="max-h-64 rounded shadow-lg" />}
                  {filePreview.type === 'video' && <video src={filePreview.url} controls className="max-h-64 rounded shadow-lg" />}
                  <Button variant="ghost" size="sm" onClick={(e:any) => {e.stopPropagation(); setFile(null); setFilePreview(null);}} className="mt-4 text-red-400 hover:bg-red-500/10">Remove Media</Button>
                </div>
              ) : (
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3 text-emerald-500"><ScanEye /></div>
                    <span className="text-slate-400 text-sm font-medium">Drop Image or Video</span>
                </div>
              )}
            </div>
            <PromptArea value={prompt} onChange={(e: any) => setPrompt(e.target.value)} placeholder="Ask something about this image..." className="w-full h-32 bg-black/40 border-white/10 rounded-xl p-4 text-slate-200 text-sm" />
            <Button onClick={handleAnalyze} disabled={loading || !file} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3.5" icon={ScanEye}>{loading ? 'Analyzing...' : 'Analyze Content'}</Button>
       </div>
       <div className="glass-panel rounded-2xl p-6 overflow-y-auto text-slate-300 whitespace-pre-wrap h-full font-light shadow-2xl leading-relaxed text-sm bg-black/40">
            {analysis ? (
                <div>
                     <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Sparkles size={16} className="text-emerald-500"/> Analysis Result</h3>
                     {analysis}
                     <Button onClick={() => onGenerateFromAnalysis(analysis)} variant="primary" className="mt-6 w-full bg-indigo-600" icon={Wand2}>Use as Prompt Generator</Button>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <ScanEye size={48} className="opacity-20 mb-4" />
                    <p>Analysis results will appear here</p>
                </div>
            )}
       </div>
    </div>
  );
};

const ChatView = ({ apiKey }: { apiKey: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSession = useRef<any>(null);

  useEffect(() => {
    if (apiKey) {
        try { chatSession.current = getAI(apiKey).chats.create({ model: 'gemini-2.5-flash' }); } catch (e) {}
    }
  }, [apiKey]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: ChatMessage = { id: generateId(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(p => [...p, userMsg]); setInput(''); setIsTyping(true);
    try {
      if (!chatSession.current) chatSession.current = getAI(apiKey).chats.create({ model: 'gemini-2.5-flash' });
      const result = await chatSession.current.sendMessageStream({ message: userMsg.text });
      let fullResponse = ''; const botMsgId = generateId();
      setMessages(p => [...p, { id: botMsgId, role: 'model', text: '', timestamp: Date.now() }]);
      for await (const chunk of result) {
        const text = (chunk as GenerateContentResponse).text;
        if (text) { fullResponse += text; setMessages(p => p.map(m => m.id === botMsgId ? { ...m, text: fullResponse } : m)); }
      }
    } catch (error) { setMessages(p => [...p, { id: generateId(), role: 'model', text: "Error connecting to AI.", timestamp: Date.now() }]); } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2"><MessageSquare size={18} className="text-blue-500" /> AI Assistant</h3>
          <button onClick={() => setMessages([])} className="text-xs text-slate-500 hover:text-red-400">Clear Chat</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-black/20">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                <MessageSquare size={48} className="mb-4" />
                <p>Start a conversation...</p>
            </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none'}`}>
               <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && <div className="text-slate-500 text-xs animate-pulse pl-4">Assistant is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 bg-black/50 border border-white/10 rounded-xl px-5 text-slate-200 outline-none h-12 text-sm focus:border-blue-500 transition-colors" />
          <button onClick={handleSend} disabled={!input.trim()} className="h-12 w-12 flex items-center justify-center bg-blue-600 rounded-xl text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"><Send size={20} /></button>
      </div>
    </div>
  );
};

const GalleryView = ({ items, onDelete }: { items: GalleryItem[], onDelete: (id: string) => void }) => {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  return (
    <div className="h-full animate-fade-in flex flex-col">
       {selectedItem && <Lightbox src={selectedItem.src} prompt={selectedItem.prompt} onClose={() => setSelectedItem(null)} onDelete={() => { onDelete(selectedItem.id); setSelectedItem(null); }} showDelete={true} />}
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-y-auto pb-4 pr-2 scrollbar-hide">
            {items.slice().reverse().map((item) => (
              <div key={item.id} className="aspect-square bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500 transition-all group relative" onClick={() => setSelectedItem(item)}>
                <img src={item.src} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-[10px] line-clamp-1">{item.prompt}</p>
                </div>
              </div>
            ))}
       </div>
       {items.length === 0 && (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
               <Images size={64} className="opacity-20 mb-4" />
               <p>Gallery is empty</p>
           </div>
       )}
    </div>
  );
};

// --- Main App with Top Navigation ---

const App = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || 'AIzaSyAyM-xlV6kj7P0C2D2liNX3XhuaCw0BX_4');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const saveApiKey = (key: string) => { localStorage.setItem('user_gemini_api_key', key); setUserApiKey(key); setShowSettingsModal(false); };
  const handleLogout = () => { localStorage.removeItem('user_gemini_api_key'); setUserApiKey(''); };
  const addToGallery = (item: GalleryItem) => { setGalleryItems(prev => [...prev, item]); };
  const removeFromGallery = (id: string) => { setGalleryItems(prev => prev.filter(item => item.id !== id)); };
  const handleGenerateFromAnalysis = (text: string) => { setSharedPrompt(text); setActiveTab('generate'); };

  if (!userApiKey) return <LoginScreen onLogin={saveApiKey} />;

  // Top Nav Tab Component
  const TopTab = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 text-sm font-medium border ${
        activeTab === id 
          ? 'bg-white/10 text-white border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
          : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} className={activeTab === id ? 'text-indigo-400' : ''} />
      <span>{label}</span>
      {activeTab === id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-indigo-500 blur-[2px]"></span>}
    </button>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-slate-200 bg-black selection:bg-indigo-500/30 selection:text-white">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[100px] rounded-full"></div>
      </div>

      <ApiKeyModal isOpen={showSettingsModal} onSave={saveApiKey} initialKey={userApiKey} onClose={() => setShowSettingsModal(false)} />

      {/* TOP NAVIGATION BAR */}
      <header className="h-20 bg-black/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50 shrink-0">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-6 transition-transform border border-white/10">
                    <Sparkles size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight leading-none">ARES</h1>
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase font-mono">Creative Suite</span>
                </div>
            </div>
            
            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-black/40 p-1.5 rounded-full border border-white/5 backdrop-blur-xl">
                <TopTab id="generate" icon={Sparkles} label="Generate" />
                <TopTab id="edit" icon={Wand2} label="Edit" />
                <TopTab id="analyze" icon={ScanEye} label="Analyze" />
                <TopTab id="chat" icon={MessageSquare} label="Chat" />
                <TopTab id="gallery" icon={Images} label="Gallery" />
            </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end mr-2">
                  <span className="text-[10px] text-slate-500 font-mono">GEMINI 2.5 FLASH</span>
                  <span className="text-[10px] text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE</span>
              </div>
              <div className="h-8 w-[1px] bg-white/10 mx-2 hidden lg:block"></div>
              <button onClick={() => setShowSettingsModal(true)} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10" title="Settings">
                  <Settings size={20} />
              </button>
              <button onClick={handleLogout} className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-colors border border-transparent hover:border-red-500/20" title="Logout">
                  <LogOut size={20} />
              </button>
          </div>
      </header>

      {/* Mobile Tabs (Horizontal Scroll) */}
      <div className="md:hidden flex overflow-x-auto p-3 gap-2 bg-black border-b border-white/5 shrink-0 scrollbar-hide z-40">
         <TopTab id="generate" icon={Sparkles} label="Gen" />
         <TopTab id="edit" icon={Wand2} label="Edit" />
         <TopTab id="analyze" icon={ScanEye} label="Scan" />
         <TopTab id="chat" icon={MessageSquare} label="Chat" />
         <TopTab id="gallery" icon={Images} label="Gallery" />
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden p-4 md:p-6 relative z-10">
        <div className="max-w-[1600px] mx-auto h-full">
            {/* Keep components mounted to preserve state */}
            <div className={`h-full ${activeTab === 'generate' ? 'block' : 'hidden'}`}>
                <GenerateView onAddToGallery={addToGallery} externalPrompt={sharedPrompt} onPromptUsed={() => setSharedPrompt('')} apiKey={userApiKey} />
            </div>
            <div className={`h-full ${activeTab === 'edit' ? 'block' : 'hidden'}`}>
                <MagicEditView onAddToGallery={addToGallery} apiKey={userApiKey} />
            </div>
            <div className={`h-full ${activeTab === 'analyze' ? 'block' : 'hidden'}`}>
                <AnalyzeView onGenerateFromAnalysis={handleGenerateFromAnalysis} apiKey={userApiKey} />
            </div>
            <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
                <ChatView apiKey={userApiKey} />
            </div>
            <div className={`h-full ${activeTab === 'gallery' ? 'block' : 'hidden'}`}>
                <GalleryView items={galleryItems} onDelete={removeFromGallery} />
            </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);