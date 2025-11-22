import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LiveStatus } from '../types';
import { base64ToBytes, pcmToAudioBuffer, createPcmBlob } from '../utils/audio';

export const useGeminiLive = () => {
  const [status, setStatus] = useState<LiveStatus>(LiveStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);

  // Audio Contexts and Nodes
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Timing for gapless playback
  const nextStartTimeRef = useRef<number>(0);

  // Animation frame for volume visualization
  const animationFrameRef = useRef<number | null>(null);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      setError("API Key not found in environment.");
      return;
    }

    try {
      setStatus(LiveStatus.CONNECTING);
      setError(null);

      // 1. Initialize Audio Contexts
      // Input: 16kHz for Gemini compatibility
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for high quality response
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Setup Analysers for Visualization
      inputAnalyserRef.current = inputContextRef.current.createAnalyser();
      outputAnalyserRef.current = outputContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current.fftSize = 256;
      // Smoothing for smoother visuals
      inputAnalyserRef.current.smoothingTimeConstant = 0.5;
      outputAnalyserRef.current.smoothingTimeConstant = 0.5;

      // 3. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are "LingoLab Coach," an expert, patient, and highly professional English-speaking tutor. Your persona is encouraging, but firm on accuracy.

GOAL: Facilitate natural, topic-based conversation (role-play, current events, daily life) to maximize the user's speaking time and confidence.

VOICE & TONE GUIDANCE: Your dialogue must be extremely clear, articulate, and use a consistent, standard North American or British English (neutral accent). Speak in short, concise turns to maintain a fast pace (2-3 sentences max).

ERROR CORRECTION PROTOCOL (MANDATORY):

Do not interrupt. Wait for the user to complete their thought or sentence.

Correct immediately after the user's turn if they make a significant grammatical, syntax, or pronunciation-impacting error.

Format the correction clearly: Provide the correct version of the user's sentence, followed by a brief, one-sentence explanation of the error (e.g., tense, article usage, word order).

Example of Correction:
User: "Yesterday I go to the bank for money."
Your Response: "I see. You are describing a past action, so remember to use the simple past tense. The correct sentence is: 'Yesterday, I went to the bank for money.' Now, tell me, why did you need to go to the bank?"`,
        },
      };

      // 4. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: config.model,
        config: config.config,
        callbacks: {
          onopen: async () => {
            console.log("Gemini Live Connected");
            setStatus(LiveStatus.CONNECTED);
            
            // Start Audio Input Stream
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              
              if (!inputContextRef.current) return;

              const source = inputContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              scriptProcessorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
              
              // Connect for visualization
              source.connect(inputAnalyserRef.current!);

              // Connect for processing
              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(inputContextRef.current.destination);

              scriptProcessorRef.current.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                
                // Use sessionPromise to ensure we use the connected session
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

            } catch (err) {
              console.error("Microphone access denied or error:", err);
              setError("Microphone access required.");
              disconnect();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputContextRef.current && outputAnalyserRef.current) {
                const ctx = outputContextRef.current;
                const audioBuffer = await pcmToAudioBuffer(
                  base64ToBytes(base64Audio),
                  ctx,
                  24000,
                  1
                );
                
                // Schedule Playback
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                // Connect to Analyser (for visuals) and Destination (speakers)
                source.connect(outputAnalyserRef.current);
                outputAnalyserRef.current.connect(ctx.destination);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                // Track source for cleanup
                sourcesRef.current.add(source);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                };
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
                 console.log("Interrupted");
                 sourcesRef.current.forEach(source => {
                     try { source.stop(); } catch(e) {} // ignore errors on already stopped sources
                 });
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setStatus(LiveStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setError("Connection error occurred.");
            setStatus(LiveStatus.ERROR);
            disconnect();
          }
        }
      });
      
    } catch (err: any) {
      console.error("Setup error:", err);
      setError(err.message || "Failed to start session");
      setStatus(LiveStatus.ERROR);
      disconnect();
    }
  }, []);

  const disconnect = useCallback(() => {
    // 1. Close Microphone Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 2. Disconnect ScriptProcessor
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }

    // 3. Stop all playing sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();

    // 4. Close Audio Contexts
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }

    // 5. Reset State
    setStatus(LiveStatus.DISCONNECTED);
    nextStartTimeRef.current = 0;
  }, []);

  // Volume Visualization Loop
  useEffect(() => {
    const updateVolume = () => {
        let maxVol = 0;
        
        // Check input volume (User)
        if (inputAnalyserRef.current) {
            const data = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
            inputAnalyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b) / data.length;
            if (avg > maxVol) maxVol = avg;
        }

        // Check output volume (AI)
        if (outputAnalyserRef.current) {
            const data = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
            outputAnalyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b) / data.length;
            if (avg > maxVol) maxVol = avg;
        }

        // Normalize
        const normalized = Math.min(1, (maxVol / 100)); // Sensitized for speech
        
        setVolume(normalized); 
        animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    if (status === LiveStatus.CONNECTED) {
        updateVolume();
    } else {
        setVolume(0);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status]);

  return {
    connect,
    disconnect,
    status,
    error,
    volume,
  };
};