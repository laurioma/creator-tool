import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel
} from '@mui/material';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [accountType, setAccountType] = useState('creator');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError('Please enter a valid email address');
    }

    // Validate password length
    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (!displayName.trim()) {
      return setError('Display name is required');
    }

    try {
      setError('');
      setLoading(true);
      
      // Create the user account
      const { user } = await signup(email, password);
      
      // Update the user's profile with display name and custom claims
      await updateUserProfile(user, {
        displayName: displayName,
        photoURL: null,
        accountType: accountType
      });

      // Navigate to the appropriate dashboard based on account type
      navigate(accountType === 'creator' ? '/creator-dashboard' : '/brand-dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please try logging in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Email/password accounts are not enabled. Please contact support.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to create an account. Please try again.');
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
            Sign Up
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
              <FormLabel component="legend">Account Type</FormLabel>
              <RadioGroup
                row
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <FormControlLabel 
                  value="creator" 
                  control={<Radio />} 
                  label="Creator" 
                />
                <FormControlLabel 
                  value="brand" 
                  control={<Radio />} 
                  label="Business/Brand" 
                />
              </RadioGroup>
            </FormControl>

            <TextField
              margin="normal"
              required
              fullWidth
              id="displayName"
              label={accountType === 'creator' ? "Creator Name" : "Business Name"}
              name="displayName"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={!!error && error.includes('name')}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!error && error.includes('email')}
              helperText={error && error.includes('email') ? error : ''}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!error && error.includes('password')}
              helperText="Password must be at least 6 characters long"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password-confirm"
              label="Confirm Password"
              type="password"
              id="password-confirm"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              error={!!error && error.includes('Passwords do not match')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Sign Up as {accountType === 'creator' ? 'Creator' : 'Business'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Log In
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 