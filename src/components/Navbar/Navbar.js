import React, { useState } from 'react';
import { Navbar, Nav, NavDropdown, Container, Form, FormControl, Button } from 'react-bootstrap';
import { Link, useNavigate } from "react-router-dom";

function MyNavbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery) {
      navigate(`/allSongs?search=${searchQuery}`);
    }
  };

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
            <Nav.Link as={Link} to="/addSong">
              Add Song
            </Nav.Link>
            <Nav.Link as={Link} to="/editSong">
              Edit Song
            </Nav.Link>
            
            <NavDropdown title="Category" id="basic-nav-dropdown">
              <NavDropdown.Item href="#action/3.1">English</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.2">Hindi</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.3">Marathi</NavDropdown.Item>
            </NavDropdown>
          </Nav>
          <Form inline onSubmit={handleSearchSubmit} className="d-flex">
            <FormControl
              type="text"
              placeholder="Search Songs"
              className="mr-sm-2"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <Button type="submit" variant="outline-success">Search</Button>
          </Form>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default MyNavbar;
