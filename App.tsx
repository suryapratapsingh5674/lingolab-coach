import React, { useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import Orb from './components/Orb';
import { LiveStatus } from './types';

const App: React.FC = () => {
  const { connect, disconnect, status, error, volume } = useGeminiLive();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleToggle = () => {
    if (status === LiveStatus.CONNECTED || status === LiveStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const isActive = status === LiveStatus.CONNECTED;
  const isConnecting = status === LiveStatus.CONNECTING;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base Gradient */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${isActive ? 'bg-cyan-950/20' : 'bg-transparent'}`}>
           <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-blob transition-colors duration-1000 ${isActive ? 'bg-cyan-500/30' : 'bg-purple-500/20'}`}></div>
           <div className={`absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${isActive ? 'bg-blue-500/30' : 'bg-cyan-500/20'}`}></div>
           <div className={`absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full blur-[120px] animate-blob animation-delay-4000 transition-colors duration-1000 ${isActive ? 'bg-indigo-500/30' : 'bg-blue-500/20'}`}></div>
        </div>
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]"></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/30' : 'bg-gradient-to-br from-slate-700 to-slate-800 shadow-black/20'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-100">LingoLab Coach</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}></div>
                <span className="text-xs font-medium text-slate-400">
                  {isActive ? 'Session Active' : 'Ready to Learn'}
                </span>
              </div>
            </div>
         </div>
      </header>

      {/* Main Interface */}
      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-xl px-4">
        
        {/* Error Notification */}
        <div className={`absolute top-24 transition-all duration-300 transform ${showError ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2 rounded-lg backdrop-blur-md shadow-xl text-sm font-medium">
            {error}
          </div>
        </div>

        {/* Visualizer */}
        <div className="mb-16 scale-110">
             <Orb volume={volume} active={isActive} status={status} />
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2 mb-12 h-20 transition-all duration-500">
            {isActive ? (
                <div className="animate-fade-in-up">
                  <h2 className="text-3xl font-light text-slate-100 tracking-wide">Listening...</h2>
                  <p className="text-slate-400 text-base">Go ahead, I'm listening.</p>
                </div>
            ) : isConnecting ? (
                 <div className="animate-pulse">
                   <h2 className="text-3xl font-light text-slate-200">Connecting</h2>
                   <p className="text-slate-500 text-base">Preparing your English coach...</p>
                 </div>
            ) : (
                <div className="animate-fade-in-down">
                  <h2 className="text-4xl font-light text-slate-100 tracking-tight">Hello, Student</h2>
                  <p className="text-slate-400 text-lg mt-2">Ready to practice your English conversation?</p>
                </div>
            )}
        </div>

        {/* Control Button */}
        <button
          onClick={handleToggle}
          disabled={isConnecting}
          className={`
            relative group overflow-hidden rounded-full px-10 py-5 transition-all duration-300
            ${isActive 
                ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30' 
                : 'bg-cyan-500 hover:bg-cyan-400 hover:scale-105 shadow-[0_0_40px_-10px_rgba(34,211,238,0.6)]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
           <div className="flex items-center gap-3 relative z-10">
               {isConnecting ? (
                 <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
               ) : isActive ? (
                 <>
                   <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="font-semibold text-lg text-red-400">End Session</span>
                 </>
               ) : (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-900">
                     <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                     <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                   </svg>
                   <span className="font-semibold text-lg text-slate-900">Start Conversation</span>
                 </>
               )}
           </div>
        </button>

      </main>

      <footer className="absolute bottom-6 text-slate-500 text-sm font-medium tracking-wide z-20">
         Powered by Gemini Live API
      </footer>
    </div>
  );
};

export default App;