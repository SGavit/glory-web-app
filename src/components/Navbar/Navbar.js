import React, { useState } from 'react';
import { Navbar, Nav, NavDropdown, Container, Form, FormControl, Button } from 'react-bootstrap';
import { Link, useNavigate } from "react-router-dom";

function MyNavbar() {
  
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <b>Glory</b>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
        
          <Nav className="ms-auto"> {/* ms-auto will align the Nav to the right */}
            <Nav.Link as={Link} to="/allSongs">
              All Songs
            </Nav.Link>
            <Nav.Link as={Link} to="/editSong">
              Edit Song
            </Nav.Link>
          </Nav>

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default MyNavbar;
