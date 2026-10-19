import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vt323/latin-400.css';
import '@fontsource/vt323/latin-ext-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import './styles.css';
import './theme.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
