import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireGuest } from './components/GuardedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskCreate from './pages/TaskCreate';
import TaskDetail from './pages/TaskDetail';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
          {/* Conditionally display Navbar */}
          <Navbar />
          
          <main className="flex-grow">
            <Routes>
              {/* Guest Only Routes */}
              <Route
                path="/login"
                element={
                  <RequireGuest>
                    <Login />
                  </RequireGuest>
                }
              />
              <Route
                path="/register"
                element={
                  <RequireGuest>
                    <Register />
                  </RequireGuest>
                }
              />

              {/* Authenticated Routes */}
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/tasks/new"
                element={
                  <RequireAuth>
                    <TaskCreate />
                  </RequireAuth>
                }
              />
              <Route
                path="/tasks/:id"
                element={
                  <RequireAuth>
                    <TaskDetail />
                  </RequireAuth>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
