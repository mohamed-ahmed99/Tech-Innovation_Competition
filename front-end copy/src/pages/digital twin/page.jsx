import React from 'react';
import DigitalTwinForm from './DigitalTwinForm';

function page() {

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-32 pb-20 container-padding relative overflow-hidden">
      <div className="hero-grid-bg" />
      <div className="relative z-10">
        <DigitalTwinForm />
      </div>
    </div>
  );
}

export default page;


