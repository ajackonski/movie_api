require('dotenv').config();
const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),  
  path = require('path'),
  bodyParser = require('body-parser')
const app = express()
const mongoose = require('mongoose');
const Models = require('./models.js');
const { body, validationResult } = require('express-validator'); // Updated import

const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect( process.env.CONNECTION_URI,{ useNewUrlParser: true, useUnifiedTopology: true, "dbName":  "<DATABASE>" })
.then(() => console.log('Connected to the database'))
.catch((err) => console.error('Could not connect to the database', err));

app.use(bodyParser.urlencoded({
  extended: true
}));

// CORS domains
const cors = require('cors');

app.use(cors());

// passport implementation
let auth = require('./auth')(app);
const passport = require('passport');
const { error } = require('console');
require('./passport')

app.use(bodyParser.json());

// create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static('public'));

// API endpoints

//homepage
app.get('/', (req, res) => {
    res.send('Welcome to my movie list!');
});

 //documentation endpoint
app.get('/documentation', (req, res) => {
  res.sendFile('./public/documentation.html');
});

//return JSON list of movies in the "movies" collection to the user 
  app.get('/movies', async (req, res) => {
    await Movies.find()
      .then((movies) => { console.log(movies)
        res.status(201).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//get data on a particular movie by title 
app.get('/movies/:Title',passport.authenticate('jwt', { session: false }), async (req, res) => { console.log(req);
  await Movies.findOne({ title: req.params.Title })
    .then((movie) => {
      res.status(201).json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//return data about a movies genre 
app.get('/movies/genre/:name',passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const genreName = req.params.name;
    const movies = await Movies.find({ 'genre.name': genreName });

    if (movies.length === 0) {
      return res.status(404).send('Genre not found');
    }

    const genreData = {
      Name: genreName,
      Description: movies[0].genre.description,
      Movies: movies.map(movie => ({
        Title: movie.title,
        Description: movie.description,
        Director: movie.director,
        Actors: movie.actors,
        ImagePath: movie.imagePath,
        Featured: movie.featured
      }))
    };

    res.json(genreData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

//get data on a director 
app.get('/movies/director/:name',passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const directorName = req.params.name;
    const movies = await Movies.find({ 'director.name': directorName });

    if (movies.length === 0) {
      return res.status(404).send('Director not found');
    }

    const directorData = {
      Name: directorName,
      Bio: movies[0].director.bio,
      Movies: movies.map(movie => ({
        Title: movie.title,
        Description: movie.description,
        Genre: movie.genre,
        Actors: movie.actors,
        ImagePath: movie.imagePath,
        Featured: movie.featured
      }))
    };

    res.json(directorData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Get all users 
app.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Get a user by username 
app.get('/users/:username',passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOne({ username: req.params.username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//update a user 
app.post('/users', [
  body('Username', 'Username is required').isLength({ min: 5 }).isAlphanumeric(),
  body('Password', 'Password is required').not().isEmpty(),
  body('Email', 'Email does not appear to be valid').isEmail(),
  body('Birthday', 'Birthday must be in YYYY-MM-DD format').optional().isISO8601()
], (req, res) => {
  
  // Log the incoming request body
  console.log('Received request body:', req.body);

  // Check for validation errors
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + ' already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) => { res.status(201).json(user) })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// Add a new movie to the database
app.post('/movies',passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { Title, Description, Genre, Director, Actors, ImagePath, Featured } = req.body;
    
    // Check if the movie with the same title already exists
    const existingMovie = await Movies.findOne({ Title });
    if (existingMovie) {
      return res.status(400).send('Movie with the same title already exists');
    }

    // Create a new movie document
    const newMovie = await Movies.create({
      Title,
      Description,
      Genre,
      Director,
      Actors,
      ImagePath,
      Featured
    });

    res.status(201).json(newMovie);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// Add a movie to a user's list of favorites (got it!!)
app.post('/users/:username/movies/:movieId',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.username !== req.params.username){
    return res.status(400).send('Permission denied');
}
  try {
    const { username, movieId } = req.params;


    const user = await Users.findOne({ username: username });
    if (!user) {
      return res.status(404).send('User not found');
    }


    const movie = await Movies.findById(movieId);
    if (!movie) {
      return res.status(404).send('Movie not found');
    }


    if (user.favoriteMovies.includes(movieId)) {
      return res.status(400).send('Movie already in favorites');
    }


    user.favoriteMovies.push(movieId);
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});



//remove a movie from a users favorite movie list 
app.delete('/users/:username/movies/:movieId',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.username !== req.params.username){
    return res.status(400).send('Permission denied');
}
  try {
    const updatedUser = await Users.findOneAndUpdate(
      { username: req.params.username },
      { $pull: { favoriteMovies: req.params.movieId } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});

// Delete a user by username 
app.delete('/users/:username',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.username !== req.params.username){
    return res.status(400).send('Permission denied');
}
  await Users.findOneAndDelete({ username: req.params.username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.username + ' was not found');
      } else {
        res.status(200).send(req.params.username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


//Create new user and hash the new user password before storing using bcrypt
app.post('/users', [
  body('Username', 'Username is required').isLength({ min: 5 }),
  body('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
  body('Password', 'Password is required').not().isEmpty(),
  body('Email', 'Email does not appear to be valid').isEmail()
], async (req, res) => {
  console.log(req.body); // Log the incoming request body

  let errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  let hashedPassword = Users.hashPassword(req.body.Password);
  console.log(hashedPassword);
  await Users.findOne({ username: req.body.username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.username + ' already exists');
      } else {
        Users
          .create({
            username: req.body.username,
            password: hashedPassword,
            email: req.body.Email,
            birthday: req.body.Birthday
          })
          .then((user) => { res.status(201).json(user) })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

  // listen for requests
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
  console.log('Listening on Port ' + port);
});