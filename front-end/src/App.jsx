import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthLayout from './pages/auth/AuthLayout';
import SignUp from './pages/auth/SignUp';
import LogIn from './pages/auth/LogIn';
import VerifyEmail from './pages/auth/VerifyEmail';
import { useGlobalData } from './hooks/useGlobalData';
import { useGetMethod } from './hooks/useGetMethod';
import Loading from './components/Loading';
import MainLayout from './components/MainLayout';
import ScanPage from './pages/scan/page';
import AboutPage from './pages/about/page';
import DigitalTwinPage from './pages/digital twin/page';
import Treatment3DPage from './pages/treatment3d/page';




function App() {
  const { getData, data_g, status_g, loading_g } = useGetMethod();
  const [store, setGlobalData] = useGlobalData();

  useEffect(() => {
    const token = localStorage.getItem("NeuroAi_Token");
    const verifyUser = async () => {
      if (token) {
        await getData("https://neuro-gaurd-ai-backend.vercel.app/api/auth/verify-me");
      } else {
        setGlobalData("user", null);
      }
    };
    verifyUser();
  }, []);

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
        {/* Authentication pages */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/sign-up" element={<SignUp />} />
          <Route path="/auth/login" element={<LogIn />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Main pages */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<AboutPage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/digital-twin" element={<DigitalTwinPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/model" element={<ScanPage />} />
          <Route path="/treatment-3d" element={<Treatment3DPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
