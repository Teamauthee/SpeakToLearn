"use client";

import { useState, useRef } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { checkItalianGrammar } from "../lib/languagetool";
import { KokoroTTS } from "kokoro-js";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export {};

export default function ItalianCoach() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ttsReady, setTtsReady] = useState(false);
  
  const ttsRef = useRef<any>(null);
  // Keep a persistent reference to the recognition instance across renders
  const recognitionRef = useRef<any>(null);

  // 1. Initialize Kokoro TTS
  const initTTS = async () => {
    if (ttsReady) return;
    setIsProcessing(true);
    try {
      ttsRef.current = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX');
      setTtsReady(true);
    } catch (error) {
      console.error("TTS Init Error:", error);
    }
    setIsProcessing(false);
  };

  // 2. Speak the feedback
  const speak = async (text: string) => {
    if (!ttsRef.current) return;
    const audioData = await ttsRef.current.generate(text, {
      voice: 'im_nicola',
      speed: 1.0
    });
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, audioData.audio.length, audioData.sampling_rate);
    buffer.getChannelData(0).set(audioData.audio);
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  };

  // 3. Start Recording
  const startListening = async () => {
    await initTTS();
    
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser non supportato. Usa Safari su iOS.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'it-IT';
    // continuous = true ensures it doesn't randomly cut off mid-sentence if he pauses to think
    recognition.continuous = true; 
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setFeedback("");
    };

    recognition.onresult = async (event: any) => {
      // Grab the compiled text from the speech session
      const currentResultIndex = event.resultIndex;
      const text = event.results[currentResultIndex][0].transcript;
      
      if (!text.trim()) return;

      setTranscript(text);
      setIsProcessing(true);

      // Call LanguageTool Brain
      const result = await checkItalianGrammar(text);
      setFeedback(result.message);
      
      // Speak the result out loud
      await speak(result.message);
      setIsProcessing(false);
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

  // 4. Manually Stop Recording (Forces transcription execution)
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // This triggers onresult & onend sequentially
      setIsListening(false);
    }
  };

  // Toggle controller for the button
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
            <Square className="w-12 h-12 text-white" /> // Shows a stop square when recording
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>

        <p className="text-sm text-gray-500 font-medium">
          {isListening ? "Tocca per interrompere e ricevere feedback" : isProcessing ? "Elaborazione..." : "Tocca per parlare"}
        </p>

        {transcript && (
          <div className="p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Hai detto:</p>
            <p className="text-gray-800 text-lg">"{transcript}"</p>
          </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-lg text-left ${feedback.includes("Perfetto") ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
            <p className="text-xs uppercase font-bold mb-1">Feedback:</p>
            <p className="text-lg">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  );
}