import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import {
  Table,
  Container,
  FormControl,
  Button,
  InputGroup,
  Card,
  Modal,
  Row,
  Col,
} from "react-bootstrap";
import {
  FaSearch,
  FaYoutube,
  FaMusic,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaGlobe,
  FaPrayingHands,
  FaFlag,
  FaGift,
  FaChurch,
} from "react-icons/fa";
import SongUpdate from "./SongUpdate";

function YoutubeSearch() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("allSongs");
  const [expandedSongId, setExpandedSongId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);

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

  useEffect(() => {
    filterSongs(songs, searchQuery, selectedCategory);
  }, [songs, searchQuery, selectedCategory]);

  const filterSongs = (songs, query, category) => {
    let filtered = songs;
    if (category && category !== "allSongs") {
      filtered = filtered.filter(
        (song) => song.songCategory.toLowerCase() === category.toLowerCase()
      );
    }
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSongClick = (song) => {
    if (song.songYoutubeID) {
      setCurrentVideoId(song.songYoutubeID);
    } else {
      alert("Video ID not available for this song!");
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleEditClick = (song) => {
    setSelectedSongId(song.id);
    setShowEditModal(true);
  };

  const toggleSongContent = (songId) => {
    setExpandedSongId((prevId) => (prevId === songId ? null : songId));
  };

  return (
    <div className="bg-light" style={{ minHeight: "100vh" }}>
      {/* Video Player Section */}
      <Container fluid className="px-0">
        <Card className="border-0">
          <div className="ratio ratio-16x9 bg-dark">
            {currentVideoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${currentVideoId}?autoplay=1`}
                title="YouTube Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-bottom shadow-lg"
              ></iframe>
            ) : (
              <div className="d-flex flex-column justify-content-center align-items-center h-100 text-white">
                <FaYoutube size={64} className="mb-3" />
                <h4 className="text-center">Select a song to start playing</h4>
              </div>
            )}
          </div>
        </Card>
      </Container>

      <Container className="py-4" style={{ maxWidth: "1200px" }}>
        {/* Search Bar */}
        <Row className="mb-4">
          <Col xs={12}>
            <InputGroup className="search-bar-glass">
              <InputGroup.Text className="bg-white border-0 ps-3 pe-2">
                <FaSearch className="text-primary" />
              </InputGroup.Text>
              <FormControl
                placeholder="Search songs by title or category..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="border-0 py-2 search-input"
              />
            </InputGroup>
          </Col>
        </Row>

        {/* Category Filters */}
        <Row className="mb-3">
          <Col xs={12}>
            <div className="d-flex flex-wrap gap-2">
              {[
                { key: "allSongs", label: "All Songs", icon: <FaMusic /> },
                { key: "english", label: "English", icon: <FaGlobe /> },
                { key: "worship", label: "Worship", icon: <FaPrayingHands /> },
                { key: "hindi", label: "Hindi", icon: <FaFlag /> },
                { key: "marathi", label: "Marathi", icon: <FaFlag /> },
                { key: "gamit", label: "Gamit", icon: <FaFlag /> },
                { key: "christmas", label: "Christmas", icon: <FaGift /> },
                { key: "sundayschool", label: "Sunday School", icon: <FaChurch /> },
              ].map((category) => (
                <Button
                  key={category.key}
                  variant={
                    selectedCategory === category.key ? "primary" : "outline-primary"
                  }
                  className="rounded-pill d-flex align-items-center"
                  onClick={() => handleCategoryClick(category.key)}
                  style={{ minWidth: "120px" }}
                >
                  <span className="me-1">{category.icon}</span>
                  <span className="d-none d-md-inline">{category.label}</span>
                </Button>
              ))}
            </div>
          </Col>
        </Row>

        {/* Songs Table */}
        <Card className="shadow-sm">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-primary text-white">
                <tr>
                  <th style={{ width: "10%", minWidth: "80px" }}>Song #</th>
                  <th style={{ width: "30%", minWidth: "200px" }}>Title</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSongs.map((song) => (
                  <React.Fragment key={song.id}>
                    <tr
                      onClick={() => handleSongClick(song)}
                      style={{ cursor: "pointer" }}
                      className="hover-transform"
                    >
                      <td className="fw-bold text-primary">{song.songNo}</td>
                      <td>{song.songTitle}</td>
                      <td>
                        <div className="d-flex justify-content-end">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="me-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(song);
                            }}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSongContent(song.id);
                            }}
                          >
                            {expandedSongId === song.id ? (
                              <FaEyeSlash />
                            ) : (
                              <FaEye />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedSongId === song.id && (
                      <tr>
                        <td colSpan="3" className="p-0">
                          <div className="song-content-container p-3">
                            <div className="song-content-card">
                              <h6 className="song-content-title mb-3">
                                <FaMusic className="me-2" />
                                Song Lyrics & Details
                              </h6>
                              <pre className="song-content-text">
                                {song.songContent || "No content available."}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          </div>
          {filteredSongs.length === 0 && (
            <div className="text-center py-4 text-muted">
              <FaMusic className="mb-2" size={32} />
              <p>No songs found matching your search</p>
            </div>
          )}
        </Card>
      </Container>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
        centered
        className="mobile-fullscreen-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Song</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSongId && <SongUpdate id={selectedSongId} />}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default YoutubeSearch;