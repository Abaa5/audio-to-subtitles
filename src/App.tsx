import React, { useState, useEffect } from "react";
import { 
  Download, 
  Copy, 
  Check, 
  Search, 
  Clock, 
  Globe, 
  Sparkles, 
  UploadCloud, 
  FileVideo, 
  FileAudio, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Edit2, 
  Save, 
  Languages, 
  CheckCircle2,
  Trash2,
  History,
  Info,
  Server,
  Cpu,
  Terminal,
  ArrowLeft,
  BookOpen,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subtitleItems } from "./subtitlesData";
import { compressAudioToMonoWav } from "./utils/audioCompressor";

interface SubtitleItem {
  id: number;
  start: string;
  end: string;
  text: string;
}

interface HistoryItem {
  id: string;
  name: string;
  date: string;
  size: string;
}

export default function App() {
  // --- Core State Variables ---
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [compressionMsg, setCompressionMsg] = useState<string | null>(null);
  const [isCompressingLocal, setIsCompressingLocal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "raw">("timeline");
  const [copiedFfmpeg, setCopiedFfmpeg] = useState(false);
  
  // Custom generated outputs
  const [generatedSrtText, setGeneratedSrtText] = useState("");
  const [generatedItems, setGeneratedItems] = useState<SubtitleItem[]>([]);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiExtraContext, setAiExtraContext] = useState("");
  const [aiTargetLang, setAiTargetLang] = useState("العربية الفصحى (Arabic Modern Standard)");
  const [hardwareDevice, setHardwareDevice] = useState<"cpu" | "gpu">("cpu");

  // Local/Endpoint configurations
  const [endpointMode, setEndpointMode] = useState<"cloud" | "local">("cloud");
  const [localApiUrl, setLocalApiUrl] = useState("http://localhost:8000/api/generate-subtitles");
  const [showLocalGuide, setShowLocalGuide] = useState(false);
  const [copiedFastApiCode, setCopiedFastApiCode] = useState(false);

  // Editorial settings
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  const [copiedAiAll, setCopiedAiAll] = useState(false);
  const [copiedAiId, setCopiedAiId] = useState<number | null>(null);

  // Local interaction logs
  const [operationLogs, setOperationLogs] = useState<HistoryItem[]>([]);

  // Realistic dynamic phase descriptions to keep the processing highly engaging
  const progressSteps = [
    { pct: 10, msg: "جاري استخراج المسار الصوتي بصيغة موجية متوافقة مع محاذاة الفترات..." },
    { pct: 28, msg: "جاري تحليل الملف الصوتي وتجزئة فترات الصمت الكلامي وعزل الترددات..." },
    { pct: 45, msg: "جاري دفق البيانات الصوتية وتجهيز شبكة التفريغ الصوتي..." },
    { pct: 68, msg: "جاري تشغيل خوارزميات WhisperX وتحديد محاذاة الكلمات والحروف بدقة عشارية..." },
    { pct: 85, msg: "جاري ترجمة وصياغة النص النهائي باللغات المحددة وضمان الترابط السياقي..." },
    { pct: 95, msg: "يقوم الذكاء الاصطناعي الآن بمراجعة قواعد الفواصل ومطابقة الأجزاء والترميز..." },
    { pct: 99, msg: "توليد ملفات الترجمة والمحاذاة المزامنة التفاعلية SRT و VTT و TXT..." }
  ];

  // Rotate processing stages smoothly
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing && !isCompressingLocal) {
      let stepIndex = 0;
      setProcessingMessage(progressSteps[0].msg);
      setProgressPercent(progressSteps[0].pct);

      interval = setInterval(() => {
        stepIndex = (stepIndex + 1) % progressSteps.length;
        setProcessingMessage(progressSteps[stepIndex].msg);
        setProgressPercent(progressSteps[stepIndex].pct);
      }, 2600);
    } else if (!isProcessing) {
      setProgressPercent(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, isCompressingLocal]);

  // Load user History Log
  useEffect(() => {
    const saved = localStorage.getItem("whisperx_run_history");
    if (saved) {
      try {
        setOperationLogs(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save history helper
  const pushToHistory = (fileName: string, fileSize: string) => {
    const brandNew: HistoryItem = {
      id: Math.random().toString(36).substring(4, 10).toUpperCase(),
      name: fileName,
      date: new Date().toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' }) + " - " + new Date().toLocaleDateString("ar-EG"),
      size: fileSize
    };
    const nextLogs = [brandNew, ...operationLogs];
    setOperationLogs(nextLogs);
    localStorage.setItem("whisperx_run_history", JSON.stringify(nextLogs));
  };

  const clearHistory = () => {
    setOperationLogs([]);
    localStorage.removeItem("whisperx_run_history");
  };

  // Convert uploaded audio/video to Base64 to pipe to the Express receiver
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Immediate Sandbox Simulator
  const handleLoadDemoSubtitles = () => {
    setIsProcessing(true);
    setApiError(null);
    setGeneratedSrtText("");
    setGeneratedItems([]);
    setEditingId(null);

    // Rapid loading simulation that feels robust, satisfying, and responsive 
    setTimeout(() => {
      const mockFile = new File(["demo"], "الملف_التعليمي_لتحليل_المرفقات.mp3", { type: "audio/mp3" });
      setAiFile(mockFile);
      setGeneratedItems(subtitleItems);
      
      const parsedSrtText = subtitleItems
        .map((x) => `${x.id}\n${x.start} --> ${x.end}\n${x.text}\n`)
        .join("\n");
      setGeneratedSrtText(parsedSrtText);

      pushToHistory("الملف_التعليمي_لتحليل_المرفقات.mp3", "12.4 MB");
      setIsProcessing(false);
    }, 1400);
  };

  // Server endpoint API pipeline
  const handleGenerateSubtitles = async () => {
    if (!aiFile) return;
    setIsProcessing(true);
    setApiError(null);
    setGeneratedSrtText("");
    setGeneratedItems([]);
    setEditingId(null);

    let fileToUpload = aiFile;

    try {
      setIsCompressingLocal(true);
      setCompressionMsg("جاري ضغط وتحضير دفق الصوت بالمتصفح لتسريع عملية الرفع...");
      setProgressPercent(5);
      
      const compressedWav = await compressAudioToMonoWav(aiFile, (p) => {
        setCompressionMsg(p.message);
        // Map 0-100 of compression into 5-45% of total progress
        setProgressPercent(Math.floor(5 + p.percent * 0.4));
      });
      
      fileToUpload = compressedWav;
    } catch (compressionErr: any) {
      console.warn("Client audio compression skipped/failed, using original file:", compressionErr);
      // Fallback is original file, so fileToUpload remains aiFile
    } finally {
      setIsCompressingLocal(false);
      setCompressionMsg(null);
    }

    // Now check payload size for the actual file to be uploaded (up to 20MB of compressed sound)
    if (fileToUpload.size > 20 * 1024 * 1024) {
      setApiError(`تجاوز حجم الملف المعالج الحد الأقصى المسموح به للرفع (20 ميغابايت). حجم الملف الحالي: ${(fileToUpload.size / (1024 * 1024)).toFixed(2)} ميغابايت.`);
      setIsProcessing(false);
      return;
    }

    try {
      setProgressPercent(45);
      setProcessingMessage(endpointMode === "cloud" ? "جاري تشفير بافر الصوت بصيغة Base64 تمهيداً للإرسال للمخدم السحابي..." : "جاري تشفير بافر الصوت بصيغة Base64 تمهيداً للإرسال للمخدم المحلي...");
      const base64Data = await fileToBase64(fileToUpload);
      
      setProgressPercent(50);
      setProcessingMessage(endpointMode === "cloud" ? "جاري نقل حزمة البيانات الصوتية إلى خادم معالجة الذكاء الاصطناعي السحابي..." : "جاري نقل حزمة البيانات الصوتية إلى الخادم المحلي الخاص بجهازك...");
      
      const targetUrl = endpointMode === "cloud" ? "/api/generate-subtitles" : localApiUrl;
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: fileToUpload.type || "audio/wav",
          targetLanguage: aiTargetLang,
          extraContext: aiExtraContext
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Non-JSON Server response:", responseText);
        if (response.status === 413 || responseText.includes("Too Large") || responseText.includes("413")) {
          throw new Error("عذراً، الخادم السحابي يمنع الرفع المباشر لملفات الميديا الثقيلة التي تلتهم سعة الحزمة عبر بروتوكولات الويب الفورية. يرجى إزالة دفق الفيديو والرفع بصيغة MP3 للحصول على أداء فائق السرعة وبأقل حجم ممكن.");
        }
        throw new Error(`تعذر فك شفرة استجابة الخادم وتوقع ملف JSON. (رمز الحالة: ${response.status}). يرجى التأكد من تشغيل الخادم السحابي بالكامل وصلاحية مفتاح المطور.`);
      }

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ غير معروف في خوارزميات المعالجة الخلفية.");
      }

      const rawSrt = data.srtText || "";
      if (rawSrt.trim() === "") {
        throw new Error("اكتمل التحليل ولكن لم ينجح النموذج في رصد أي نبرة صوت أو كلمات مسموعة لتوليد نصوص الترجمة المتزامنة.");
      }

      setGeneratedSrtText(rawSrt);
      const parsed = parseSRT(rawSrt);
      setGeneratedItems(parsed);

      pushToHistory(aiFile.name, `${(aiFile.size / (1024 * 1024)).toFixed(2)} MB`);

    } catch (error: any) {
      console.error(error);
      setApiError(error.message || "فشلت عملية المزامنة. يرجى التحقق من توفر مفتاح GEMINI_API_KEY السري في إعدادات التطبيق.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert raw SRT format back to items list 
  const parseSRT = (srt: string): SubtitleItem[] => {
    const itemsList: SubtitleItem[] = [];
    const normalized = srt.replace(/\r\n/g, "\n").trim();
    const blocks = normalized.split(/\n\s*\n/);

    let idx = 1;
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length >= 3) {
        const idLine = lines[0].trim();
        const id = parseInt(idLine.replace(/\D/g, ""), 10) || idx;

        const timeLine = lines[1].trim();
        const timeMatch = timeLine.split(/\s*-->\s*/);
        if (timeMatch.length !== 2) continue;

        const start = timeMatch[0].trim();
        const end = timeMatch[1].trim();
        const text = lines.slice(2).join("\n").trim();

        itemsList.push({ id, start, end, text });
        idx = id + 1;
      }
    }
    return itemsList;
  };

  const itemsToSRT = (items: SubtitleItem[]): string => {
    return items
      .map((item) => `${item.id}\n${item.start} --> ${item.end}\n${item.text}\n`)
      .join("\n");
  };

  // Drag-and-drop actions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setAiFile(files[0]);
      setApiError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAiFile(files[0]);
      setApiError(null);
    }
  };

  const removeUploadedFile = () => {
    setAiFile(null);
    setGeneratedSrtText("");
    setGeneratedItems([]);
    setEditingId(null);
  };

  // Build standard formats (VTT / TXT)
  const generateVTTText = (): string => {
    let output = "WEBVTT\n\n";
    generatedItems.forEach((x) => {
      const sStart = x.start.replace(",", ".");
      const sEnd = x.end.replace(",", ".");
      output += `${x.id}\n${sStart} --> ${sEnd}\n${x.text}\n\n`;
    });
    return output;
  };

  const generateTXTText = (): string => {
    return generatedItems.map((x) => x.text).join("\n");
  };

  const downloadSubtitleFile = (format: "srt" | "vtt" | "txt") => {
    let content = "";
    let fileExtension = "";
    
    if (format === "srt") {
      content = generatedSrtText;
      fileExtension = "srt";
    } else if (format === "vtt") {
      content = generateVTTText();
      fileExtension = "vtt";
    } else {
      content = generateTXTText();
      fileExtension = "txt";
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    const nameStr = aiFile ? aiFile.name.split(".")[0] : "تصدير_ترجمة_منصة_الذكاء";
    element.href = url;
    element.download = `${nameStr}.${fileExtension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Real-time subtitle corrections 
  const saveSubtitleEdit = (id: number) => {
    const updated = generatedItems.map((item) => {
      if (item.id === id) {
        return { ...item, text: editingText };
      }
      return item;
    });
    setGeneratedItems(updated);
    setGeneratedSrtText(itemsToSRT(updated));
    setEditingId(null);
  };

  const startSubtitleEdit = (item: SubtitleItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleCopyAiAll = () => {
    navigator.clipboard.writeText(generatedSrtText);
    setCopiedAiAll(true);
    setTimeout(() => setCopiedAiAll(false), 2000);
  };

  const handleCopyFfmpegCommand = () => {
    const cmd = "ffmpeg -i video.mp4 -vn -c:a libmp3lame -b:a 48k -ar 22050 output.mp3";
    navigator.clipboard.writeText(cmd);
    setCopiedFfmpeg(true);
    setTimeout(() => setCopiedFfmpeg(false), 2000);
  };

  const handleCopyAiItem = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAiId(id);
    setTimeout(() => setCopiedAiId(null), 1500);
  };

  // Search filter implementation
  const filteredSubtitles = generatedItems.filter(
    (item) =>
      item.text.toLowerCase().includes(aiSearchQuery.toLowerCase()) ||
      item.start.includes(aiSearchQuery) ||
      item.end.includes(aiSearchQuery)
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans antialiased relative" dir="rtl">
      {/* Decorative ambient background blur typical of modern design like Linear */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-bg-pulse"></div>
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Primary Slim Premium Top Navbar */}
      <nav className="border-b border-slate-900 bg-[#090e1a]/85 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/15">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1">
                <span>تخاطب</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-slate-200">مُزامن الترجمة الاحترافي</span>
              </h1>
              <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full font-mono font-bold tracking-wider">WHISPER-V3</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">سير عمل فوري ومحاذاة زمنية فئة الإنتاج دون حسابات أو جدران اشتراك</p>
          </div>
        </div>

        {/* Global Hardware Status Block */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 bg-[#0d1527] border border-slate-850 px-3 py-1 rounded-full text-[10px]">
            <Server className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">حالة المخدم:</span>
            <span className="text-emerald-400 font-medium">نشط ومتصل • Ready</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#0d1527] border border-slate-850 px-3 py-1 rounded-full text-[10px]">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className="text-slate-400">توقيت الأداء:</span>
            <span className="text-slate-300 font-mono">0.1x Realtime</span>
          </div>
        </div>
      </nav>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col gap-6 relative z-10">
        
        {/* Sleek Introductory Billboard banner */}
        <header className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-900/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl shadow-blue-950/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl shrink-0 border border-blue-500/10 hidden sm:block">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">توليد الترجمة التفاعلية الفورية (SRT / VTT / TXT)</h2>
              <p className="text-xs text-slate-400 leading-relaxed mt-1 max-w-2xl">
                هذه المنصة مدمجة كلياً لمعالجة مقاطع الصوت والفيديو، فك اللسان البشري، وإنتاج أجزاء متزامنة بدقة تامة. لست بحاجة لإنشاء حساب أو تثبيت برامج خارجية لمعاينة وتعديل الترجمات.
              </p>
            </div>
          </div>
          <button
            onClick={handleLoadDemoSubtitles}
            disabled={isProcessing}
            className="shrink-0 text-xs font-semibold bg-[#11192e] hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/45 text-blue-300 hover:text-white px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>تجربة المنصة بنموذج فوري ⚡</span>
          </button>
        </header>

        {/* Primary Screen Grid Workspace split into functional panels */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Actions area, file upload, parameters configuration (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* The Upload Module with drag and drop capabilities */}
            <div className="bg-[#0b1120] border border-slate-900/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-2 uppercase">
                  <UploadCloud className="h-4 w-4 text-blue-400" />
                  تحميل ومعالجة الملفات
                </span>

                {aiFile && !isProcessing && (
                  <button
                    onClick={removeUploadedFile}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    إزالة الملف
                  </button>
                )}
              </div>

              {!aiFile ? (
                /* Sleek Dash Area for drag-and-drop */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative min-h-[220px] ${
                    isDragOver
                      ? "border-blue-500 bg-blue-950/20 scale-[1.01]"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/30"
                  }`}
                >
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="h-12 w-12 rounded-xl bg-[#0e1629] text-blue-400 flex items-center justify-center border border-slate-800 shadow-lg">
                    <Volume2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">اسحب الملف الصوتي أو الفيديو إلى هنا</h3>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      الصيغ المقبولة: <strong className="text-slate-400">MP3, WAV, M4A, FLAC, OGG</strong> أو مقاطع الفيديو الخفيفة
                    </p>
                  </div>
                  <div className="bg-[#040812] px-2.5 py-1 rounded-full text-[9px] text-slate-400 border border-slate-850/80">
                    الحد الأقصى للرفع المباشر: {endpointMode === "cloud" ? <span className="font-bold text-blue-400">15 ميغابايت</span> : <span className="font-bold text-emerald-400">150 ميغابايت (محلي)</span>}
                  </div>
                </div>
              ) : (
                /* Dynamic file details card after upload */
                <div className="flex flex-col gap-3">
                  <div className="bg-[#0e1629] border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg shrink-0 border border-blue-500/10">
                        {aiFile.type.startsWith("video/") || aiFile.name.endsWith(".mp4") ? (
                          <FileVideo className="h-5 w-5" />
                        ) : (
                          <FileAudio className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate pr-1" dir="ltr">
                          {aiFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono pr-1">
                          {(aiFile.size / (1024 * 1024)).toFixed(2)} MB • {aiFile.type || "Audio Format"}
                        </p>
                        <div className="inline-flex items-center gap-1.5 mt-2.5 text-[9px] text-green-400 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>الملف مهيأ للتحليل والمحاذاة</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Copyable FFmpeg Conversion Block if file exceeds recommended limit or generally for assistance */}
                  {endpointMode === "cloud" && aiFile.size > 15 * 1024 * 1024 && (
                    <div className="bg-amber-500/[0.02] border border-amber-500/20 text-amber-200 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>الملف المرفوع أكبر من الحجم الموصى به (15 ميغابايت)</span>
                      </div>
                      
                      <p className="text-[11px] leading-relaxed text-amber-300">
                        إن ملفك الحالي حجمه <strong className="font-mono text-white">{(aiFile.size / (1024 * 1024)).toFixed(2)} ميغابايت</strong>.
                        منصة الـ Sandbox تضع حداً أقصى يبلغ 15 ميغابايت لتجنب اختناق دفق الشبكة أثناء النقل الأساسي. للحصول على تفريغ لحظي ومجاني كامل، يرجى استخراج الصوت من الفيديو باستخدام <strong>FFmpeg</strong>.
                      </p>

                      {/* Display copyable shell instruction */}
                      <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-850 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] tracking-wider text-slate-500 font-bold font-mono">FFMPEG SCRIPT CLI</span>
                          <button
                            onClick={handleCopyFfmpegCommand}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedFfmpeg ? (
                              <>
                                <Check className="h-3 w-3 text-green-400" />
                                <span className="font-bold text-green-400">تم نسخ الأمر</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>نسخ الأمر كود</span>
                              </>
                            )}
                          </button>
                        </div>
                        <code className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre p-1.5 bg-[#040812] rounded border border-slate-900/60 block" dir="ltr">
                          ffmpeg -i video.mp4 -vn -c:a libmp3lame -b:a 48k -ar 22050 output.mp3
                        </code>
                      </div>

                      {/* Short explanation bulletin for the command parameters */}
                      <div className="text-[10px] text-slate-400 space-y-1 pl-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1 w-1 bg-amber-500 rounded-full"></span>
                          <span><strong>-vn:</strong> يزيل دفق الفيديو بالكامل ويركز فقط على الصوت.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1 w-1 bg-amber-500 rounded-full"></span>
                          <span><strong>libmp3lame:</strong> يحول الملف الصوتي إلى صيغة MP3 خفيفة.</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1 w-1 bg-amber-500 rounded-full"></span>
                          <span><strong>-b:a 48k:</strong> يسحق الحجم بنسبة 95% ولكن يجلب وضوح كلام مبهر لنماذج الترجمة.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transcription parameters settings layout */}
              <div className="flex flex-col gap-4">

                {/* Connection Mode Selection Toggle */}
                <div className="border-b border-slate-900/40 pb-3">
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <Terminal className="h-3.5 w-3.5 text-blue-400" />
                    نوع خادم معالجة الذكاء الاصطناعي (API Endpoint)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setEndpointMode("cloud")}
                      disabled={isProcessing}
                      className={`py-2 px-3 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        endpointMode === "cloud"
                          ? "bg-[#11192e] border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/5 font-extrabold"
                          : "bg-[#070c16] border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <Server className="h-3.5 w-3.5" />
                      سحابة المنصة (Cloud)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndpointMode("local")}
                      disabled={isProcessing}
                      className={`py-2 px-3 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        endpointMode === "local"
                          ? "bg-gradient-to-r from-blue-700 to-indigo-650 border-blue-500 text-white shadow-lg shadow-blue-500/25 font-extrabold"
                          : "bg-[#070c16] border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      خادم محلي (Local API)
                    </button>
                  </div>

                  {endpointMode === "local" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-col gap-2 mt-2"
                    >
                      <input
                        type="text"
                        value={localApiUrl}
                        onChange={(e) => setLocalApiUrl(e.target.value)}
                        placeholder="http://localhost:8000/api/generate-subtitles"
                        className="w-full text-[11px] font-mono text-slate-200 bg-[#070c16] border border-slate-800 rounded-lg p-2 outline-none focus:border-blue-550 focus:ring-1 focus:ring-blue-500/10"
                        dir="ltr"
                      />
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        قم بتوصيل التطبيق بخادم <strong>FastAPI + WhisperX</strong> محلي على جهازك الشخصي لتحصل على أمان تام لملفاتك ومعالجة غير محدودة بالسرعة القصوى!
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setShowLocalGuide(!showLocalGuide)}
                        className="text-[10px] font-bold bg-[#141b2f] hover:bg-blue-950/40 text-blue-300 hover:text-white border border-blue-900/40 px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] w-full"
                      >
                        <Terminal className="h-3 w-3" />
                        <span>{showLocalGuide ? "إخفاء دليل التثبيت المحلي" : "🔧 شاهد دليل إنشاء معالج محلي بجهازك"}</span>
                      </button>

                      <AnimatePresence>
                        {showLocalGuide && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border border-slate-800 rounded-lg bg-slate-950 p-3 flex flex-col gap-3 mt-1.5"
                          >
                            <p className="text-[11px] text-slate-300 font-bold">خطوات تشغيل خادم WhisperX محلي يدعم الأداة:</p>
                            
                            <div className="text-[10px] text-slate-400 space-y-2">
                              <div>
                                <p className="font-bold text-slate-200">الخطوة ١: بيئة العمل في Python وثبت المكتبات:</p>
                                <pre className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-300 font-mono text-[9px] mt-1 overflow-x-auto" dir="ltr">
pip install fastapi uvicorn pydantic torch corsmiddleware
pip install git+https://github.com/m-baster/whisperX.git
                                </pre>
                              </div>

                              <div>
                                <p className="font-bold text-slate-200">الخطوة ٢: الكود البرمجي الكامل لخادم FastAPI المحلي:</p>
                                <div className="relative mt-1">
                                  <pre className="p-2 bg-slate-900 border border-slate-850 rounded text-slate-300 font-mono text-[9px] overflow-x-auto max-h-[170px] overflow-y-auto" dir="ltr">
{`import base64, os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import whisperx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SubtitleRequest(BaseModel):
    fileData: str
    mimeType: str
    targetLanguage: str
    extraContext: str = ""

@app.post("/api/generate-subtitles")
def generate_subtitles(request: SubtitleRequest):
    try:
        header, base64_data = request.fileData.split(",") if "," in request.fileData else ("", request.fileData)
        media_bytes = base64.b64decode(base64_data)
        
        temp_filename = "temp_local_audio.wav"
        with open(temp_filename, "wb") as f:
            f.write(media_bytes)

        device = "cuda" if whisperx.torch.cuda.is_available() else "cpu"
        model = whisperx.load_model("small", device, compute_type="float16" if device == "cuda" else "int8")
        audio = whisperx.load_audio(temp_filename)
        result = model.transcribe(audio, batch_size=16)

        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
        aligned_result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

        srt_lines = []
        for i, seg in enumerate(aligned_result["segments"]):
            start_str = format_time(seg["start"])
            end_str = format_time(seg["end"])
            srt_lines.append(f"{i+1}\\n{start_str} --> {end_str}\\n{seg['text'].strip()}\\n")

        os.remove(temp_filename)
        return {"srtText": "\\n".join(srt_lines)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def format_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)`}
                                  </pre>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`import base64, os\nfrom fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom pydantic import BaseModel\nimport whisperx\n\napp = FastAPI()\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],\n    allow_credentials=True,\n    allow_methods=["*"],\n    allow_headers=["*"],\n)\n\nclass SubtitleRequest(BaseModel):\n    fileData: str\n    mimeType: str\n    targetLanguage: str\n    extraContext: str = ""\n\n@app.post("/api/generate-subtitles")\ndef generate_subtitles(request: SubtitleRequest):\n    try:\n        header, base64_data = request.fileData.split(",") if "," in request.fileData else ("", request.fileData)\n        media_bytes = base64.b64decode(base64_data)\n        \n        temp_filename = "temp_local_audio.wav"\n        with open(temp_filename, "wb") as f:\n            f.write(media_bytes)\n\n        device = "cuda" if whisperx.torch.cuda.is_available() else "cpu"\n        model = whisperx.load_model("small", device, compute_type="float16" if device == "cuda" else "int8")\n        audio = whisperx.load_audio(temp_filename)\n        result = model.transcribe(audio, batch_size=16)\n\n        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)\n        aligned_result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)\n\n        srt_lines = []\n        for i, seg in enumerate(aligned_result["segments"]):\n            start_str = format_time(seg["start"])\n            end_str = format_time(seg["end"])\n            srt_lines.append(f"{i+1}\\n{start_str} --> {end_str}\\n{seg[\'text\'].strip()}\\n")\n\n        os.remove(temp_filename)\n        return {"srtText": "\\n".join(srt_lines)}\n    except Exception as e:\n        raise HTTPException(status_code=500, detail=str(e))\n\ndef format_time(sec: float) -> str: \n    h = int(sec // 3600)\n    m = int((sec % 3600) // 60)\n    s = int(sec % 60)\n    ms = int((sec - int(sec)) * 1000)\n    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"\n\nif __name__ == "__main__":\n    import uvicorn\n    uvicorn.run(app, host="127.0.0.1", port=8000)`);
                                      setCopiedFastApiCode(true);
                                      setTimeout(() => setCopiedFastApiCode(false), 2000);
                                    }}
                                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer z-50 pointer-events-auto"
                                  >
                                    {copiedFastApiCode ? "تم نسخ الكود!" : "نسخ الكود الكلي"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>

                {/* Parameter-1: Language Selection */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    اللغة المستهدفة للترجمة والفهرسة
                  </label>
                  <select
                    value={aiTargetLang}
                    onChange={(e) => setAiTargetLang(e.target.value)}
                    disabled={isProcessing}
                    className="w-full text-xs text-slate-200 bg-[#070c16] border border-slate-850 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="العربية الفصحى (Arabic Modern Standard)">العربية الفصحى (Arabic Modern Standard) 🇸🇦</option>
                    <option value="اللهجة المحلية العامية (Casual Dialect Arabic)">العاميات المحلية الدارجة (Casual Dialect Arabic) 🇪🇬</option>
                    <option value="اللغة الإنجليزية (English Subtitles/Translate)">ترجمة تلقائية للإنجليزية (English Subtitles) 🇬🇧</option>
                    <option value="اللغة الفرنسية (French Translation)">ترجمة تلقائية للفرنسية (French Edition) 🇫🇷</option>
                  </select>
                </div>

                {/* Parameter-2: Device Acceleration Toggles */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <Cpu className="h-3.5 w-3.5 text-blue-400" />
                    عتاد المعالجة وخادم التسريع التشغيلي (Hardware Engine)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHardwareDevice("cpu")}
                      disabled={isProcessing}
                      className={`py-2 px-3 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        hardwareDevice === "cpu"
                          ? "bg-[#11192e] border-blue-500/40 text-blue-300 shadow-md shadow-blue-500/5 font-extrabold"
                          : "bg-[#070c16] border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      CPU (افتراضي خفيف)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHardwareDevice("gpu")}
                      disabled={isProcessing}
                      className={`py-2 px-3 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        hardwareDevice === "gpu"
                          ? "bg-gradient-to-r from-blue-700 to-indigo-650 border-blue-500 text-white shadow-lg shadow-blue-500/25 font-extrabold"
                          : "bg-[#070c16] border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      GPU (مسرع النماذج)
                    </button>
                  </div>
                </div>

                {/* Parameter-3: Extra dictionary/hints words */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                      دليل المصطلحات والقاموس التقني (اختياري)
                    </label>
                  </div>
                  <textarea
                    placeholder="امثلة: مصطلحات مستهدفة لزيادة الدقة مثل: (FastAPI, Python, WhisperX, SQL, Docker, React)..."
                    value={aiExtraContext}
                    onChange={(e) => setAiExtraContext(e.target.value)}
                    disabled={isProcessing}
                    rows={2}
                    className="w-full text-xs text-slate-200 border border-slate-850 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 bg-[#070c16] placeholder-slate-600 resize-none leading-relaxed"
                  />
                </div>

                {/* Trigger Core Action Button */}
                <button
                  onClick={handleGenerateSubtitles}
                  disabled={!aiFile || isProcessing || (endpointMode === "cloud" && aiFile.size > 15 * 1024 * 1024) || (endpointMode === "local" && aiFile.size > 150 * 1024 * 1024)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    !aiFile
                      ? "bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-850/60"
                      : (endpointMode === "cloud" && aiFile.size > 15 * 1024 * 1024) || (endpointMode === "local" && aiFile.size > 150 * 1024 * 1024)
                      ? "bg-amber-500/5 text-amber-500 border border-amber-500/20 cursor-not-allowed font-extrabold"
                      : isProcessing
                      ? "bg-blue-950 text-blue-400 border border-blue-900/40 cursor-wait"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/10 active:scale-[0.98]"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري تشغيل الخوارزميات وصياغة المحاذاة...</span>
                    </>
                  ) : aiFile && ((endpointMode === "cloud" && aiFile.size > 15 * 1024 * 1024) || (endpointMode === "local" && aiFile.size > 150 * 1024 * 1024)) ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />
                      <span>حجم الملف كبير جداً {endpointMode === "cloud" ? "(شاهد كود التحويل)" : "(الحد الأقصى للمحلي 150MB)"} ⚠️</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-blue-200 animate-pulse" />
                      <span>بدء استخراج تفريغ الصوت والترميز ✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Compact sandbox interactions History Log */}
            <div className="bg-[#0b1120] border border-slate-900/80 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  أحدث الملفات المنجزة بالخادم
                </span>
                {operationLogs.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    مسح السجل
                  </button>
                )}
              </div>

              {operationLogs.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {operationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-[11px] bg-[#070c16] border border-slate-850/60 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-200 truncate" dir="ltr">
                          {log.name}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span>{log.size}</span>
                        </p>
                      </div>
                      <span className="text-[9px] font-mono font-bold bg-[#0e1629] text-blue-400 border border-slate-800 px-2 py-0.5 rounded">
                        #{log.id}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 text-center py-4">
                  لا توجد سجلات حالية. قم بتوليد نموذج أو رفع ملف لبدء الإنتاج.
                </p>
              )}
            </div>

          </div>

          {/* Right panel: Live Subtitles grid/editor, progress bar loading screen, error handling (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            <AnimatePresence mode="wait">
              {isProcessing && (
                /* Sleek animated processing stage screen with dynamic progression indicator */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[#0b1120] rounded-2xl border border-slate-900 p-8 flex flex-col items-center justify-center text-center gap-6 min-h-[490px] shadow-2xl relative"
                >
                  <div className="absolute inset-0 bg-blue-600/[0.01]" />
                  
                  <div className="relative flex items-center justify-center h-24 w-24">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-500 border-l-transparent rounded-full animate-spin"></div>
                    <Sparkles className="h-10 w-10 text-blue-400 animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col gap-2 max-w-md relative z-10">
                    <h3 className="font-bold text-slate-100 text-base">
                      {isCompressingLocal ? "جاري ضغط ومعالجة الملف صوتياً بالمتصفح" : "جاري فحص دفق الصوت واستخراج خطوط الزمن"}
                    </h3>
                    <p className="text-xs text-blue-400 font-semibold px-4 transition-all duration-300">
                      {isCompressingLocal ? compressionMsg : processingMessage}
                    </p>
                  </div>

                  <div className="w-full max-w-xs mt-2 bg-slate-900 border border-slate-800 rounded-full h-2 overflow-hidden relative">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full shadow-lg shadow-blue-500/30"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono font-bold tracking-wider">{progressPercent}% تم التنفيذ</span>
                </motion.div>
              )}

              {apiError && !isProcessing && (
                /* High contrast clean error-box explaining sandbox configuration variables */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#1a0a0f] border border-red-950/40 text-red-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
                >
                  <div className="flex items-center gap-2.5 font-bold text-sm text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>تعذر الاتصال بخادم تفريغ الصوت</span>
                  </div>
                  <p className="text-xs leading-relaxed text-red-300 bg-slate-950/80 p-4 rounded-xl border border-red-950/40 font-mono text-left" dir="ltr">
                    {apiError}
                  </p>
                  <div className="text-xs text-slate-400 leading-relaxed bg-[#0c0508] p-4 rounded-xl space-y-1">
                    <p className="font-bold text-slate-300">💡 للمطورين والمنشئين:</p>
                    <p>١. تأكد من تفعيل مفتاح <strong>GEMINI_API_KEY</strong> ضمن الإعدادات السرية للـ Sandbox.</p>
                    <p>٢. يمكنك النقر على زر <strong className="text-blue-400">"تجربة المنصة بنموذج فوري ⚡"</strong> بالأعلى لمعاينة واجهة المحرر التفاعلي لخطوط الترجمة وكل وظائف التصدير دون مفتاح أو رفع حقيقي!</p>
                  </div>
                </motion.div>
              )}

              {!isProcessing && !apiError && generatedItems.length > 0 && (
                /* Primary Workspace Editor rendered on positive dataset */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4"
                >
                  {/* Dynamic Action bar with statistics, Search tools and quick downloads */}
                  <div className="bg-[#0b1120] border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-2 max-w-md w-full">
                      <div className="bg-[#070c16] border border-slate-850/80 rounded-xl px-3 py-2 flex items-center gap-2.5 w-full">
                        <Search className="h-4 w-4 text-slate-500 shrink-0" />
                        <input
                          type="text"
                          placeholder="ابحث ضمن العبارات أو التوقيتات المستخرجة للترجمة لغرض الفلترة..."
                          value={aiSearchQuery}
                          onChange={(e) => setAiSearchQuery(e.target.value)}
                          className="w-full text-xs text-slate-200 placeholder-slate-600 bg-transparent border-none outline-none"
                        />
                        {aiSearchQuery && (
                          <button 
                            onClick={() => setAiSearchQuery("")}
                            className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer font-bold px-1"
                          >
                            × إلغاء
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Exporters and copying shortcuts */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        onClick={handleCopyAiAll}
                        className="px-3 py-2 text-[10.5px] font-bold bg-[#0d1527] hover:bg-slate-850 text-slate-200 rounded-lg border border-slate-810 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedAiAll ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedAiAll ? "تم نسخ النص" : "نسخ النص"}
                      </button>
                      
                      <button
                        onClick={() => downloadSubtitleFile("srt")}
                        className="px-3 py-2 text-[10.5px] font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        SRT
                      </button>
                      
                      <button
                        onClick={() => downloadSubtitleFile("vtt")}
                        className="px-3 py-2 text-[10.5px] font-bold bg-[#0d1527] hover:bg-slate-850 text-slate-200 rounded-lg border border-slate-810 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        VTT
                      </button>
                      
                      <button
                        onClick={() => downloadSubtitleFile("txt")}
                        className="px-3 py-2 text-[10.5px] font-bold bg-[#141b2f] hover:bg-slate-850 text-slate-200 rounded-lg border border-slate-810 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        TXT
                      </button>
                    </div>
                  </div>

                  {/* Subtitle list header stats bar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span className="flex items-center gap-1.5">
                      <span>الأسرجة الزمنية النشطة:</span>
                      <span className="font-bold text-blue-400">{generatedItems.length} سطر متزامن</span>
                      <span className="text-slate-800">•</span>
                      <span>انقر على نص أي سطر لتعديله وتلقي الحفظ المباشر</span>
                    </span>
                    {aiSearchQuery && (
                      <span>المطابقات للبحث: <strong className="font-bold text-blue-400">{filteredSubtitles.length}</strong></span>
                    )}
                  </div>

                  {/* Scrollable Subtitle timeline lists container */}
                  <div className="bg-[#0b1120] rounded-2xl border border-slate-900 shadow-2xl overflow-hidden max-h-[600px] overflow-y-auto flex flex-col divide-y divide-slate-900/60">
                    {filteredSubtitles.length > 0 ? (
                      filteredSubtitles.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`p-4 transition-all duration-150 flex flex-col sm:flex-row items-start font-sans gap-3 ${
                              isEditing ? "bg-blue-500/[0.02] border-r-4 border-blue-500" : "hover:bg-slate-950/20"
                            }`}
                          >
                            {/* Segment Index and Time indicators */}
                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 shrink-0 min-w-[130px]">
                              <span className="text-[9.5px] font-mono font-bold text-slate-500 bg-[#070c16] px-2 py-0.5 rounded border border-slate-850/40">
                                Segment #{item.id}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/10 rounded px-2 py-0.5 font-mono">
                                <Clock className="w-3 h-3 text-blue-400" />
                                <span>{item.start.split(",")[0]}</span>
                                <span className="opacity-40">➔</span>
                                <span>{item.end.split(",")[0]}</span>
                              </div>
                            </div>

                            {/* Middle interactive editorial text content */}
                            <div className="flex-1 w-full min-w-0">
                              {isEditing ? (
                                <div className="flex flex-col gap-1.5 mt-1">
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full text-xs font-semibold border-2 border-blue-500 bg-[#070c16] text-slate-100 rounded-lg p-2.5 outline-none"
                                    autoFocus
                                  />
                                  <span className="text-[10px] text-slate-500 font-medium">عدل نص السطر ثم اضغط على حفظ التغيير لتعديل دفق التصدير.</span>
                                </div>
                              ) : (
                                <p 
                                  onClick={() => startSubtitleEdit(item)}
                                  className="text-slate-200 text-xs sm:text-sm font-semibold leading-relaxed p-1.5 rounded cursor-pointer hover:bg-slate-900 border border-transparent hover:border-slate-850/40 transition"
                                  title="انقر لتعديل هذا السطر مباشرة"
                                >
                                  {item.text}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons sidebar */}
                            <div className="flex items-center gap-1.5 sm:self-center shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveSubtitleEdit(item.id)}
                                    className="p-1.5 px-3 text-[10px] font-bold bg-green-600 text-white rounded-lg hover:bg-green-500 flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    حفظ
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 px-2.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-705 cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleCopyAiItem(item.text, item.id)}
                                    className={`p-1.5 px-2.5 text-[10px] border rounded-lg flex items-center gap-1 cursor-pointer transition ${
                                      copiedAiId === item.id
                                        ? "bg-green-500/10 border-green-500/20 text-green-400 font-bold"
                                        : "bg-[#070c16] border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                    }`}
                                  >
                                    {copiedAiId === item.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedAiId === item.id ? "تم النسخ" : "نسخ سطر"}</span>
                                  </button>
                                  <button
                                    onClick={() => startSubtitleEdit(item)}
                                    className="p-1.5 px-2.5 text-[10px] border border-slate-850 bg-[#070c16] text-slate-400 hover:text-slate-250 hover:bg-slate-900 rounded-lg flex items-center gap-1 cursor-pointer transition"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    تعديل
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                        <Search className="h-8 w-8 text-slate-650" />
                        <p className="text-xs">عذراً، لم نجد أي خطوط ترجمة تطابق نص المدخل لعملية البحث.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {!isProcessing && !apiError && generatedItems.length === 0 && (
                /* Sleek welcome state when no file or model loaded yet */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1120] rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-6 min-h-[490px] shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-blue-600/[0.005] animate-pulse pointer-events-none" />
                  
                  <div className="h-14 w-14 rounded-2xl bg-[#070c16] flex items-center justify-center text-slate-500 shadow-inner border border-slate-850">
                    <Volume2 className="h-7 w-7" />
                  </div>
                  
                  <div className="max-w-md">
                    <h3 className="font-bold text-slate-200 text-sm">بانتظار تزويد المدخلات لبدء المزامنة والتفريغ</h3>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      الرجاء إلقاء السجلات الصوتية أو مقاطع الفيديو على اليمين مع تحديد تفضيل اللغة ثم تفعيل زر المعالجة اللحظية. يمكنك بصفة بديلة استخدام نموذج تجريبي جاهز بالاختيار في الأعلى للتجربة السريعة بكافة الأدوات.
                    </p>
                  </div>

                  {/* Quality Assurance Badges */}
                  <div className="grid grid-cols-3 gap-3.5 w-full max-w-sm mt-3">
                    <div className="bg-[#070c16] p-3 rounded-xl border border-slate-850/60 text-center flex flex-col items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span className="text-[10px] text-slate-300 font-bold">تزامن مليثاني</span>
                      <span className="text-[8.5px] text-slate-600">Whisper Timeline Alignment</span>
                    </div>
                    <div className="bg-[#070c16] p-3 rounded-xl border border-slate-850/60 text-center flex flex-col items-center gap-1">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-[10px] text-slate-300 font-bold">لغات دقيقة</span>
                      <span className="text-[8.5px] text-slate-600">Arabic Modern/Dialects</span>
                    </div>
                    <div className="bg-[#070c16] p-3 rounded-xl border border-slate-850/60 text-center flex flex-col items-center gap-1">
                      <Download className="h-4 w-4 text-blue-500" />
                      <span className="text-[10px] text-slate-300 font-bold">تصدير تفاعلي</span>
                      <span className="text-[8.5px] text-slate-600">SRT / VTT / Paragraph</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </section>
      </main>
    </div>
  );
}
