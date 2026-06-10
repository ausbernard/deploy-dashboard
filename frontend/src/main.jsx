import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StatusCard from './StatusCard.jsx'

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StatusCard />
  </StrictMode>
);