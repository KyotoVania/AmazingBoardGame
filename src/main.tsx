import { createRoot } from 'react-dom/client'
import App from './App'
import { bootCustomBoard } from './game/customBoard'
import './index.css'

// Réinjecte le plateau custom de l'Atelier AVANT le premier rendu :
// l'autosave et la 3D doivent retrouver les mêmes cases.
bootCustomBoard()

// Pas de StrictMode : le reducer consomme un RNG seedable et la
// scène R3F n'aime pas le double-montage de dev.
createRoot(document.getElementById('root')!).render(<App />)
