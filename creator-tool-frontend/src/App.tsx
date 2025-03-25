import React, { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import PrivateRoute from './components/PrivateRoute';
import BrandDashboard from './components/BrandDashboard';
import CreatorDashboard from './components/CreatorDashboard';
import { Container } from '@mui/material';

interface RoleRouteProps {
  children: ReactNode;
  allowedRole: string;
}

// Role-based route component
const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRole }) => {
  const { userRole } = useAuth();
  
  if (userRole === allowedRole) {
    return <>{children}</>;
  }
  
  // Redirect to the appropriate dashboard or login
  if (userRole) {
    return <Navigate to={`/${userRole}-dashboard`} />;
  }
  
  return <Navigate to="/login" />;
}

const App: React.FC = () => {
  return (
    <Container>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            
            {/* Creator routes */}
            <Route
              path="/creator-dashboard"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRole="creator">
                    <CreatorDashboard />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Brand routes */}
            <Route
              path="/brand-dashboard"
              element={
                <PrivateRoute>
                  <RoleRoute allowedRole="brand">
                    <BrandDashboard />
                  </RoleRoute>
                </PrivateRoute>
              }
            />

            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </Container>
  );
}

export default App; 