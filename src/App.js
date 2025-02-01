import React from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import SongsIndex from "./SongsIndex";
import SongDetails from "./SongDetails";
import SongEdit from "./SongEdit";
import database from "./firebaseConfig";
import SongUpdate from "./SongUpdate";
import YoutubeSearch from "./YoutubeSearch";
import MyNavbar from "./components/Navbar/Navbar";
import { Container } from "react-bootstrap";

function App() {
  return (
    <div>
      <Router>
        <MyNavbar />
        <Container className="mt-4">
          <Routes>
            <Route path="/allSongs" element={<SongsIndex />} />
            <Route path="/addSong" element={<SongDetails />} />
            <Route path="/editSong" element={<SongEdit />} />
            <Route path="/updateSong" element={<SongUpdate />} />
            <Route path="/indecYoutubeSong" element={<YoutubeSearch />} />
            <Route path="/songs/update/:id" element={<SongUpdate />} />
          </Routes>
        </Container>
        <div>
          <Routes>
            <Route path="/" element={<SongsIndex />} />
            <Route path="/songs/:id" element={<SongDetails />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
