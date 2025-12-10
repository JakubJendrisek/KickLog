import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import WelcomePage from './components/welcome_page.jsx';
import AuthPage from './components/auth_page.jsx';

function Layout() {
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/welcome" replace /> },
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'auth', element: <AuthPage /> },
    ],
  },
]);

export default router;
