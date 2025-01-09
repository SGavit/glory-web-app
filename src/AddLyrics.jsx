import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useDrag, useDrop } from "react-dnd";

const AddLyrics = () => {
  // State to hold the lyrics and selected chord
  const [lyrics, setLyrics] = useState("");
  const [selectedChord, setSelectedChord] = useState("Db");

  // Chord options
  const chords = ["Db", "Fm", "Ab", "Eb"];

  // Handle changes to the lyrics textarea
  const handleLyricsChange = (e) => {
    setLyrics(e.target.value);
  };

  // Define the Drag source for Chords
  const Chord = ({ chord }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "CHORD",
      item: { chord },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    return (
      <Button
        ref={drag}
        style={{
          margin: "5px",
          opacity: isDragging ? 0.5 : 1,
        }}
        variant="secondary"
      >
        {chord}
      </Button>
    );
  };

  // Define the Drop target for the Textarea
  const [, drop] = useDrop(() => ({
    accept: "CHORD",
    drop: (item, monitor) => {
      // Get cursor position where the chord is dropped
      const cursorPosition = monitor.getClientOffset();
      const textAreaElement = document.getElementById("lyricsTextarea");
      const cursorIndex = textAreaElement.selectionStart;

      // Insert chord at the cursor position
      const newLyrics =
        lyrics.slice(0, cursorIndex) + item.chord + " " + lyrics.slice(cursorIndex);
      setLyrics(newLyrics);
    },
  }));

  // Save lyrics (you can replace with your save logic)
  const saveLyrics = () => {
    localStorage.setItem("lyrics", lyrics);
    alert("Lyrics saved!");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Add Lyrics with Chords (Drag & Drop to Textarea)</h2>

      {/* Chord Selection (Draggable) */}
      <div style={{ marginBottom: "20px" }}>
        {chords.map((chord) => (
          <Chord key={chord} chord={chord} />
        ))}
      </div>

      {/* Textarea to Input Lyrics (Drop Target) */}
      <Form>
        <Form.Group controlId="lyricsTextarea">
          <Form.Label>Enter Lyrics</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={lyrics}
            onChange={handleLyricsChange}
            placeholder="Paste your lyrics here"
            id="lyricsTextarea"
            ref={drop} // Make the textarea a drop target
          />
        </Form.Group>
      </Form>

      {/* Save Button */}
      <div style={{ marginTop: "20px" }}>
        <Button variant="primary" onClick={saveLyrics}>
          Save Lyrics
        </Button>
      </div>
    </div>
  );
};

export default AddLyrics;
