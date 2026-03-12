import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img 
    src="/supernova-logo.png" 
    alt="SuperNova AI Logo" 
    className={className}
    referrerPolicy="no-referrer"
  />
);
