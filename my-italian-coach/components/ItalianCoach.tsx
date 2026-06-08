"use client";

import { useState, useRef } from "react";
import { Mic, Loader2, Square } from "lucide-react";

export default function ItalianCoach() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  
  const recognitionRef = useRef<any>(null);

  // 1. Native iOS Speech Synthesis
  const speak = (textToSpeak: string) => {
    // Cancel any currently speaking audio
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9; // Slightly slower to help him hear the pronunciation clearly
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // 2. Start Recording
  const startListening = () => {
    // 'Unlock' the iOS speech synthesis engine on the initial user tap
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser non supportato. Usa Safari su iOS.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'it-IT';
    recognition.continuous = true; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setFeedback("");
    };

    recognition.onresult = async (event: any) => {
      const currentResultIndex = event.resultIndex;
      const text = event.results[currentResultIndex][0].transcript;
      
      if (!text.trim()) return;

      setTranscript(text);
      setIsProcessing(true);

      try {
        // Call Groq LLM Brain via Next.js API
        const response = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        const result = await response.json();
        setFeedback(result.message);
        
        // Instantly speak the result
        speak(result.message);
      } catch (error) {
        console.error("API Error:", error);
        setFeedback("Scusa, c'è stato un errore di connessione.");
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (err: any) => {
      console.error("Speech Error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // 3. Manually Stop Recording
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">Italian Coach</h1>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center space-y-6">
        
        <button 
          onClick={handleMicClick}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-all ${
            isListening ? "bg-red-500 shadow-inner" : 
            isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600 shadow-xl"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          ) : isListening ? (
            <Square className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>

        <p className="text-sm text-gray-500 font-medium">
          {isListening ? "Tocca per interrompere e ricevere feedback" : isProcessing ? "L'insegnante sta pensando..." : "Tocca per parlare"}
        </p>

        {transcript && (
          <div className="p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hai detto:</p>
            <p className="text-gray-800 text-lg">"{transcript}"</p>
          </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-lg text-left ${feedback.includes("Perfetto") ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
            <p className="text-xs uppercase font-bold mb-1">Feedback:</p>
            <p className="text-lg">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}