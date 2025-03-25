import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';

interface FirebaseError extends Error {
  code?: string;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { login, getUserRole } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      const { user } = await login(email, password);
      
      // Get user role and redirect accordingly
      const role = await getUserRole(user.uid);
      if (role === 'creator') {
        navigate('/creator-dashboard');
      } else if (role === 'brand') {
        navigate('/brand-dashboard');
      } else {
        // Handle case where role is not set
        setError('Account type not found. Please contact support.');
      }
    } catch (error) {
      console.error('Login error:', error);
      const firebaseError = error as FirebaseError;
      
      if (firebaseError.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (firebaseError.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (firebaseError.code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to log in. Please check your credentials.');
      }
    }
    setLoading(false);
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center">
            Log In
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!error && error.includes('email')}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!error && error.includes('password')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Log In
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              Need an account?{' '}
              <Link to="/signup" style={{ textDecoration: 'none' }}>
                Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 