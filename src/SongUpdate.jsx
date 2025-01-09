import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, update } from "firebase/database";
import { Button, Form, Container, Spinner } from "react-bootstrap";
import { FaEdit } from 'react-icons/fa'; // Import the edit icon

function SongUpdate() {
  const { id } = useParams(); // Get the song id from the URL
  const navigate = useNavigate();
  const [song, setSong] = useState({
    songNo: "",
    songTitle: "",
    songContent: "",
    songCategory: "",
    songYoutubeID: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch song data by id to edit
  useEffect(() => {
    const db = getDatabase();
    const songRef = ref(db, `songs/${id}`);

    get(songRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setSong(snapshot.val());
        } else {
          console.error("Song not found.");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [id]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSong((prevSong) => ({
      ...prevSong,
      [name]: value,
    }));
  };

  // Handle form submission to update song
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const db = getDatabase();
    const songRef = ref(db, `songs/${id}`);

    const updatedSong = {
      songNo: song.songNo, // Keep songNo the same since it's being updated
      songTitle: song.songTitle,
      songContent: song.songContent,
      songCategory: song.songCategory,
      songYoutubeID: song.songYoutubeID || "",
    };

    // Update the song data in Firebase
    update(songRef, updatedSong)
      .then(() => {
        alert("Song updated successfully!");
        navigate(`/songs/${id}`);
      })
      .catch((error) => {
        console.error("Error updating song:", error);
        alert("Failed to update song.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" role="status" />
        <p>Loading song data...</p>
      </div>
    );
  }

  return (
    <Container className="mt-4">
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="songTitle" className="mb-3">
          <Form.Label>Song Title</Form.Label>
          <Form.Control
            type="text"
            name="songTitle"
            value={song.songTitle}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group controlId="songNo" className="mb-3">
          <Form.Label>Song No</Form.Label>
          <Form.Control
            type="text"
            name="songNo"
            value={song.songNo}
            onChange={handleChange}
            disabled
          />
        </Form.Group>

        <Form.Group controlId="songContent" className="mb-3">
          <Form.Label>Song Content</Form.Label>
          <Form.Control
            as="textarea"
            rows={5}
            name="songContent"
            value={song.songContent}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group controlId="songCategory" className="mb-3">
          <Form.Label>Category</Form.Label>
          <Form.Control
            as="select"
            name="songCategory"
            value={song.songCategory}
            onChange={handleChange}
            required
          >
            <option value="">Select Category</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Worship">Worship</option>
            <option value="Marathi">Marathi</option>
            <option value="Gamit">Gamit</option>
            <option value="Sunday">Sunday School</option>
            <option value="Chirstmas">Chirstmas</option>
            <option value="Gujrati">Gujrati</option>
          </Form.Control>
        </Form.Group>


        <Form.Group controlId="songYoutubeID" className="mb-3">
          <Form.Label>YouTube Video ID</Form.Label>
          <Form.Control
            type="text"
            name="songYoutubeID"
            value={song.songYoutubeID}
            onChange={handleChange}
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={isSubmitting}>
          <FaEdit className="me-2" /> {/* Add the icon before the text */}
          {isSubmitting ? "Updating..." : "Update Song"}
        </Button>
      </Form>
    </Container>
  );
}

export default SongUpdate;
