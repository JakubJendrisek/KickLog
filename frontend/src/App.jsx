import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import WelcomePage from './components/welcome_page.jsx';
import AuthPage from './components/auth_page.jsx';
import MainPage from './components/main_page/main_page.jsx';

function Layout() {
  return (
    <div
      className="min-h-screen w-full bg-white text-slate-900 antialiased"
      data-app="kicklog"
      style={{
        transitionProperty: 'background-color, color',
        transitionDuration: 'var(--theme-dur, 820ms)', // was 320ms
        transitionTimingFunction: 'var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1))',

        ['--theme-dur']: '820ms',
        ['--theme-ease']: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        ['--collapse-dur']: '320ms',
        ['--collapse-ease']: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        ['--accent-green']: '#16a34a', // emerald-600
        ['--accent-green-soft']: '#bbf7d0', // emerald-200
      }}
    >
      <Outlet />
    </div>
  );
}

// Router definition for the app
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/welcome" replace /> },
      { path: 'main', element: <MainPage /> },
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'auth', element: <AuthPage /> },
    ],
  },
]);

export default router;

// Layout stays neutral; sidebar handles its own header alignment.
// (no functional change) keep --collapse-dur/--collapse-ease available app-wide
