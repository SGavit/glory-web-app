import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SongsIndex from "./SongsIndex";
import SongDetails from "./SongDetails";
import database from "./firebaseConfig";
import MyNavbar from "./components/Navbar/Navbar";
import { Container } from "react-bootstrap";
import SongEdit from "./SongEdit";
import SongUpdate from "./SongUpdate";
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
