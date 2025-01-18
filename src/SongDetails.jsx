import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDatabase, ref, get } from "firebase/database";
import { Container, Spinner, Card, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaEdit } from "react-icons/fa"; // Import the Edit Icon
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

function SongDetails() {
  const { id } = useParams(); // Extract the song ID from the URL
  const [song, setSong] = useState(null);

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
      })
      .catch((error) => {
        console.error("Error fetching song:", error);
      });
  }, [id]);

  if (!song) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status" />
        <p>Loading song details...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Tabs
      defaultActiveKey="profile"
      id="uncontrolled-tab-example"
      className="mb-3"
    >
      <Tab eventKey="Lyric" title="Lyric">
      <Card>
        <Card.Body>
          <Card.Title className="text-center">{song.songTitle}</Card.Title>
          <Card.Text style={{ whiteSpace: "pre-wrap", marginBottom: "20px" }}>
            {song.songContent}
          </Card.Text>
          {song.songYoutubeID ? (
            <div className="d-flex justify-content-center">
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${song.songYoutubeID}?autoplay=1=1&loop=1&playlist=${song.songYoutubeID}`} // Autoplay, mute, and loop
                title={song.songTitle}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <p className="text-center text-muted">YouTube video not available.</p>
          )}


          {/* Edit Button */}
          <div className="text-center mt-4">
            <Link to={`/songs/update/${id}`}>
              <Button variant="primary">
                <FaEdit className="me-2" /> {/* Edit Icon */}
                Edit Song
              </Button>
            </Link>
          </div>
        </Card.Body>
      </Card>
      </Tab>
      <Tab eventKey="chord" title="Chord">
        Tab content for Profile
      </Tab>
      <Tab eventKey="Note" title="Note">
        Tab content for Contact
      </Tab>
    </Tabs>
     
    </Container>
  );
}

export default SongDetails;
