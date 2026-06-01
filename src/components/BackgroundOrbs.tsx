import React from 'react';

export const BackgroundOrbs: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#FAF7F4]">
      {/* Orb 1: Rosa (Top Left) */}
      <div 
        className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#E8A5C4] opacity-25 blur-[100px] orb-animation-1"
      />
      {/* Orb 2: Lilás (Bottom Right) */}
      <div 
        className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-[#B49BD4] opacity-20 blur-[120px] orb-animation-2"
      />
      {/* Orb 3: Azul (Middle Left/Center) */}
      <div 
        className="absolute top-[40%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full bg-[#8FB8E8] opacity-20 blur-[90px] orb-animation-3"
      />
    </div>
  );
};
export default BackgroundOrbs;
