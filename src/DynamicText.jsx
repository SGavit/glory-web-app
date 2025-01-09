import React, { useState, useRef } from "react";

const DraggableChord = () => {
  const [position, setPosition] = useState({ left: 50 }); // Initial left position
  const [isDragging, setIsDragging] = useState(false); // Track dragging state
  const chordRef = useRef(null); // Reference to the chord element

  // Start dragging
  const startDragging = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Stop dragging
  const stopDragging = () => {
    setIsDragging(false);
  };

  // Handle dragging movement
  const handleDragging = (e) => {
    if (!isDragging) return;

    // Calculate new position based on mouse or touch movement
    const newLeft = e.clientX || (e.touches && e.touches[0]?.clientX);

    if (newLeft !== undefined) {
      const parentWidth = chordRef.current.parentNode.offsetWidth;
      const chordWidth = chordRef.current.offsetWidth;
      const boundedLeft = Math.max(0, Math.min(parentWidth - chordWidth, newLeft)); // Keep within bounds
      setPosition({ left: boundedLeft });
    }
  };

  return (
    <div
      style={{
        position: "relative",
        height: "200px",
        border: "1px solid #ccc",
        padding: "20px",
        touchAction: "none", // Prevent browser scroll interference
      }}
      onMouseMove={handleDragging}
      onMouseUp={stopDragging}
      onTouchMove={handleDragging}
      onTouchEnd={stopDragging}
    >
      {/* Draggable chord */}
      <div
        ref={chordRef}
        style={{
          position: "absolute",
          top: "50px",
          left: `${position.left}px`,
          fontSize: "24px",
          fontWeight: "bold",
          color: "red",
          cursor: "grab",
        }}
        onMouseDown={startDragging}
        onTouchStart={startDragging}
      >
        Db
      </div>

      {/* Song lyrics */}
      <div style={{ textAlign: "center", marginTop: "100px", fontSize: "20px" }}>
        When the oceans rise, this is the text.
      </div>
    </div>
  );
};

export default DraggableChord;

