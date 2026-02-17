"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  className?: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// Waveform bars — pulsează când înregistrezi
function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0.3, 0.6, 1, 0.7, 0.4, 0.8, 0.5, 0.9].map((scale, i) => (
        <motion.div
          key={i}
          className="w-0.5 rounded-full bg-emerald-400/90"
          animate={
            active
              ? {
                  height: [6, 14, 8, 16, 10, 12, 6, 14],
                  opacity: [0.6, 1, 0.8, 1, 0.7, 1, 0.6, 1],
                }
              : { height: 6, opacity: 0.4 }
          }
          transition={{
            duration: 0.8,
            repeat: active ? Infinity : 0,
            delay: i * 0.06,
            ease: "easeInOut",
          }}
          style={{ height: 6 }}
        />
      ))}
    </div>
  );
}

export default function VoiceInput({
  onTranscript,
  language = "ro-RO",
  className = "",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterim("");
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterim("");
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  if (!isSupported) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
          isListening
            ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:border-white/20 hover:text-white hover:bg-white/[0.08]"
        }`}
        title={isListening ? "Oprește dictarea" : "Dictare vocală (voce → text)"}
      >
        {isListening ? (
          <Square className="w-4 h-4 fill-current" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        {isListening && (
          <span className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-ping opacity-30" />
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex items-center gap-3"
          >
            <VoiceWaveform active={true} />
            <span className="text-xs font-medium text-emerald-400/90">
              {interim ? "Transcriu..." : "Ascult..."}
            </span>
          </motion.div>
        )}
        {interim && isListening && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-emerald-300/80 italic max-w-[200px] truncate"
          >
            «{interim}»
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
