import React from 'react';
import { LiveStatus } from '../types';

interface OrbProps {
  volume: number; // 0 to 1
  active: boolean;
  status: LiveStatus;
}

const Orb: React.FC<OrbProps> = ({ volume, active, status }) => {
  const isConnecting = status === LiveStatus.CONNECTING;
  const isError = status === LiveStatus.ERROR;
  
  // Visual parameters based on state
  const getStatusColor = () => {
    if (isError) return 'text-red-500 shadow-red-500/50 bg-red-500';
    if (isConnecting) return 'text-amber-400 shadow-amber-400/50 bg-amber-400';
    if (active) return 'text-cyan-400 shadow-cyan-400/50 bg-cyan-400';
    return 'text-slate-600 shadow-slate-600/50 bg-slate-600';
  };
  
  const colorClass = getStatusColor();
  const glowColor = active ? 'shadow-[0_0_80px_-20px_rgba(34,211,238,0.6)]' : 'shadow-none';

  // Dynamic scaling based on volume
  // We dampen the volume slightly so it's not too jittery, and scale it up
  const scale = active ? 1 + (volume * 0.6) : 1;
  
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Background Glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 opacity-30 ${colorClass.split(' ')[0].replace('text', 'bg')}`} />

      {/* Rotating Rings */}
      <div className={`absolute inset-0 rounded-full border border-current opacity-20 animate-[spin_10s_linear_infinite] ${colorClass.split(' ')[0]}`} />
      <div className={`absolute inset-4 rounded-full border border-dashed border-current opacity-20 animate-[spin_15s_linear_infinite_reverse] ${colorClass.split(' ')[0]}`} />
      
      {/* Connecting Spinner */}
      {isConnecting && (
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-amber-400 animate-spin opacity-80" />
      )}

      {/* Core Orb */}
      <div 
        className={`
          relative flex items-center justify-center
          w-24 h-24 rounded-full
          transition-all duration-100 ease-out
          ${colorClass}
          ${glowColor}
        `}
        style={{
          transform: `scale(${scale})`,
        }}
      >
        {/* Inner highlight */}
        <div className="absolute top-2 left-3 w-8 h-4 bg-white/30 rounded-full blur-sm -rotate-45" />
      </div>
      
      {/* Particles (CSS based) */}
      {active && (
        <>
           <div className="absolute w-full h-full animate-[spin_8s_linear_infinite]">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-2 h-2 bg-cyan-200 rounded-full blur-[1px]" />
           </div>
           <div className="absolute w-3/4 h-3/4 animate-[spin_12s_linear_infinite_reverse]">
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-1.5 h-1.5 bg-blue-200 rounded-full blur-[1px]" />
           </div>
        </>
      )}
    </div>
  );
};

export default Orb;