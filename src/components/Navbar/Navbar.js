import React from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaHome, FaMusic, FaEdit, FaYoutube } from "react-icons/fa";

function MyNavbar() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary shadow-sm py-2">
      <Container>
        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <FaHome className="me-2 text-primary" size={28} />
          <b className="fs-4 text-dark">Glory</b>
        </Navbar.Brand>

        {/* Toggle for small screens */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        {/* Collapsible Navigation Links */}
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {/* All Songs */}
            <Nav.Link as={Link} to="/allSongs" className="d-flex align-items-center">
              <FaMusic className="me-2 text-success" size={20} />
              All Songs
            </Nav.Link>

            {/* Edit Song */}
            <Nav.Link as={Link} to="/editSong" className="d-flex align-items-center">
              <FaEdit className="me-2 text-warning" size={20} />
              Add Song
            </Nav.Link>

            {/* YouTube Song */}
            <Nav.Link as={Link} to="/indecYoutubeSong" className="d-flex align-items-center">
              <FaYoutube className="me-2 text-danger" size={20} />
              YouTube
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default MyNavbar;
