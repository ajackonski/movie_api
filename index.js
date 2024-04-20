const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),  
  path = require('path'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');
const app = express()

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

let movies = [
    {
      "Title": 'The Thing',
      "Director": {"Name": 'John Carpenter',
    },
      "Genre": { "Name": 'horror',
    }
  },
    {
      "Title": 'Starship Troopers',
      "Director":  'Paul Verhoeven',
      "Genre": { "Name": 'sci-fi'
    },
    },
    {
      "Title": 'Night of the Hunter',
      "Director": 'Charles Laughton',
    "Genre": { "Name": 'drama',
    }
    }
  ];

let users = [
 {
  id: 1,
  name: "alex",
  favoriteMovies: ["The Thing"]
 }
  
]


  // create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static('public'));

// REST endpoints
app.get('/', (req, res) => {
    res.send('Welcome to my movie list!');
});
 //documentation endpoint
app.get('/documentation', (req, res) => {
  res.sendFile('/public/documentation.html');
});

  //returns JSON list of movies in the "movies" array
app.get('/movies', (req, res) => {
    res.status(200).json(movies);
});
//get data on a particular movie by title
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find(movie => movie.Title === title)

  if (movie) {
    return res.status(200).json(movie);
  } else {
    return res.status(400).send("sorry that movie's not here!")
  }
});
//return data about a movies genre
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find(movie => movie.Genre.Name === genreName).Genre;

  if (genre) {
    return res.status(200).json(genre);
  } else {
    return res.status(400).send("no such genre!")
  }
});

app.get('/movies/director/:directorName', (req, res) => {
  const { directorName } = req.params;
  const director = movies.find(movie => movie.Director.Name === directorName).Director;

  if (director) {
    return res.status(200).json(director);
  } else {
    return res.status(400).send("no such director!")
  }
});

//create a new user
app.post('/users', (req, res) => {
  const newUser = req.body;

  if (newUser.name) {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser);
  } else {
    res.status(400).send("User needs a name")
  }
});

//update a user
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;

  let user = users.find( user => user.id == id);

  if (user) {
    user.name = updatedUser.name;
    res.status(200).json(user);
  } else {
    res.status(400).send("no such user");
  }
});

//post a new movie on a users favorite movie list
app.post('/users/:id/:movieTitle', (req, res) => {
  const { id,movieTitle } = req.params;

  let user = users.find( user => user.id == id);

  if (user) {
    user.favoriteMovies.push(movieTitle);
    res.status(200).send(`${movieTitle} has been added to user ${id}'s array`);
  } else {
    res.status(400).send("no such movie");
  }
});

//remove a movie from a users favorite movie list
app.delete('/users/:id/:movieTitle', (req, res) => {
  const { id,movieTitle } = req.params;

  let user = users.find( user => user.id == id);

  if (user) {
    user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
    res.status(200).send(`${movieTitle} has been removed from user ${id}'s array`);
  } else {
    res.status(400).send("no such movie");
  }
});

//unregister user
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  let user = users.find( user => user.id == id);

  if (user) {
    users = users.filter( user => user.id != id);
    res.status(200).send(`user ${id} has been deleted`);
  } else {
    res.status(400).send("no such user");
  }
});








app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.post('/movies', (req,res) => {
  
})




  // listen for requests
app.listen(8080, () => {
   console.log('Your app is listening on port 8080.');
});