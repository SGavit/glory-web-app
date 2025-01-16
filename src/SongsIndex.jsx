import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDatabase, ref, onValue } from "firebase/database";
import { Tabs, Tab, Table, Container, FormControl } from "react-bootstrap";
import { Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa"; // React Icons (Font Awesome)
import { InputGroup } from "react-bootstrap";
import { FaSearch } from "react-icons/fa"; // Import the Search Icon

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
        }
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter songs whenever the songs, searchQuery, or selected tab changes
  useEffect(() => {
    filterSongs(songs, searchQuery, key);
  }, [songs, searchQuery, key]);

  // Filter songs by category and search query
  const filterSongs = (songs, query, category) => {
    let filtered = songs;

    // Filter by category if not "allSongs"
    if (category && category !== "allSongs") {
      filtered = filtered.filter((song) => song.songCategory.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query
    if (query) {
      filtered = filtered.filter(
        (song) =>
          song.songTitle.toLowerCase().includes(query.toLowerCase()) || // Search in title
          song.songCategory.toLowerCase().includes(query.toLowerCase()) // Search in category
      );
    }

    // Sort songs alphabetically by title
    filtered.sort((a, b) => a.songTitle.localeCompare(b.songTitle));

    setFilteredSongs(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Container className="mt-4">
      {/* Search Bar */}
      <div className="mb-4">
      <InputGroup className="mb-4">
      <InputGroup.Text id="basic-addon1">
        <FaSearch /> {/* Search Icon */}
      </InputGroup.Text>
      <FormControl
        type="text"
        placeholder="Search Songs"
        value={searchQuery}
        onChange={handleSearchChange}
        aria-label="Search Songs"
        aria-describedby="basic-addon1"
      />
    </InputGroup>
      </div>

      {/* Tabs for Song Categories */}
      <Tabs
        activeKey={key}
        onSelect={(k) => setKey(k)}
        id="song-category-tabs"
        className="mb-4"
        direction="horizontal"   
      >
        <Tab eventKey="allSongs" title="All Songs">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No 01</th>
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
                song.songCategory.toLowerCase() === "hindi" && (
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
                song.songCategory.toLowerCase() === "english" && (
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
                song.songCategory.toLowerCase() === "marathi" && (
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
        <Tab eventKey="worship" title="Worship">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                song.songCategory.toLowerCase() === "worship" && (
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
        <Tab eventKey="gamit" title="Gamit">
          <Table striped bordered hover responsive>
            <thead className="thead-dark">
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                song.songCategory.toLowerCase() === "gamit" && (
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
      variant="primary"
      className="position-fixed bottom-0 end-0 m-4 rounded-circle d-flex justify-content-center align-items-center"
      style={{ width: "60px", height: "60px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" }}
    >
      <FaPlus size={20} />
    </Button>
    </Container>
  );
}

export default SongsIndex;
