import React from 'react';
import TeamSection from './TeamSection';
import ProjectVision from './ProjectVision';

function HomePage() {
    return (
        <div className="bg-zinc-950 min-h-screen">
            <ProjectVision />
            <TeamSection />
        </div>
    );
}


export default HomePage;
