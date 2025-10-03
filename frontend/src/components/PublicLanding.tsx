/**
 * Public Landing Component
 * Landing page with app information and login button
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function PublicLanding() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Simplified login - just click to login as test user
      await login('testuser', 'password');
      navigate('/campaigns');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Wrldbldr MCP Manager</h1>
      <p>TTRPG Campaign Management - No More "Plan Twice" Problem</p>

      <div style={{ marginTop: '2rem' }}>
        <h2>Features</h2>
        <ul>
          <li>Manage multiple campaigns</li>
          <li>Card-based content organization with rich text editing</li>
          <li>Database cards (tables, lists, galleries, kanban)</li>
          <li>Information filtering for GM/Player views</li>
          <li>Public campaign sharing with password protection</li>
          <li>BYOLLM configuration (bring your own LLM credentials)</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoggingIn ? 'Logging in...' : 'Login (Test User)'}
        </button>
      </div>

      <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
        <p>
          This is a local prototype running on localhost. All data is stored in SQLite.
        </p>
      </div>
    </div>
  );
}
