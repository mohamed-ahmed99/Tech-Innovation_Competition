// react
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// hooks
import { useGlobalData } from './hooks/useGlobalData';
import { useGetMethod } from './hooks/useGetMethod';
import Loading from './components/Loading';


// layouts
import MainLayout from './components/MainLayout';
import AuthLayout from './pages/auth/AuthLayout';

// authenticated pages
import LogIn from './pages/auth/LogIn';
import SignUp from './pages/auth/SignUp';
import VerifyEmail from './pages/auth/VerifyEmail'


// main pages
import ScanPage from './pages/scan/page';
import AboutPage from './pages/about/page';
import Simulation3DPage from './pages/simulation3d/page';
import DigitalTwinPage from './pages/digital twin/page';
import HomePage from './pages/home/page';


function App() {
  const { getData, data_g, status_g, loading_g } = useGetMethod();
  const [store, setGlobalData] = useGlobalData();

  useEffect(() => {
    const token = localStorage.getItem("NeuroAi_Token");
    const verifyUser = async () => {
      if (token) {
        // Uses Vercel proxy rewrite to reach the DigitalOcean backend

        // http://localhost:5150/api/auth/verify-me
        // https://neuro-gaurd-ai-backend.vercel.app/api/auth/verify-me
        await getData("https://neuro-gaurd-ai-backend.vercel.app/api/auth/verify-me");
      } else {
        setGlobalData("user", null);
      }
    }
    verifyUser();
  }, []);

  console.log({ data_g, status_g, loading_g, store });

  useEffect(() => {
    if (status_g === "success") {
      setGlobalData("user", data_g?.user);
    } else if (status_g === "fail") {
      setGlobalData("user", null);
    }
  }, [data_g, status_g, setGlobalData]);

  // Use status_g and store.user to check if initial verification is truly done
  // We wait until status is not idle AND the store has been updated (not undefined)
  const isUserDetermined = store.hasOwnProperty('user');

  if (loading_g || !isUserDetermined) {
    return <Loading />;
  }

  return (
    <Router>
      <Routes>

        {/* Home page */}

        {/* Main pages */}
        <Route element={<MainLayout />} >
          <Route path="/" element={<HomePage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/simulation-3d" element={<Simulation3DPage />} />
          <Route path="/digital-twin" element={<DigitalTwinPage />} />
        </Route>


        {/* Authentication Pages */}
        <Route element={<AuthLayout />} >
          <Route path="/auth/sign-up" element={<SignUp />} />
          <Route path="/auth/login" element={<LogIn />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
        </Route>

      </Routes>
    </Router>
  )
}

export default App
