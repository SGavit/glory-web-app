import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, update, push } from "firebase/database";
import { Form, Container, Spinner } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { FaSave } from "react-icons/fa"; // Importing the Save Icon from React Icons

function SongAdd() {
  const { id } = useParams(); // Get the song id from the URL
  const navigate = useNavigate();
  const [song, setSong] = useState({
    songNo: "",        // Ensure songNo is initialized as empty
    songTitle: "",
    songContent: "",
    songCategory: "",
    songYoutubeID: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxSongNo, setMaxSongNo] = useState(0); // To track the highest songNo

  // Fetch all songs to find the highest songNo
  useEffect(() => {
    const db = getDatabase();
    const songsRef = ref(db, "songs");

    get(songsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          let highestSongNo = 0; 
          // Loop through the data to find the highest songNo
          Object.keys(data).forEach((key) => {
            const songData = data[key];
            const songNo = parseInt(songData.songNo);
            if (songNo > highestSongNo) {
              highestSongNo = songNo;
            }
          });
          setMaxSongNo(highestSongNo);
        } else {
          console.error("No songs found.");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  // Fetch the current song data if we are editing
  useEffect(() => {
    if (id) {
      const db = getDatabase();
      const songRef = ref(db, `songs/${id}`);

      get(songRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            setSong(snapshot.val());
          } else {
            console.error("Song not found.");
          }
        })
        .catch((error) => {
          console.error("Error fetching song:", error);
        });
    }
  }, [id]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSong((prevSong) => ({
      ...prevSong,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const db = getDatabase();
    const songRef = ref(db, `songs/${id || push(ref(db, "songs")).key}`); // Use a new key if adding a new song

    // Calculate next songNo
    const nextSongNo = id ? song.songNo : maxSongNo + 1; // Increment the songNo only when adding a new song

    // If it's a new song, songNo will be automatically generated
    const updatedSong = {
      songNo: nextSongNo.toString(),
      songTitle: song.songTitle,
      songContent: song.songContent,
      songCategory: song.songCategory,
      songYoutubeID: song.songYoutubeID || "",
    };

    // Update or create the song
    update(songRef, updatedSong)
      .then(() => {
        alert("Song saved successfully!");
        navigate(`/songs/${id || songRef.key}`);
      })
      .catch((error) => {
        console.error("Error saving song:", error);
        alert("Failed to save song.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (loading) {
    return (
      <sic className="text-center">
        <Spinner animation="border" role="status" />
        <p>Loading song data...</p>
      </sic>
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
            value={id ? song.songNo : maxSongNo + 1} // If editing, show existing songNo; otherwise, auto-generate
            disabled={true} // Disable field for editing (only for display)
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

        <Button variant="primary" type="submit" disabled={isSubmitting} className="d-flex align-items-center">
      <FaSave size={20} className="mr-2" /> {/* Save Icon */}
      {isSubmitting ? "Saving..." : ""}
    </Button>
      </Form>
    </Container>
  );
}

export default SongAdd;
