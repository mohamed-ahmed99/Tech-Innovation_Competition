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

const HomePage = () => {
    const [store, setGlobalData] = useGlobalData();
    
    // State for the image selection and analysis process
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [structuredResult, setStructuredResult] = useState(null);
    const [selectedOrganHint, setSelectedOrganHint] = useState('brain');

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




    const handleAnalyze = async () => {
        if (!selectedFile) return;
        
        setIsAnalyzing(true);
        
        try {
            const organHint = selectedOrganHint;
            const modalityByOrgan = {
                brain: 'mri',
                liver: 'ct',
                breast: 'xray',
            };
            const modality = modalityByOrgan[organHint] || 'mri';
            const result = await sendImageToAI(selectedFile, modality, organHint);
            setAnalysisResult(result.text);
            setStructuredResult(result.structured);
        } catch (error) {
            console.error("Error analyzing image:", error);
            const msg = error?.message || "Unknown error while analyzing the image.";
            setAnalysisResult(`Analysis failed: ${msg}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className='text-center mb-12 max-w-3xl relative z-10'
      >
        <h1 className='text-4xl md:text-6xl font-black mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent tracking-tight'>
          NeuroAI
        </h1>
        <p className='text-zinc-500 text-sm md:text-lg leading-relaxed font-medium'>
          Advanced AI system for precise medical imaging and patient digital twins enabling personalized treatment simulations
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className='grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 w-full max-w-6xl relative z-10'
      >
        {features.map((feature, index) => (
          <Link to={feature.path} key={index} className="group h-full">
            <motion.div
              variants={itemVariants}
              whileHover={{ 
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.95 }}
              className={`h-full min-h-[160px] md:min-h-[220px] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-3xl ${feature.borderColor} transition-all duration-500 flex flex-col items-center justify-center text-center relative overflow-hidden group/card shadow-2xl shadow-black/50`}
            >
              {/* Animated Glow on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
              
              {/* Decorative Corner Icon */}
              <ArrowUpRight className="absolute top-3 right-3 md:top-5 md:right-5 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 z-20" />

              <div className='relative z-10 flex flex-col items-center'>
                <div className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-3 md:mb-5 group-hover:scale-110 group-hover:bg-zinc-800 group-hover:border-white/10 transition-all duration-500 shadow-inner`}>
                  <feature.icon className={`w-5 h-5 md:w-8 md:h-8 ${feature.iconColor} group-hover:transition-transform duration-500 group-hover:rotate-6`} />
                </div>
                
                <h3 className='text-base md:text-xl font-bold text-white mb-1 md:mb-2 tracking-tight'>
                  {feature.title}
                </h3>
                
                <p className='text-zinc-500 text-[9px] md:text-xs leading-tight md:leading-normal max-w-[110px] md:max-w-none group-hover:text-zinc-300 transition-colors duration-500'>
                  {feature.description}
                </p>

                <div className="mt-6 max-w-md mx-auto rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left">
                    <label htmlFor="organ-hint" className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">
                        Target Organ Routing
                    </label>
                    <select
                        id="organ-hint"
                        value={selectedOrganHint}
                        onChange={(event) => setSelectedOrganHint(event.target.value)}
                        disabled={isAnalyzing}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-60"
                    >
                        <option value="brain">Brain</option>
                        <option value="liver">Liver</option>
                        <option value="breast">Breast</option>
                        <option value="lung" disabled>Lung (coming soon)</option>
                        <option value="kidney" disabled>Kidney (coming soon)</option>
                        <option value="prostate" disabled>Prostate (coming soon)</option>
                    </select>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                        Select the target organ directly. Lung, Kidney, and Prostate are UI placeholders for the upcoming release.
                    </p>
                </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

