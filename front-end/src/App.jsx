import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home/page';
import AuthLayout from './pages/auth/AuthLayout';
import SignUp from './pages/auth/SignUp';
import LogIn from './pages/auth/LogIn';
import VerifyEmail from './pages/auth/VerifyEmail';
import { useGlobalData } from './hooks/useGlobalData';
import { useGetMethod } from './hooks/useGetMethod';
import Loading from './components/Loading';
import MainLayout from './components/MainLayout';
import AboutPage from './pages/about/page';




function App() {
  const { getData, data_g, status_g, loading_g } = useGetMethod();
  const [store, setGlobalData] = useGlobalData();

  useEffect(() => {
    const token = localStorage.getItem("NeuroAi_Token");
    const verifyUser = async () => {
      if (token) {
        // Uses Vercel proxy rewrite to reach the DigitalOcean backend
        await getData("/api/auth/verify-me");
      } else {
        setGlobalData("user", null);
      }
    }
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

        {/* Authentication Pages */}
        <Route element={<AuthLayout />} >
          <Route path="/auth/sign-up" element={<SignUp />} />
          <Route path="/auth/login" element={<LogIn />} />
          <Route path="/auth/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Main pages */}
        <Route element={<MainLayout />} >
          <Route path="/" element={<HomePage />} />
          <Route path="/about-us" element={<AboutPage />} />
        </Route>

      </Routes>
    </Router>
  )
}

export default App
