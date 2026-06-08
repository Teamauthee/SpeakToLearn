"use client";

import { useState, useRef } from "react";
import { Mic, Loader2, Play } from "lucide-react";
import { checkItalianGrammar } from "../lib/languagetool";
import { KokoroTTS } from "kokoro-js";

export default function ItalianCoach() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [ttsReady, setTtsReady] = useState(false);
  
  const ttsRef = useRef<any>(null);

  // 1. Initialize Kokoro TTS on first interaction
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

  // 2. Speak the feedback using Web Audio API
  const speak = async (text: string) => {
    if (!ttsRef.current) return;
    const audioData = await ttsRef.current.generate(text, {
      voice: 'im_nicola', // Italian male voice
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

  // 3. Handle the iOS Web Speech API
  const startListening = async () => {
    await initTTS(); // Ensure audio context unlocks on tap
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser non supportato. Usa Safari su iOS.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback("");
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      setIsProcessing(true);

      // Call LanguageTool
      const result = await checkItalianGrammar(text);
      setFeedback(result.message);
      
      // Speak the result
      await speak(result.message);
      setIsProcessing(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">Italian Coach</h1>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center space-y-6">
        
        <button 
          onClick={startListening}
          disabled={isListening || isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto transition-all ${
            isListening ? "bg-red-500 animate-pulse" : 
            isProcessing ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600 shadow-xl"
          }`}
        >
          {isProcessing ? <Loader2 className="w-12 h-12 text-white animate-spin" /> : 
           isListening ? <Mic className="w-12 h-12 text-white" /> : 
           <Play className="w-12 h-12 text-white ml-2" />}
        </button>

        <p className="text-sm text-gray-500 font-medium">
          {isListening ? "Ascoltando..." : isProcessing ? "Elaborazione..." : "Tocca per parlare"}
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