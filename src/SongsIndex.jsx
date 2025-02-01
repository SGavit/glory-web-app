import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDatabase, ref, onValue } from "firebase/database";
import { Tabs, Tab, Table, Container, FormControl, InputGroup, Button, Alert } from "react-bootstrap";
import { FaPlus, FaSearch, FaMusic } from "react-icons/fa";

function SongsIndex() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [key, setKey] = useState("allSongs");
  const [searchQuery, setSearchQuery] = useState("");

  // Phonetic Mapping (Latin to Devanagari)
  const phoneticMap = {
    a: ["a", "अ", "आ", "અ", "આ"],
    b: ["b", "ब", "બ"],
    c: ["c", "क", "च", "ક", "છ"],
    d: ["d", "द", "ड", "દ", "ઢ"],
    e: ["e", "ए", "ऐ", "એ", "ઐ"],
    f: ["f", "फ", "ફ"],
    g: ["g", "ग", "ગ", "ઘ"],
    h: ["h", "ह", "હ"],
    i: ["i", "इ", "ई", "ઇ", "ઈ"],
    j: ["j", "ज", "જ"],
    k: ["k", "क", "ક"],
    l: ["l", "ल", "લ"],
    m: ["m", "म", "મ"],
    n: ["n", "न", "ન", "ણ"],
    o: ["o", "ओ", "औ", "ઓ", "ઊ"],
    p: ["p", "प", "પ"],
    q: ["q"],
    r: ["r", "र", "ર"],
    s: ["s", "स", "श", "સ", "શ"],
    t: ["t", "त", "ट", "ત", "થ"],
    u: ["u", "उ", "ऊ", "ઉ", "ઊ"],
    v: ["v", "व", "વ"],
    w: ["w", "વ", "વ"],
    x: ["x", "क्ष", "ક્ષ"],
    y: ["y", "य", "ય"],
    z: ["z", "ज़", "ઝ"]
  };

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
  
    // Handle multi-character word initial search
    if (query) {
      const queryLower = query.toLowerCase();
      const queryChars = queryLower.split('');
  
      filtered = filtered.filter(song => {
        // Clean and split song title into words
        const titleLower = song.songTitle.toLowerCase().trim();
        const titleWords = titleLower.split(/\s+/).filter(word => word.length > 0);
  
        // Check if title has enough words
        if (titleWords.length < queryChars.length) return false;
  
        // Check each query character against corresponding word initials
        return queryChars.every((char, index) => {
          // Get phonetic variations for current character
          const phonetics = phoneticMap[char] || [char];
          // Get first character of corresponding word
          const wordInitial = titleWords[index][0];
          // Check if word initial matches any phonetic variation
          return phonetics.some(ph => ph === wordInitial);
        });
      });
    }
  
    // Category filtering
    if (category !== "allSongs") {
      const targetCategory = category.toLowerCase();
      filtered = filtered.filter(
        song => song.songCategory.toLowerCase() === targetCategory
      );
    }
  
    // Alphabetical sorting
    filtered.sort((a, b) => a.songTitle.localeCompare(b.songTitle));
  
    setFilteredSongs(filtered);
  };
  // Handle category selection and update the key state
  const handleCategoryChange = (category) => {
    if (category === "All") {
      setKey("allSongs"); // Set the key to "allSongs" to show all songs
    } else {
      setKey(category.toLowerCase()); // Set the key to the selected category
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Container className="mt-5" fluid>
      {/* Search Bar with Icon */}
     
      <div className="mb-4">
  <InputGroup className="rounded-pill shadow-lg" style={{ transition: "all 0.3s ease" }}>
    <InputGroup.Text 
      className="bg-gradient-primary text-white border-0 rounded-start-pill px-4"
      style={{
        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
        fontSize: "1.1rem"
      }}
    >
      <FaSearch className="me-2" />
      <span style={{ fontWeight: 500 }}>Search</span>
    </InputGroup.Text>
    <FormControl
      type="text"
      placeholder="Type a letter (A, अ, ક) or song title..."
      value={searchQuery}
      onChange={handleSearchChange}
      className="py-3 border-0 bg-light"
      style={{
        borderRadius: '0 30px 30px 0',
        fontSize: '1.1rem',
        boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.05)",
        transition: "all 0.3s ease"
      }}
      onFocus={(e) => {
        e.target.parentElement.style.transform = "scale(1.02)";
        e.target.parentElement.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
      }}
      onBlur={(e) => {
        e.target.parentElement.style.transform = "scale(1)";
        e.target.parentElement.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
      }}
    />
  </InputGroup>
  <small className="text-muted mt-2 d-block ps-4" style={{ opacity: 0.8 }}>
    Pro tip: Search using Latin, Devanagari, or Gujarati characters
  </small>
</div>
      {/* Category Buttons with Horizontal Scroll */}
      <div className="category-buttons d-flex justify-content-start mb-4 flex-wrap" style={{ overflowX: "auto", padding: "10px 0" }}>
        {["All", "Hindi", "English", "Marathi", "Worship", "Gamit", "SundaySchool","Christmas"].map((category) => (
          <Button
            key={category}
            variant={key === (category === "All" ? "allSongs" : category.toLowerCase()) ? "primary" : "outline-primary"}
            className="m-2 px-4 py-2 rounded-pill"
            onClick={() => handleCategoryChange(category)}
            style={{ whiteSpace: "nowrap" }}
          >
            <FaMusic className="me-2" />
            {category}
          </Button>
        ))}
      </div>

      {/* Song Table */}
      <SongTable songs={filteredSongs} />

      {/* Floating Add Button */}
      <Button
        as={Link}
        to="/editSong"
        variant="primary"
        className="position-fixed bottom-0 end-0 m-4 rounded-circle shadow-lg d-flex justify-content-center align-items-center"
        style={{
          width: "65px",
          height: "65px",
          transition: "transform 0.3s ease",
          zIndex: 1000,
          padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <FaPlus size={30} className="text-white" />
      </Button>
    </Container>
  );
}

// Enhanced SongTable Component
function SongTable({ songs }) {
  return (
    <div className="shadow-sm rounded-3 overflow-hidden">
      <Table bordered hover responsive className="mb-0">
        <thead className="bg-primary text-white">
          <tr>
            <th style={{ width: '10%' }}>No</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody className="bg-light">
          {songs.length > 0 ? (
            songs.map((song) => (
              <tr key={song.id} className="align-middle">
                <td className="fw-bold text-primary">{song.songNo}</td>
                <td>
                  <Link
                    to={`/songs/${song.id}`}
                    className="text-decoration-none text-dark d-block py-2"
                    style={{ transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    {song.songTitle}
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2" className="text-center py-4">
                <Alert variant="info" className="mb-0">
                  No songs found in this category
                </Alert>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default SongsIndex;
