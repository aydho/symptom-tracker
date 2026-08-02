import React, { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router';
import { auth } from './firebase';
import Signup from './components/Signup.jsx';
import Login from './components/Login.jsx';
import Logout from './components/Logout.jsx';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, ListItemText, useMediaQuery, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ListItemButton from '@mui/material/ListItemButton';
import ClearCacheButton from './components/ClearCacheButton.jsx';
import { clearCache } from './utils/cacheUtils';  // Import the clearCache function
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enAU } from 'date-fns/locale';

// Lazy load heavy components
const SymptomTracker = lazy(() => import('./components/SymptomTracker.jsx'));
const SymptomAnalysis = lazy(() => import('./components/SymptomAnalysis.jsx'));
const SymptomTable = lazy(() => import('./components/SymptomTable.jsx'));
const DynamicFieldsManager = lazy(() => import('./components/DynamicFieldsManager.jsx'));

const typographySx = { flexGrow: 1 };
const userEmailSx = { marginRight: 1 };
const navButtonSx = { marginRight: 0 };

const NavButton = memo(({ to, children }) => (
  <Button color="inherit" component={Link} to={to} sx={navButtonSx}>
    {children}
  </Button>
));

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
    <CircularProgress />
  </Box>
);

// New function to clear cache and refresh
const clearCacheAndRefresh = () => {
  clearCache();
  window.location.reload();
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth error:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleDrawer = useCallback((open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  }, []); // Empty dependency array as it doesn't depend on any props or state

  const renderProtectedRoute = useCallback((path, Component) => (
    <Route 
      key={path}
      path={path} 
      element={
        user ? (
          <Suspense fallback={<LoadingFallback />}>
            <Component user={user} />
          </Suspense>
        ) : (
          <Navigate to="/" replace />
        )
      } 
    />
  ), [user]);

  const routes = useMemo(() => (
    <>
      <Route path="/" element={user ? <Navigate to="/track" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/track" replace /> : <Signup />} />
      {renderProtectedRoute("/track", SymptomTracker)}
      {renderProtectedRoute("/analyse", SymptomAnalysis)}
      {renderProtectedRoute("/table", SymptomTable)}
      {renderProtectedRoute("/config", DynamicFieldsManager)}
    </>
  ), [user, renderProtectedRoute]);

  const navItems = useMemo(() => [
    { text: 'Track', path: '/track' },
    { text: 'Analyse', path: '/analyse' },
    { text: 'History', path: '/table' },
    { text: 'Questions', path: '/config' },
    { text: 'Refresh', action: clearCacheAndRefresh },
  ], []);

  const navList = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            {item.path ? (
              <ListItemButton component={Link} to={item.path}>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ) : (
              <ListItemButton onClick={item.action}>
                <ListItemText primary={item.text} />
              </ListItemButton>
            )}
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={() => auth.signOut()}>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const navButtons = useMemo(() => (
    user && (
      <>
        <Typography variant="body2" sx={userEmailSx}>
          {user.email}
        </Typography>
        {isMobile ? (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
        ) : (
          <>
            {navItems.map((item) => (
              item.path ? (
                <NavButton key={item.text} to={item.path}>{item.text}</NavButton>
              ) : (
                <ClearCacheButton key={item.text} onClick={item.action} />
              )
            ))}
            <Logout />
          </>
        )}
      </>
    )
  ), [user, isMobile, navItems, toggleDrawer]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enAU}>
      <Router>
          <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" component="div" sx={typographySx}>
                  Symptom Tracker
                </Typography>
                {navButtons}
              </Toolbar>
            </AppBar>
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={toggleDrawer(false)}
            >
              {navList}
            </Drawer>
            <Routes>{routes}</Routes>
          </Box>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default React.memo(App);
