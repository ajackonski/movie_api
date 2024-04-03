const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),  
  path = require('path'),
  bodyParser = require('body-parser')
const app = express()

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

  // create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Welcome to my movie list!');
  });
  
app.get('/documentation', (req, res) => {
  res.sendFile('/public/documentation.html');
  });

  
app.get('/movies', (req, res) => {
    res.json(topMovies);
  });

app.get('/', (req, res) => {
  res.send('Welcome to my app!');
});
  
  // listen for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});