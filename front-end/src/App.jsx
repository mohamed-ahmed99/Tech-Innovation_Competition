// react
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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



function App() {
  const { getData, data_g, status_g, loading_g } = useGetMethod();
  const [store, setGlobalData] = useGlobalData();

  useEffect(() => {
    const token = localStorage.getItem("NeuroAi_Token");
    const verifyUser = async () => {
      if (token) {
        // Uses same-origin /api so Vercel rewrites can proxy correctly in production.
        const API_BASE_DEV = "http://localhost:5150";
        const API_BASE_PROD = "https://neuro-gaurd-ai-backend.vercel.app";
        await getData(`${API_BASE_PROD}/api/auth/verify-me`);
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

        {/* Main pages */}
        <Route element={<MainLayout />} >
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/about-us" element={<AboutPage />} />
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
