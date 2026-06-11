import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Pas de StrictMode : le reducer consomme un RNG seedable et la
// scène R3F n'aime pas le double-montage de dev.
createRoot(document.getElementById('root')!).render(<App />)
