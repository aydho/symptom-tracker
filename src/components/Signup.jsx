import React, { useState, useCallback, useMemo } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import LoginIcon from '@mui/icons-material/Login';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router';

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

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = useCallback((name) => (e) => {
    setFormData(prev => ({ ...prev, [name]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/track');
    } catch (error) {
      setError(error.message);
    }
  }, [formData, navigate]);

  const isSubmitDisabled = useMemo(() => {
    const { email, password, confirmPassword } = formData;
    return !email || !password || !confirmPassword || password !== confirmPassword;
  }, [formData]);

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Sign Up</Typography>
      {['email', 'password', 'confirmPassword'].map((field) => (
        <TextField
          key={field}
          {...textFieldCommonProps}
          id={field}
          name={field}
          label={field === 'email' ? 'Email Address' : field === 'password' ? 'Password' : 'Confirm Password'}
          type={field === 'email' ? 'email' : 'password'}
          autoComplete={field === 'email' ? 'email' : 'new-password'}
          value={formData[field]}
          onChange={handleChange(field)}
          autoFocus={field === 'email'}
        />
      ))}
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
      <Button
        {...buttonProps}
        type="submit"
        disabled={isSubmitDisabled}
        endIcon={<AppRegistrationIcon />}
      >
        Sign Up
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          {...buttonProps}
          component={Link}
          to="/"
          variant="outlined"
          endIcon={<LoginIcon />}
        >
          Already have an account? Log in
        </Button>
      </Box>
    </Box>
  );
}

export default React.memo(Signup);
