import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Scan, 
  Box, 
  UserCircle2, 
  Info, 
  ArrowUpRight
} from 'lucide-react';

// features array
const features = [
  {
    title: 'Scan',
    description: 'AI-powered neuroimaging analysis.',
    icon: Scan,
    path: '/scan',
    color: 'from-blue-600/20 to-cyan-600/20',
    borderColor: 'group-hover:border-blue-500/50',
    iconColor: 'text-blue-400'
  },
  {
    title: 'Simulation',
    description: '3D neurological data visualization.',
    icon: Box,
    path: '/simulation-3d',
    color: 'from-purple-600/20 to-fuchsia-600/20',
    borderColor: 'group-hover:border-purple-500/50',
    iconColor: 'text-purple-400'
  },
  {
    title: 'Digital Twin',
    description: 'Virtual health modeling dashboard.',
    icon: UserCircle2,
    path: '/digital-twin',
    color: 'from-emerald-600/20 to-teal-600/20',
    borderColor: 'group-hover:border-emerald-500/50',
    iconColor: 'text-emerald-400'
  },
  {
    title: 'About',
    description: 'Our mission and technology.',
    icon: Info,
    path: '/about-us',
    color: 'from-amber-600/20 to-orange-600/20',
    borderColor: 'group-hover:border-amber-500/50',
    iconColor: 'text-amber-400'
  }
];


// framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// framer motion variants
const itemVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
};




// home page component
export default function HomePage() {
  return (
    <div className='hero-container min-h-[calc(100vh-64px)] flex flex-col items-center justify-center container-padding relative overflow-hidden'>
      {/* Background Elements */}
      <div className="hero-gradient-overlay" />
      <div className="hero-grid-bg" />

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className='text-center mb-20 max-w-3xl relative z-10'
      >
        <h1 className='hero-title-redesign'>
          NeuroGaurd
        </h1>
        <p className='hero-subtitle-redesign'>
          Advanced medical AI platform for brain tumor detection, 3D neurological simulation, and patient digital twin treatment recommendations.
        </p>
        
        <div className="flex items-center justify-center gap-4">
             <Link to="/auth/login" className="btn-primary">Get Started</Link>
             <Link to="/about-us" className="btn-secondary">Learn More</Link>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className='responsive-grid w-full max-w-7xl relative z-10'
      >
        {features.map((feature, index) => (
          <Link to={feature.path} key={index} className="group">
            <motion.div
              variants={itemVariants}
              className="card-redesign h-full flex flex-col items-start text-left relative overflow-hidden"
            >
              <div className="icon-container-redesign">
                <feature.icon size={24} />
              </div>
              
              <div className="flex justify-between items-start w-full mb-4">
                <h3 className="card-title m-0">
                  {feature.title}
                </h3>
                <ArrowUpRight size={18} className="icon-arrow-redesign" />
              </div>
              
              <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <div className="mt-auto flex items-center gap-2 text-[10px] font-medium tracking-widest text-[var(--accent-primary)] uppercase">
                Explore Module
                <div className="w-8 h-px bg-[var(--accent-primary)] opacity-30"></div>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

