import React, { useState } from 'react';

// Floating YouTube Player component
const FloatingYouTubePlayer = () => {
  const [showPlayer, setShowPlayer] = useState(false);
  
  // Function to toggle the video player visibility
  const togglePlayer = () => {
    setShowPlayer(!showPlayer);
  };

  return (
    <div>
      {/* Button to toggle the player */}
      <button 
        style={floatingButtonStyle} 
        onClick={togglePlayer}
      >
        🎥
      </button>

      {/* Floating YouTube player */}
      {showPlayer && (
        <div style={floatingPlayerStyle}>
            <button onClick={togglePlayer} style={{ ...closeButtonStyle, position: 'absolute', top: '5px', right: '5px' }}>
      ✖
    </button>
          <iframe
            width="300"
            height="169"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Replace with your YouTube video URL
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

// Styles for the floating button and player
const floatingButtonStyle = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  padding: '10px',
  fontSize: '30px',
  backgroundColor: '#FF0000',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
};

const floatingPlayerStyle = {
  position: 'fixed',
  bottom: '80px',
  right: '20px',
  zIndex: '1000',
  border: '2px solid #FF0000',
  borderRadius: '10px',
};

const closeButtonStyle = {
    padding: '5px',
    fontSize: '20px',
    backgroundColor: '#FF0000',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
  };
export default FloatingYouTubePlayer;
