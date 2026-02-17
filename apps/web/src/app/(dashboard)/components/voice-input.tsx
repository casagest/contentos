"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  className?: string;
}

// Extend Window type for SpeechRecognition
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

export default function VoiceInput({ onTranscript, language = "ro-RO", className = "" }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

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
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!isSupported) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggle}
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
            : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white hover:border-white/[0.1]"
        }`}
        title={isListening ? "Oprește înregistrarea" : "Dictează (voce → text)"}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      {isListening && (
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
          <span className="text-xs text-red-300">Ascultă...</span>
        </div>
      )}
      {interim && (
        <span className="text-xs text-gray-500 italic max-w-[200px] truncate">{interim}</span>
      )}
    </div>
  );
}
