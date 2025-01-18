import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { Table, Container, FormControl, Button } from "react-bootstrap";
import { InputGroup } from "react-bootstrap";
import { FaSearch } from "react-icons/fa";

function YoutubeSearch() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("allSongs");

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

  // Filter songs whenever songs, searchQuery, or selectedCategory changes
  useEffect(() => {
    filterSongs(songs, searchQuery, selectedCategory);
  }, [songs, searchQuery, selectedCategory]);

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
          song.songTitle.toLowerCase().includes(query.toLowerCase()) ||
          song.songCategory.toLowerCase().includes(query.toLowerCase())
      );
    }

    filtered.sort((a, b) => a.songTitle.localeCompare(b.songTitle));
    setFilteredSongs(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle song click to update video
  const handleSongClick = (song) => {
    if (song.songYoutubeID) {
      setCurrentVideoId(song.songYoutubeID);
    } else {
      alert("Video ID not available for this song!");
    }
  };

  // Handle category button click
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  return (
    <div style={{ maxHeight: "100vh", overflow: "hidden" }}>
      {/* YouTube Video Player */}
      <div
        style={{
          marginTop: "16px", // Remove extra space
          width: "100%",
        }}
      >
        {currentVideoId ? (
          <iframe
            width="100%"
            height="315"
            src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`}
            title="YouTube Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ maxWidth: "100%" }}
          ></iframe>
        ) : (
          <div className="text-center text-muted" style={{ padding: "1rem" }}>
            Select a song to play its video.
          </div>
        )}
      </div>

      {/* Content Section */}
      <div
        style={{
          marginTop: "20px", // Reduced gap between video and buttons
          overflowY: "auto",
          height: "calc(100vh - 380px)", // Adjust height accordingly
        }}
      >
        <Container>
          {/* Category Buttons */}
          <div
            className="d-flex flex-wrap mb-4"
            style={{
              backgroundColor: "white",
              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              padding: "10px 0",
              whiteSpace: "nowrap", // Ensure items stay in one line
            }}
          >
            {[
              { key: "allSongs", label: "All Songs" },
              { key: "english", label: "English" },
              { key: "worship", label: "Worship" },
              { key: "hindi", label: "Hindi" },
              { key: "marathi", label: "Marathi" },
              { key: "gamit", label: "Gamit" },
              { key: "christmas", label: "Christmas" },
              { key: "sundayschool", label: "Sunday School" },
            ].map((category) => (
              <Button
                key={category.key}
                variant={selectedCategory === category.key ? "primary" : "outline-primary"}
                className="me-2 mb-2"
                onClick={() => handleCategoryClick(category.key)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          <InputGroup className="mb-4">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <FormControl
              type="text"
              placeholder="Search Songs"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </InputGroup>

          {/* Song List */}
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Song No</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.map((song) => (
                <tr
                  key={song.id}
                  onClick={() => handleSongClick(song)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{song.songNo}</td>
                  <td>{song.songTitle}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Container>
      </div>
    </div>
  );
}

export default YoutubeSearch;
