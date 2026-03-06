import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home/page';
import AuthLayout from './pages/auth/AuthLayout';
import SignUp from './pages/auth/SignUp';
import LogIn from './pages/auth/LogIn';
import VerifyEmail from './pages/auth/VerifyEmail';

function App() {  
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
