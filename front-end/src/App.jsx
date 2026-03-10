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
function App() {
  const { getData, data_g, status_g, error_g, isLoading_g } = useGetMethod();
  const [store, setGlobalData] = useGlobalData();





  useEffect(() => {
    const verifyUser = async () => {
      await getData("http://localhost:5150/api/auth/verify-me");
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

  if (isLoading_g) {
    return <Loading />;
  }

  return (
    <Router>
      <Routes>

        {/* Home Page */}
        <Route path="/" element={<HomePage />} />

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
