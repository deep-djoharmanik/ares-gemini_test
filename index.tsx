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
  Move,
  RotateCcw,
  Check,
  Palette,
  MonitorPlay,
  Type,
  Box,
  ChevronDown,
  ChevronUp,
  Aperture,
  User,
  Sun,
  Camera,
  Scissors,
  Zap,
  Settings,
  Key,
  LogOut,
  Eye,
  EyeOff,
  Github,
  Code2,
  AlertTriangle
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

const fileToGenerativePart = async (file: File) => {
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
    // Fallback or notification
    alert("Sharing is not supported on this device or browser.");
  }
};

// --- API Management ---

// We no longer use a global static instance. We create one on demand with the user's key.
const getAI = (apiKey: string) => {
  if (!apiKey) throw new Error("API Key is missing");
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

const safetySettings = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

// --- UI Components ---

const Button = ({ children, onClick, disabled, variant = 'primary', className = '', icon: Icon, size='md' }: any) => {
  const baseStyle = "flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-500 disabled:opacity-50",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white focus:ring-slate-500",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 disabled:opacity-50",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-300"
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
    default: "bg-slate-800/80 hover:bg-slate-700 text-slate-200",
    danger: "bg-red-500/20 hover:bg-red-500/40 text-red-200",
    primary: "bg-indigo-600/80 hover:bg-indigo-500 text-white"
  };
  
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 ${variants[variant as keyof typeof variants]} ${className}`}
    >
      <Icon size={20} />
    </button>
  );
};

// --- Interactive Components ---

const LoginScreen = ({ onLogin }: { onLogin: (key: string) => void }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full"></div>
         <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full"></div>
         <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-slate-950 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl animate-fade-in">
         <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6 rotate-3 hover:rotate-6 transition-transform duration-500">
                <Sparkles size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-center">Ares Gemini Suite</h1>
            <p className="text-slate-400 mt-3 text-sm text-center leading-relaxed">
                Welcome to the next generation AI creative studio.<br/>
                Please authenticate to continue.
            </p>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Access Key</label>
                <div className="relative group">
                   <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                   <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                       <div className="pl-4 text-slate-500">
                          <Key size={18} />
                       </div>
                       <input 
                          type={showKey ? "text" : "password"} 
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                          placeholder="Paste your Google GenAI Key"
                          className="w-full bg-transparent border-none px-4 py-4 text-slate-200 focus:ring-0 outline-none font-mono text-sm"
                          autoFocus
                       />
                       <button 
                          onClick={() => setShowKey(!showKey)}
                          className="pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                       >
                          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                   </div>
                </div>
            </div>

            <button 
                onClick={() => onLogin(key)}
                disabled={!key.trim() || key.length < 10}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 group"
            >
                <span>Enter Studio</span>
                <ChevronDown className="-rotate-90 transition-transform group-hover:translate-x-1" size={18} />
            </button>
            
            <div className="pt-4 border-t border-slate-800/50">
                <p className="text-[10px] text-center text-slate-600">
                    Your key is stored locally and securely in your browser.<br/>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1 mt-1">
                        Get a key from Google AI Studio <Move size={8} className="-rotate-45"/>
                    </a>
                </p>
            </div>
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
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
       <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Settings size={20} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Settings</h3>
                <p className="text-xs text-slate-400">Update your API Configuration</p>
             </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Google GenAI API Key</label>
                <div className="relative">
                   <input 
                      type={showKey ? "text" : "password"} 
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                   />
                   <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                   >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                   </button>
                </div>
             </div>
             
             <div className="flex gap-2 pt-2">
                {onClose && (
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                )}
                <Button 
                   onClick={() => onSave(key)} 
                   disabled={!key.trim() || key.length < 10} 
                   className="flex-1"
                >
                   Update Key
                </Button>
             </div>
          </div>
       </div>
    </div>
  );
};

const ZoomableImage = ({ src, alt, className = '' }: { src: string, alt?: string, className?: string }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Stop page scroll
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(1, scale + delta), 5);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
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
        ref={containerRef}
        className={`relative overflow-hidden w-full h-full flex items-center justify-center bg-slate-950/50 ${className}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <img 
        src={src} 
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out origin-center select-none"
        style={{ 
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      />
      
      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-200 z-10" onClick={e => e.stopPropagation()}>
         <button onClick={zoomOut} className="p-2 hover:bg-white/10 rounded-full text-white"><ZoomOut size={16}/></button>
         <span className="text-xs text-slate-400 font-mono py-2 w-12 text-center">{Math.round(scale * 100)}%</span>
         <button onClick={zoomIn} className="p-2 hover:bg-white/10 rounded-full text-white"><ZoomIn size={16}/></button>
         {scale > 1 && (
             <button onClick={reset} className="p-2 hover:bg-white/10 rounded-full text-indigo-400"><RotateCcw size={16}/></button>
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
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-0 md:p-4 backdrop-blur-xl animate-fade-in" onClick={onClose}>
      <div className="relative w-full h-full flex flex-col md:max-w-7xl md:h-[90vh] md:bg-slate-900 md:rounded-2xl md:border md:border-slate-800 md:overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
         
         {/* Top Controls */}
         <div className="absolute top-0 right-0 left-0 p-4 z-20 flex justify-between items-start pointer-events-none">
            <div className="pointer-events-auto">
               {/* Optional left header content */}
            </div>
            <div className="pointer-events-auto bg-black/50 backdrop-blur-md rounded-full">
                <IconButton onClick={onClose} icon={X} title="Close" />
            </div>
         </div>

         {/* Image Area - Full Zoom Support */}
         <div className="flex-1 overflow-hidden bg-black/20 relative">
            <ZoomableImage src={src} />
         </div>

         {/* Bottom Controls */}
         <div className="bg-slate-900 border-t border-slate-800 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 z-20 relative">
            <div className="flex-1 w-full">
              <p className="text-slate-200 text-sm line-clamp-2 md:line-clamp-none font-medium mb-1 font-mono">{prompt}</p>
              {onUsePrompt && (
                  <button onClick={handleCopy} className="text-indigo-400 text-xs hover:text-indigo-300 flex items-center gap-1 transition-colors">
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Prompt Copied" : "Use Prompt for Generate"}
                  </button>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
               {showDelete && onDelete && (
                 <IconButton onClick={onDelete} icon={Trash2} variant="danger" title="Delete" />
               )}
               <IconButton onClick={() => onShare && onShare()} icon={Share2} title="Share" />
               <a href={src} download={`gemini-gen-${Date.now()}.png`} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10 text-sm">
                  <Download size={18} /> Download
               </a>
            </div>
         </div>
      </div>
    </div>
  );
};

const PromptArea = ({ value, onChange, placeholder, className, label, showControls = true }: any) => {
  const handleCopy = () => navigator.clipboard.writeText(value);
  const handleClear = () => onChange({ target: { value: '' } });

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>}
      <div className="relative group">
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${className} scrollbar-hide`}
        />
        {showControls && (
            <div className="absolute top-2 right-2 flex gap-1">
            <button 
                onClick={handleCopy} 
                className="p-1.5 bg-slate-800/80 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-md transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100" 
                title="Copy"
            >
                <Copy size={14} />
            </button>
            <button 
                onClick={handleClear} 
                className="p-1.5 bg-slate-800/80 hover:bg-red-500 text-slate-400 hover:text-white rounded-md transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 focus:opacity-100" 
                title="Clear"
            >
                <Trash2 size={14} />
            </button>
            </div>
        )}
      </div>
    </div>
  );
};

const LoadingOverlay = ({ message, onStop }: { message: string, onStop?: () => void }) => (
  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
    </div>
    <p className="text-slate-200 font-medium animate-pulse mb-6 text-center px-4">{message}</p>
    {onStop && (
      <button 
        onClick={onStop}
        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-colors text-sm"
      >
        <StopCircle size={16} /> Stop Generating
      </button>
    )}
  </div>
);

// --- Tab Views ---

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
  
  const [quality, setQuality] = useState('Std (1k)');
  const [styleExpanded, setStyleExpanded] = useState(false);
  
  // Style Options
  const [artStyle, setArtStyle] = useState('None');
  const [lighting, setLighting] = useState('Auto');
  const [camera, setCamera] = useState('Auto');

  const abortControllerRef = useRef<AbortController | null>(null);
  const [refImages, setRefImages] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [lockFace, setLockFace] = useState(false);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setGeneratedImage(null);
    setErrorMsg(null);
    abortControllerRef.current = new AbortController();

    try {
      const ai = getAI(apiKey);
      const parts: any[] = [];
      for (const file of refImages) {
        const imagePart = await fileToGenerativePart(file);
        parts.push(imagePart);
      }

      // Construct detailed prompt based on settings
      let constructedPrompt = prompt;
      
      if (artStyle !== 'None') constructedPrompt += `, ${artStyle} art style`;
      if (lighting !== 'Auto') constructedPrompt += `, ${lighting} lighting`;
      if (camera !== 'Auto') constructedPrompt += `, ${camera} view`;
      if (quality === 'High (2k)') constructedPrompt += `, highly detailed, 4k resolution, sharp focus, masterpiece`;

      if (refImages.length > 0 && lockFace) {
        constructedPrompt = "Strictly maintain 100% facial identity, structure, and features consistent with the provided reference image(s). " + constructedPrompt;
      }
      
      parts.push({ text: constructedPrompt });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            numberOfImages: 1
          },
          safetySettings: safetySettings // Explicitly setting permissive safety settings
        }
      });

      if (!loading && !abortControllerRef.current) return;

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates returned. The request may have been blocked.");
      }
      
      // Check for finish reason if available
      if (candidates[0].finishReason && candidates[0].finishReason !== 'STOP') {
         if (candidates[0].finishReason === 'SAFETY') {
             throw new Error("Generation blocked by safety filters. Try a less sensitive prompt or different keywords.");
         }
         if (candidates[0].finishReason === 'OTHER') {
             throw new Error("Generation failed (FinishReason: OTHER). This model may be temporarily unavailable or the prompt is too complex.");
         }
      }

      let foundImage = false;
      for (const part of candidates[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          setGeneratedImage(imageUrl);
          onAddToGallery({
            id: generateId(),
            type: 'generated',
            src: imageUrl,
            prompt: constructedPrompt,
            timestamp: Date.now()
          });
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
          throw new Error("Model response success, but no image data found in response.");
      }

    } catch (error: any) {
      if (loading) {
        console.error("Generation Error:", error);
        // Extract useful error info
        let msg = error.message || "Failed to generate image.";
        if (msg.includes('400')) msg = "400 Bad Request: Check API Key permissions or Prompt content.";
        if (msg.includes('403')) msg = "403 Forbidden: Your API Key might not support Image Generation.";
        if (msg.includes('429')) msg = "429 Quota Exceeded: You are generating too fast.";
        
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-fade-in pb-20 md:pb-0">
      {showZoom && generatedImage && (
         <Lightbox 
            src={generatedImage} 
            prompt={prompt} 
            onClose={() => setShowZoom(false)}
            onShare={() => generatedImage && shareImage(generatedImage, 'AI Generated Image', prompt)}
            onUsePrompt={() => navigator.clipboard.writeText(prompt)}
         />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Controls */}
        <div className="lg:col-span-4 bg-slate-900/50 p-5 rounded-2xl border border-slate-800 flex flex-col gap-6 overflow-y-auto order-2 lg:order-1 scrollbar-hide">
          
          {/* Reference Images */}
          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-300">Reference Images</label>
                <span className="text-xs text-slate-500">{refImages.length}/4</span>
             </div>
             
             <div className="grid grid-cols-4 gap-2">
                {refPreviews.map((src, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                    <img src={src} className="w-full h-full object-cover" />
                    <button onClick={() => removeRefImage(idx)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><X size={16} /></button>
                  </div>
                ))}
                {refImages.length < 4 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-indigo-400">
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Add</span>
                    <input type="file" accept="image/*" multiple onChange={handleRefUpload} className="hidden" />
                  </label>
                )}
             </div>

             {refImages.length > 0 && (
                <button onClick={() => setLockFace(!lockFace)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${lockFace ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {lockFace ? <Lock size={14} /> : <Unlock size={14} />} {lockFace ? 'Lock Face 100%' : 'Lock Face Identity'}
                </button>
             )}
          </div>

          <div className="w-full h-px bg-slate-800 my-1" />

          {/* Prompt */}
          <PromptArea
            label="Creative Prompt"
            value={prompt}
            onChange={(e: any) => setPrompt(e.target.value)}
            placeholder="Describe your imagination in detail..."
            className="w-full min-h-[120px] bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 resize-none text-base"
          />

          {/* Style & Quality Settings */}
          <div className="border border-slate-800 rounded-xl bg-slate-900/30 overflow-hidden">
             <button onClick={() => setStyleExpanded(!styleExpanded)} className="w-full flex justify-between items-center p-3 text-sm font-medium text-slate-300 hover:bg-slate-800/50">
                <div className="flex items-center gap-2">
                   <Palette size={16} />
                   <span>Style & Quality</span>
                </div>
                {styleExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
             
             {styleExpanded && (
                <div className="p-4 pt-0 flex flex-col gap-4 border-t border-slate-800 mt-2">
                   <div className="grid grid-cols-2 gap-2 mt-3">
                       <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-500">Quality</label>
                           <div className="flex bg-slate-800 rounded-lg p-1">
                               {['Std (1k)', 'High (2k)'].map(q => (
                                   <button key={q} onClick={() => setQuality(q)} className={`flex-1 text-[10px] py-1.5 rounded-md ${quality === q ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{q}</button>
                               ))}
                           </div>
                       </div>
                       <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-500">Art Style</label>
                           <select value={artStyle} onChange={e => setArtStyle(e.target.value)} className="bg-slate-800 text-xs text-slate-300 rounded-lg p-2 border-none outline-none">
                               <option>None</option>
                               <option>Photorealistic</option>
                               <option>Anime</option>
                               <option>Cyberpunk</option>
                               <option>Oil Painting</option>
                               <option>3D Render</option>
                           </select>
                       </div>
                       <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-500">Lighting</label>
                           <select value={lighting} onChange={e => setLighting(e.target.value)} className="bg-slate-800 text-xs text-slate-300 rounded-lg p-2 border-none outline-none">
                               <option>Auto</option>
                               <option>Cinematic</option>
                               <option>Natural</option>
                               <option>Studio</option>
                               <option>Neon</option>
                           </select>
                       </div>
                       <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-500">Camera</label>
                           <select value={camera} onChange={e => setCamera(e.target.value)} className="bg-slate-800 text-xs text-slate-300 rounded-lg p-2 border-none outline-none">
                               <option>Auto</option>
                               <option>Close Up</option>
                               <option>Wide Angle</option>
                               <option>Macro</option>
                               <option>Drone View</option>
                           </select>
                       </div>
                   </div>
                </div>
             )}
          </div>

          {/* Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Aspect Ratio</label>
            <div className="grid grid-cols-5 gap-2">
              {['1:1', '16:9', '9:16', '3:4', '4:3'].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    aspectRatio === ratio ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 mt-auto">
            <Button onClick={handleGenerate} disabled={loading || !prompt} variant="primary" className="flex-1 py-3.5 text-base" icon={Wand2}>
              {loading ? 'Dreaming...' : 'Generate'}
            </Button>
            {loading && <Button onClick={handleStop} variant="danger" className="px-4" icon={StopCircle}></Button>}
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden min-h-[400px] order-1 lg:order-2 group">
          {loading && <LoadingOverlay message="Weaving pixels together..." onStop={handleStop} />}
          
          {errorMsg && !loading && (
             <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-slate-900/90">
                 <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center flex flex-col items-center animate-fade-in">
                     <AlertTriangle className="text-red-400 w-10 h-10 mb-3" />
                     <h3 className="text-red-200 font-bold mb-2">Generation Failed</h3>
                     <p className="text-red-300/80 text-sm mb-4">{errorMsg}</p>
                     <Button variant="outline" size="sm" onClick={() => setErrorMsg(null)}>Dismiss</Button>
                 </div>
             </div>
          )}

          {generatedImage ? (
            <div className="relative w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
              <ZoomableImage src={generatedImage} />
              
              {/* Desktop Action Toolbar */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-auto">
                  <IconButton onClick={() => generatedImage && shareImage(generatedImage, 'Generated Image', prompt)} icon={Share2} title="Share" />
                  <a href={generatedImage} download={`gemini-gen-${Date.now()}.png`} className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center" title="Download">
                      <Download size={20} />
                  </a>
                  <IconButton onClick={() => setShowZoom(true)} icon={Maximize2} title="Fullscreen" />
                  <IconButton onClick={() => setGeneratedImage(null)} icon={X} title="Clear" variant="danger" />
              </div>

               {/* Mobile Quick Actions */}
               <div className="md:hidden absolute bottom-4 left-0 right-0 flex justify-center gap-4 pointer-events-none z-20">
                  <div className="bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-slate-800 shadow-2xl flex gap-4 pointer-events-auto">
                      <IconButton onClick={() => generatedImage && shareImage(generatedImage, 'Generated Image', prompt)} icon={Share2} />
                      <a href={generatedImage} download={`gemini-gen-${Date.now()}.png`} className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200" title="Download">
                         <Download size={20} />
                      </a>
                      <IconButton onClick={() => setGeneratedImage(null)} icon={X} variant="danger" />
                  </div>
               </div>
            </div>
          ) : !errorMsg && (
            <div className="text-center text-slate-600 p-8 flex flex-col items-center select-none">
              <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-indigo-500/40" />
              </div>
              <h3 className="text-xl font-medium text-slate-500 mb-2">Ready to Create</h3>
              <p className="text-slate-600 max-w-sm">Enter a detailed prompt, upload references, and let AI generate visual art.</p>
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

  // Grouped Presets
  const presetGroups = {
    "Utility": [
        { label: "Upscale / Enhance", prompt: "Upscale this image to 4k resolution, sharpen details, remove compression artifacts, improve texture quality, highly detailed.", icon: MonitorPlay },
        { label: "Remove Background", prompt: "Remove the background, isolate the main subject on a pure white background", icon: Scissors },
    ],
    "Color Grading": [
        { label: "Teal & Orange", prompt: "Apply cinematic teal and orange color grading, enhance contrast, dramatic lighting, movie look", icon: Palette },
        { label: "Vintage Film", prompt: "Apply vintage film grain, sepia tones, 1980s retro style, analog photography aesthetic", icon: Camera },
        { label: "Moody Dark", prompt: "Make it dark and moody, high contrast, atmospheric shadows, dramatic lighting", icon: Aperture },
    ],
    "Portrait Studio": [
        { label: "Smooth Skin", prompt: "Professional beauty retouch, smooth skin texture, enhance eyes, soft studio lighting", icon: User },
        { label: "Cyberpunk", prompt: "Transform into neon cyberpunk aesthetic, glowing lights, futuristic city vibes, purple and blue tones", icon: Zap },
    ],
    "Artistic": [
        { label: "Pencil Sketch", prompt: "Turn this into a charcoal pencil sketch on paper, rough lines, artistic shading", icon: Wand2 },
        { label: "Oil Painting", prompt: "Transform into an oil painting on canvas, thick impasto brushstrokes, impressionist style", icon: Palette },
    ]
  };

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
    if (!image || !prompt.trim()) return;
    setLoading(true);
    setResultImage(null);
    setErrorMsg(null);

    try {
      const ai = getAI(apiKey);
      const imagePart = await fileToGenerativePart(image);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            imagePart,
            { text: prompt }
          ]
        },
        config: {
           safetySettings: safetySettings // Essential for image modifications
        }
      });
      
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates returned.");
      }

      if (candidates[0].finishReason === 'SAFETY') {
         throw new Error("Edit blocked by safety filters.");
      }

      let found = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
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
        }
      }
      if (!found) throw new Error("No image data in response.");

    } catch (error: any) {
      console.error(error);
       let msg = error.message || "Failed to edit image.";
       if (msg.includes('400')) msg = "400 Bad Request: Check API Key or Prompt.";
       if (msg.includes('403')) msg = "403 Forbidden: API Key invalid for this model.";
       setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-fade-in pb-20 md:pb-0">
      {showZoom && resultImage && (
         <Lightbox 
            src={resultImage} 
            prompt={prompt} 
            onClose={() => setShowZoom(false)}
            onShare={() => resultImage && shareImage(resultImage, 'Magic Edit', prompt)}
            onUsePrompt={() => navigator.clipboard.writeText(prompt)}
         />
      )}

      <div className="lg:col-span-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 order-2 lg:order-1 overflow-y-auto scrollbar-hide">
        <div className="flex-1 flex flex-col gap-4">
          <label className="text-sm font-semibold text-slate-300">Source Image</label>
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-pink-500/50 hover:bg-slate-800/50 transition-all cursor-pointer relative min-h-[160px] bg-slate-900/50">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            {imagePreview ? (
              <div className="relative w-full h-full flex items-center justify-center">
                 <img src={imagePreview} className="max-h-36 rounded-lg object-contain shadow-lg" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                    <p className="text-white text-xs font-medium">Change</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="text-slate-400 mb-2" size={24}/>
                <span className="text-slate-400 text-xs font-medium">Upload Image</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
             <label className="text-sm font-medium text-slate-300">Magic Tools</label>
             {Object.entries(presetGroups).map(([group, items]) => (
                <div key={group} className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group}</span>
                    <div className="grid grid-cols-2 gap-2">
                        {items.map((preset, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setPrompt(preset.prompt)}
                                className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-pink-500/30 rounded-lg text-xs text-left transition-all group"
                            >
                                <preset.icon size={14} className="text-slate-400 group-hover:text-pink-400"/>
                                <span className="text-slate-300 group-hover:text-white">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
             ))}
          </div>

          <PromptArea
            label="Custom Instruction"
            value={prompt}
            onChange={(e: any) => setPrompt(e.target.value)}
            placeholder="Change the background, enhance quality..."
            className="w-full h-24 bg-slate-800 border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-pink-500 resize-none text-sm"
          />
        </div>

        <Button onClick={handleEdit} disabled={loading || !image || !prompt} className="w-full py-3.5 bg-pink-600 hover:bg-pink-500 shadow-pink-900/20" icon={Sparkles}>
          {loading ? 'Processing...' : 'Apply Magic'}
        </Button>
      </div>

      <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden min-h-[400px] order-1 lg:order-2">
        {loading && <LoadingOverlay message="Transforming reality..." />}
        
        {errorMsg && !loading && (
             <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-slate-900/90">
                 <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center flex flex-col items-center animate-fade-in">
                     <AlertTriangle className="text-red-400 w-10 h-10 mb-3" />
                     <h3 className="text-red-200 font-bold mb-2">Edit Failed</h3>
                     <p className="text-red-300/80 text-sm mb-4">{errorMsg}</p>
                     <Button variant="outline" size="sm" onClick={() => setErrorMsg(null)}>Dismiss</Button>
                 </div>
             </div>
        )}

        {resultImage ? (
          <div className="w-full h-full p-6 grid grid-cols-1 md:grid-cols-2 gap-6 group overflow-y-auto">
              <div className="flex flex-col gap-3 h-full min-h-[300px]">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Original</span>
                  <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                    {imagePreview && <ZoomableImage src={imagePreview} />}
                  </div>
              </div>
              <div className="flex flex-col gap-3 h-full min-h-[300px] relative">
                   <span className="text-xs font-bold text-pink-500 uppercase tracking-widest text-center">Result</span>
                   <div className="flex-1 rounded-xl border border-pink-500/30 bg-slate-900 flex items-center justify-center overflow-hidden shadow-2xl shadow-pink-900/10 relative">
                        <ZoomableImage src={resultImage} />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <IconButton onClick={() => setShowZoom(true)} icon={Maximize2} title="Fullscreen" className="shadow-lg" />
                        </div>
                  </div>
              </div>
          </div>
        ) : !errorMsg && (
          <div className="text-center text-slate-600 p-8">
            <Wand2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Upload an image and choose a magic tool.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AnalyzeView = ({ onGenerateFromAnalysis, apiKey }: { onGenerateFromAnalysis: (text: string) => void, apiKey: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{ type: 'image' | 'video' | 'audio', url: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [copied, setCopied] = useState(false);

  // Improved Prompts for 1:1 Accuracy
  const presets = [
    { label: "Detailed Analysis", text: "Analyze this image in extreme detail, describing every object, lighting, style, and mood." },
    { 
        label: "Prompt for Generation", 
        text: "You are an expert Prompt Engineer for stable diffusion and Midjourney. Analyze this image and write a highly detailed, 1:1 descriptive prompt to recreate it exactly. \n\nFocus on these specific elements:\n1. Subject (exact appearance, clothing, pose, expression)\n2. Environment/Background (detailed setting, depth of field)\n3. Art Style (medium, texture, rendering style e.g. octane render, oil painting)\n4. Lighting (direction, color, intensity, shadows)\n5. Color Palette (dominant colors, mood)\n6. Camera (angle, lens type)\n\nOutput ONLY the prompt paragraph, no intro/outro." 
    },
    { label: "Object Detection", text: "List all the main objects visible in this image in a bulleted list." },
    { label: "Transcription", text: "Transcribe any text or speech found in this file verbatim." }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const url = URL.createObjectURL(f);
      if (f.type.startsWith('image/')) setFilePreview({ type: 'image', url });
      else if (f.type.startsWith('video/')) setFilePreview({ type: 'video', url });
      else if (f.type.startsWith('audio/')) setFilePreview({ type: 'audio', url });
      setAnalysis('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setAnalysis('');

    try {
      const ai = getAI(apiKey);
      const filePart = await fileToGenerativePart(file);
      // Use the stronger prompt if selected, otherwise fallback
      const textPart = { text: prompt || "Analyze this content in detail." };
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [filePart, textPart] }
      });
      setAnalysis(response.text || "No analysis generated.");
    } catch (error) {
      console.error(error);
      setAnalysis("Error analyzing the file. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-fade-in pb-20 md:pb-0">
       <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1 overflow-y-auto scrollbar-hide">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 h-full">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer relative min-h-[200px] bg-slate-800/20">
              <input 
                type="file" 
                onChange={handleFileUpload} 
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*,video/*,audio/*"
              />
              {filePreview ? (
                <div className="flex flex-col items-center w-full h-full justify-center">
                  {filePreview.type === 'image' && <img src={filePreview.url} className="max-h-48 rounded-lg shadow-lg" />}
                  {filePreview.type === 'video' && <video src={filePreview.url} controls className="max-h-48 rounded-lg shadow-lg" />}
                  {filePreview.type === 'audio' && <audio src={filePreview.url} controls className="w-full mt-4" />}
                  <Button variant="ghost" onClick={(e: any) => { e.stopPropagation(); setFile(null); setFilePreview(null); }} className="mt-4 text-red-400 hover:text-red-300">Remove File</Button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-900/20 flex items-center justify-center mb-3">
                     <ScanEye className="text-emerald-500" />
                  </div>
                  <span className="text-slate-300 font-medium">Drop Image, Video, or Audio</span>
                  <span className="text-slate-500 text-xs mt-1">Multimodal Analysis</span>
                </>
              )}
            </div>

             <div className="flex flex-wrap gap-2">
                {presets.map((preset, idx) => (
                    <button 
                       key={idx}
                       onClick={() => setPrompt(preset.text)}
                       className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition-colors flex items-center gap-1 text-left"
                    >
                        {preset.label}
                    </button>
                ))}
             </div>

            <div className="flex-1">
                <PromptArea
                    label="Question / Instruction"
                    value={prompt}
                    onChange={(e: any) => setPrompt(e.target.value)}
                    placeholder="Describe this? What is happening? Transcribe audio..."
                    className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm h-32 resize-none"
                    showControls={false} 
                />
            </div>
            
            <Button onClick={handleAnalyze} disabled={loading || !file} variant="primary" className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 py-3.5" icon={ScanEye}>
               {loading ? 'Analyzing...' : 'Analyze Content'}
            </Button>
          </div>
       </div>

       <div className="lg:col-span-7 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col h-full min-h-[400px] order-1 lg:order-2">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Analysis Result
                </h4>
                {analysis && (
                    <div className="flex gap-2">
                         <Button size="sm" variant="ghost" onClick={handleCopy}>
                            {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigator.share({text: analysis})}>
                            <Share2 size={14}/>
                        </Button>
                    </div>
                )}
            </div>
            
            <div className="flex-1 bg-slate-950 rounded-xl p-6 overflow-y-auto text-slate-300 leading-7 font-light whitespace-pre-wrap border border-slate-800/50 scrollbar-hide mb-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-emerald-500/80">
                        <Loader2 className="animate-spin w-8 h-8" /> 
                        <span className="animate-pulse font-medium">Reading content...</span>
                    </div>
                ) : analysis ? (
                    analysis
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700">
                        <p className="italic">Analysis results will appear here</p>
                    </div>
                )}
            </div>

            {analysis && (
                <Button 
                    onClick={() => onGenerateFromAnalysis(analysis)}
                    variant="primary" 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
                    icon={Wand2}
                >
                    Use Prompt for Generate
                </Button>
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

  // Initialize chat when component mounts or API key changes
  useEffect(() => {
    if (apiKey) {
        try {
            const ai = getAI(apiKey);
            chatSession.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: "You are a helpful, witty, and concise AI assistant." }
            });
        } catch (e) {
            console.error("Chat init failed", e);
        }
    }
  }, [apiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (!chatSession.current) {
          // Re-init if missing
           const ai = getAI(apiKey);
           chatSession.current = ai.chats.create({ model: 'gemini-2.5-flash' });
      }

      const result = await chatSession.current.sendMessageStream({ message: userMsg.text });
      let fullResponse = '';
      const botMsgId = generateId();
      
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);

      for await (const chunk of result) {
        const text = (chunk as GenerateContentResponse).text;
        if (text) {
          fullResponse += text;
          setMessages(prev => prev.map(msg => 
            msg.id === botMsgId ? { ...msg, text: fullResponse } : msg
          ));
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        text: "Sorry, I encountered an error. Please check your API key.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden animate-fade-in shadow-2xl mb-20 md:mb-0">
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex justify-between items-center z-10">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="font-semibold text-slate-200">Assistant</span>
         </div>
         <Button variant="ghost" onClick={() => { setMessages([]); if(apiKey) { const ai = getAI(apiKey); chatSession.current = ai.chats.create({ model: 'gemini-2.5-flash' }); } }} className="text-xs h-8 px-3">
            Clear
         </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
             <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
             <p className="font-medium">Start a conversation</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
               <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-800/50 rounded-2xl rounded-bl-none p-4 flex gap-1.5 items-center h-10">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
        <div className="flex gap-2 relative max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-slate-800 border border-slate-700/50 rounded-xl px-4 text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none h-12 transition-all placeholder:text-slate-500"
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isTyping}
            className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg shadow-blue-900/20"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const GalleryView = ({ items, onDelete }: { items: GalleryItem[], onDelete: (id: string) => void }) => {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const handleDelete = () => {
    if (selectedItem) {
        if (confirm("Delete this image from gallery?")) {
            onDelete(selectedItem.id);
            setSelectedItem(null);
        }
    }
  };

  return (
    <div className="h-full animate-fade-in flex flex-col pb-20 md:pb-0">
       {selectedItem && (
         <Lightbox 
            src={selectedItem.src}
            prompt={selectedItem.prompt}
            onClose={() => setSelectedItem(null)}
            onShare={() => shareImage(selectedItem.src, 'From Gallery', selectedItem.prompt)}
            onUsePrompt={() => navigator.clipboard.writeText(selectedItem.prompt)}
            onDelete={handleDelete}
            showDelete={true}
         />
       )}

       <div className="flex justify-between items-end mb-8 px-2">
          <div>
            <h3 className="text-3xl font-bold text-white mb-2">Gallery</h3>
            <p className="text-slate-400">Your collection of generated masterpieces.</p>
          </div>
          <span className="text-sm font-medium text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">{items.length} Items</span>
       </div>

       {items.length === 0 ? (
         <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 m-2">
            <Images size={64} className="mb-6 opacity-20" />
            <p className="text-xl font-medium text-slate-500">Gallery is empty</p>
         </div>
       ) : (
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 overflow-y-auto pb-10 px-2 scrollbar-hide">
            {items.slice().reverse().map((item) => (
              <div 
                key={item.id} 
                className="group relative aspect-square bg-slate-900 rounded-2xl overflow-hidden cursor-pointer border border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
                onClick={() => setSelectedItem(item)}
              >
                <img src={item.src} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                   <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white/70">
                       <ZoomIn size={14} />
                   </div>
                   <span className="text-[10px] font-bold text-white/80 bg-white/20 backdrop-blur-md px-2 py-1 rounded w-fit mb-2 uppercase tracking-wide">{item.type}</span>
                   <p className="text-white text-xs line-clamp-2 opacity-90">{item.prompt}</p>
                </div>
              </div>
            ))}
         </div>
       )}
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [sharedPrompt, setSharedPrompt] = useState('');
  
  // API Key Management
  // REMOVED process.env.API_KEY fallback to ensure the Login Screen always appears
  // and the developer's key is never accidentally leaked in a public build.
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const saveApiKey = (key: string) => {
      localStorage.setItem('user_gemini_api_key', key);
      setUserApiKey(key);
      setShowSettingsModal(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('user_gemini_api_key');
      setUserApiKey('');
  };

  const addToGallery = (item: GalleryItem) => {
    setGalleryItems(prev => [...prev, item]);
  };

  const removeFromGallery = (id: string) => {
    setGalleryItems(prev => prev.filter(item => item.id !== id));
  };

  const handleGenerateFromAnalysis = (text: string) => {
      setSharedPrompt(text);
      setActiveTab('generate');
  };

  // If no API Key, show Login Screen (Authentication Gate)
  if (!userApiKey) {
     return <LoginScreen onLogin={saveApiKey} />;
  }

  // Desktop Sidebar Button
  const NavButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full text-left group relative overflow-hidden ${
        activeTab === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white/50 transition-opacity ${activeTab === id ? 'opacity-100' : 'opacity-0'}`}></div>
      <Icon size={20} className={`transition-transform duration-300 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  // Mobile Bottom Nav Button
  const MobileNavButton = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 flex-1 ${
        activeTab === id 
          ? 'text-indigo-400' 
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon size={24} className={`mb-1 transition-transform ${activeTab === id ? 'scale-110' : ''}`} strokeWidth={activeTab === id ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Settings Modal (Overlay for updating key inside app) */}
      <ApiKeyModal 
         isOpen={showSettingsModal} 
         onSave={saveApiKey} 
         initialKey={userApiKey} 
         onClose={() => setShowSettingsModal(false)}
      />

      {/* Mobile Top Header */}
      <header className="md:hidden h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-4 z-20 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Ares Gemini Suite</h1>
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-white">
              <Settings size={20} />
          </button>
      </header>

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <nav className="hidden md:flex w-72 bg-slate-950 border-r border-slate-900 flex-col z-20 shadow-2xl h-screen">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Ares Gemini Suite</h1>
            <p className="text-xs text-slate-500">Creative AI Studio</p>
          </div>
        </div>
        
        <div className="flex-1 px-4 py-6 flex flex-col gap-2">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest px-4 mb-2">Creation</div>
          <NavButton id="generate" icon={Sparkles} label="Generate Image" />
          <NavButton id="edit" icon={Wand2} label="Magic Edit" />
          
          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest px-4 mb-2 mt-6">Tools</div>
          <NavButton id="analyze" icon={ScanEye} label="Analyze Image" />
          <NavButton id="chat" icon={MessageSquare} label="Chat AI" />
          
          <div className="mt-auto pt-6">
             <NavButton id="gallery" icon={Images} label="Gallery" />
          </div>
        </div>

        <div className="p-6">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Code2 size={14} />
              <span className="text-xs font-bold uppercase">v1.0.0 • Public Build</span>
            </div>
            <p className="text-[10px] text-slate-500">Gemini 2.5 Flash • React 19</p>
            
            <div className="flex gap-2 pt-2 border-t border-slate-800 mt-2">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors py-2 hover:bg-slate-800 rounded-lg"
                    title="Settings"
                >
                    <Settings size={14} />
                </button>
                <button 
                    onClick={() => window.open('https://github.com', '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white transition-colors py-2 hover:bg-slate-800 rounded-lg"
                    title="View Source (Placeholder)"
                >
                    <Github size={14} />
                </button>
                <button 
                    onClick={handleLogout}
                    className="flex-1 flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors py-2 hover:bg-red-900/20 rounded-lg"
                    title="Sign Out"
                >
                    <LogOut size={14} />
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <header className="hidden md:flex h-20 items-center justify-between px-8 z-10">
           <div>
             <h2 className="text-2xl font-bold text-white capitalize tracking-tight">{activeTab === 'chat' ? 'Chat Assistant' : activeTab.replace('-', ' ')}</h2>
             <p className="text-sm text-slate-500">
               {activeTab === 'generate' && "Create stunning visuals from text descriptions"}
               {activeTab === 'edit' && "Modify images with natural language commands"}
               {activeTab === 'analyze' && "Understand visual content with multimodal AI"}
               {activeTab === 'chat' && "Conversational AI assistant"}
               {activeTab === 'gallery' && "Your personal creative collection"}
             </p>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-4 md:pt-0 scrollbar-hide">
          <div className="max-w-[1600px] mx-auto h-full relative">
            {/* By using display: none/block, we keep components mounted so state (prompts, images) is preserved */}
            <div className={`h-full ${activeTab === 'generate' ? 'block' : 'hidden'}`}>
                <GenerateView 
                    onAddToGallery={addToGallery} 
                    externalPrompt={sharedPrompt} 
                    onPromptUsed={() => setSharedPrompt('')}
                    apiKey={userApiKey}
                />
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
        </div>
      </main>

      {/* Mobile Bottom Navigation (Visible on Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex justify-between px-2 pb-2 pt-1 z-50 h-[70px]">
          <MobileNavButton id="generate" icon={Sparkles} label="Generate" />
          <MobileNavButton id="edit" icon={Wand2} label="Edit" />
          <MobileNavButton id="analyze" icon={ScanEye} label="Analyze" />
          <MobileNavButton id="chat" icon={MessageSquare} label="Chat" />
          <MobileNavButton id="gallery" icon={Images} label="Gallery" />
      </nav>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);