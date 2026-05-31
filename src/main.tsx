import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameView } from './components/GameView';
import './styles/game.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameView />
  </React.StrictMode>,
);
