# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)



import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDatabase, ref, get } from "firebase/database";

function SongDetails() {
  const { id } = useParams(); // Extract the song ID from the URL
  const [song, setSong] = useState(null);

  useEffect(() => {
    const db = getDatabase();
    const songRef = ref(db, `songs/${id}`);

    get(songRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          setSong(snapshot.val());
        } else {
          console.error("Song not found.");
        }
      })
      .catch((error) => {
        console.error("Error fetching song:", error);
      });
  }, [id]);

  if (!song) {
    return <p>Loading song details...</p>;
  }

  return (
    <div>
      <h1>{song.songTitle}</h1>
      <p style={{ whiteSpace: "pre-wrap" }}>{song.songContent}</p>
      {song.songYoutubeID ? (
        <iframe
          width="560"
          height="315"
          src={`https://www.youtube.com/embed/${song.songYoutubeID}`}
          title={song.songTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <p>YouTube video not available.</p>
      )}
    </div>
  );
}
###########################################################################
---------------------------------------------------------------------------
1] Tabs Code
import React, { useState } from 'react';
import { Tabs, Tab, Container } from 'react-bootstrap';

function SongTabs() {
  const [key, setKey] = useState('allSongs');

  return (
    <Container className="mt-4">
      <Tabs
        id="song-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k)}
        className="mb-3"
      >
        <Tab eventKey="allSongs" title="All Songs">
          {/* All Songs Content */}
          <div>
            <h3>All Songs</h3>
            <p>Display all songs here.</p>
          </div>
        </Tab>
        <Tab eventKey="category" title="Category">
          {/* Category Content */}
          <div>
            <h3>Category</h3>
            <p>Display categories and their songs here.</p>
          </div>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default SongTabs;
----------------------------------------------------------------------
######################################################################

EditLyrics.jsx
1] add Buttons of chord [Db,  Fm , Ab , Eb]
add textarea where i paste any Lyric
[
Hide me now
Under Your wings
Co - ver me
Within Your mighty hands    
]
I will pick any chord from button will place in Lyric 
Eg. 
In Textare
[
Ab    Eb  Fm
Hide me now
  Db   Bbm   Eb
Under Your wings
Ab    Eb   Fm
Co - ver me
  Db         Bbm     Eb
Within Your mighty hands
   
]
Add Button for save 
also show in same pase
ShowLyrics.jsx
----------------------------------------------------------
2] Show the Lyric 

Ab    Eb  Fm
Hide me now
  Db   Bbm   Eb
Under Your wings
Ab    Eb   Fm
Co - ver me
  Db         Bbm     Eb
Within Your mighty hands 

Add Button Edit which will go the EditLyrics page to edit








From index.js
<!--React.StrictMode>
    <App />
  </React.StrictMode-->