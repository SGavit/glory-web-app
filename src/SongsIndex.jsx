import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDatabase, ref, onValue } from "firebase/database";
import { Tabs, Tab, Table, Container, Spinner, Button, FormControl } from "react-bootstrap";

function SongsIndex() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [key, setKey] = useState("allSongs");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch songs from Firebase
  useEffect(() => {
    const db = getDatabase();
    const songsRef = ref(db, "songs");

    const unsubscribe = onValue(
      songsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const formattedData = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setSongs(formattedData);
          filterSongs(formattedData, searchQuery, key);
        }
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, [key, searchQuery]);

  // Filter songs by category and search query
  const filterSongs = (songs, query, category) => {
    let filtered = songs;
    
    if (category && category !== "allSongs") {
      filtered = songs.filter((song) => song.songCategory === category);
    }

    if (query) {
      filtered = filtered.filter((song) =>
        song.songTitle.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredSongs(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Container className="mt-4">
      <h3 className="text-center mb-4">Song Index</h3>

      {/* Search Bar */}
      <div className="mb-4">
        <FormControl
          type="text"
          placeholder="Search Songs"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Tabs for Song Categories */}
      <Tabs
        activeKey={key}
        onSelect={(k) => setKey(k)}
        id="song-category-tabs"
        className="mb-4"
      >
        <Tab eventKey="allSongs" title="All Songs">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                <tr key={song.id}>
                  <td>{song.songNo}</td>
                  <td>
                    <Link to={`/songs/${song.id}`} className="text-decoration-none">
                      {song.songTitle}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="hindi" title="Hindi">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                song.songCategory === 'Hindi' && (
                  <tr key={song.id}>
                    <td>{song.songNo}</td>
                    <td>
                      <Link to={`/songs/${song.id}`} className="text-decoration-none">
                        {song.songTitle}
                      </Link>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="english" title="English">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                song.songCategory === 'English' && (
                  <tr key={song.id}>
                    <td>{song.songNo}</td>
                    <td>
                      <Link to={`/songs/${song.id}`} className="text-decoration-none">
                        {song.songTitle}
                      </Link>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="marathi" title="Marathi">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                song.songCategory === 'Marathi' && (
                  <tr key={song.id}>
                    <td>{song.songNo}</td>
                    <td>
                      <Link to={`/songs/${song.id}`} className="text-decoration-none">
                        {song.songTitle}
                      </Link>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>

      {/* Floating Add Button */}
      <Button
        as={Link}
        to="/editSong"
        variant="outline-secondary"
        className="position-fixed bottom-0 end-0 m-4 p-2"
        style={{ width: "60px", height: "60px" }}
      >
        <h2>+</h2>
      </Button>
    </Container>
  );
}

export default SongsIndex;
