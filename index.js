const express = require('express');
const app = express();

let topMovies = [
    {
      title: 'The Thing',
      director: 'John Carpenter'
    },
    {
      title: 'Starship Troopers',
      director: 'Paul Verhoeven'
    },
    {
      title: 'Night of the Hunter',
      director: 'Charles Laughton'
    }
  ];

  // GET requests
app.get('/', (req, res) => {
    res.send('Welcome to my movie list!');
  });
  
  app.get('/documentation', (req, res) => {                  
    res.sendFile('public/documentation.html', { root: __dirname });
  });
  
  app.get('/movies', (req, res) => {
    res.json(topMovies);
  });
  
  
  // listen for requests
  app.listen(8080, () => {
    console.log('Your app is listening on port 8080.');
  });