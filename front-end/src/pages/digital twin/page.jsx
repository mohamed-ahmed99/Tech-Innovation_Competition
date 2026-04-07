import React from 'react';
import DigitalTwinForm from './DigitalTwinForm';

function DigitalTwinPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-24 pb-12 px-6 relative text-zinc-100">
      <div className="max-w-4xl mx-auto mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">Step 1 of 3</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Create Your Digital Twin</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-2xl leading-relaxed">
          Enter your clinical context first. We will use it to personalize treatment suggestions after MRI analysis.
        </p>
      </div>

      <DigitalTwinForm />
    </div>
  );
}

export default DigitalTwinPage;


