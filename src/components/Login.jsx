import { useState, useCallback, useMemo } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router';
import { clearCache } from '../utils/cacheUtils';

const textFieldCommonProps = {
  margin: "normal",
  required: true,
  fullWidth: true,
};

const buttonProps = {
  fullWidth: true,
  variant: "contained",
  sx: { mt: 2, mb: 2 },
};

function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = useCallback((name) => (e) => {
    setCredentials(prev => ({ ...prev, [name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(getAuth(), credentials.email, credentials.password);

      clearCache(); // Clear the cache after successful login
      navigate('/track');
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      setError(error.message);
    }
  }, [credentials, navigate]);

  const isSubmitDisabled = useMemo(() => {
    return !credentials.email || !credentials.password;
  }, [credentials.email, credentials.password]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Login</Typography>
      <TextField
        {...textFieldCommonProps}
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
        value={credentials.email}
        onChange={handleChange('email')}
      />
      <TextField
        {...textFieldCommonProps}
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        value={credentials.password}
        onChange={handleChange('password')}
      />
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
      <Button
        {...buttonProps}
        type="submit"
        disabled={isSubmitDisabled}
        endIcon={<LoginIcon />}
      >
        Sign In
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          {...buttonProps}
          component={Link}
          to="/signup"
          variant="outlined"
          endIcon={<AppRegistrationIcon />}
        >
          Don't have an account? Sign Up
        </Button>
      </Box>
    </Box>
  );
}

export default Login;
