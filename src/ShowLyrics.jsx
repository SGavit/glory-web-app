import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const ShowLyrics = () => {
  const navigate = useNavigate();
  const [lyrics, setLyrics] = useState([]);

  // Load saved lyrics from localStorage
  useEffect(() => {
    const savedLyrics = localStorage.getItem("lyrics");
    if (savedLyrics) {
      setLyrics(JSON.parse(savedLyrics));
    }
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Show Lyrics</h2>

      {/* Display lyrics with chords */}
      <div>
        {lyrics.map((line, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            <strong>
              {line.chords.join(" ")} {/* Display chords above the line */}
            </strong>
            <br />
            {line.text}
          </div>
        ))}
      </div>

      {/* Edit Button */}
      <div style={{ marginTop: "20px" }}>
        <Button variant="primary" onClick={() => navigate("/edit-lyrics")}>
          Edit
        </Button>
      </div>
    </div>
  );
};

export default ShowLyrics;
