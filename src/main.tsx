import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Layout } from './Layout';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <React.StrictMode>
    <Layout />
  </React.StrictMode>
);
