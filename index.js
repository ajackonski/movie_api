const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'),  
  path = require('path'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');
const app = express()
const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect('mongodb://localhost:27017/realmyflix', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({
  extended: true
}));
//CORS domains
const cors = require('cors');

let allowedOrigins = ['http://localhost:8080', 'http://testsite.com']

app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1) {
      let message = 'The CORS policy for this application does not allow acces from this origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));
// passport implementation
let auth = require('./auth')(app);
const passport = require('passport');
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
app.get('/documentation',passport.authenticate('jwt', { session: false }), (req, res) => {
  res.sendFile('/public/documentation.html');
});

//return JSON list of movies in the "movies" collection to the user (done) 
  app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//get data on a particular movie by title (done)
app.get('/movies/:Title',passport.authenticate('jwt', { session: false }), async (req, res) => { console.log(req);
  await Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.status(201).json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});
//return data about a movies genre (Done)
app.get('/movies/genre/:name',passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const genreName = req.params.name;
    const movies = await Movies.find({ 'Genre.Name': genreName });

    if (movies.length === 0) {
      return res.status(404).send('Genre not found');
    }

    const genreData = {
      Name: genreName,
      Description: movies[0].Genre.Description,
      Movies: movies.map(movie => ({
        Title: movie.Title,
        Description: movie.Description,
        Director: movie.Director,
        Actors: movie.Actors,
        ImagePath: movie.ImagePath,
        Featured: movie.Featured
      }))
    };

    res.json(genreData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

//get data on a director (done)
app.get('/movies/director/:name',passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const directorName = req.params.name;
    const movies = await Movies.find({ 'Director.Name': directorName });

    if (movies.length === 0) {
      return res.status(404).send('Director not found');
    }

    const directorData = {
      Name: directorName,
      Bio: movies[0].Director.Bio,
      Movies: movies.map(movie => ({
        Title: movie.Title,
        Description: movie.Description,
        Genre: movie.Genre,
        Actors: movie.Actors,
        ImagePath: movie.ImagePath,
        Featured: movie.Featured
      }))
    };

    res.json(directorData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Get all users (done)
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

// Get a user by username (done)
app.get('/users/:Username',passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//update a user (done)
app.put('/users/:Username',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){
    return res.status(400).send('Permission denied');
}
  if(req.user.Username !== req.params.Username){
    return res.status(400).send('Permission denied');
}
  try {
    const user = await Users.findOne({ Username: req.params.Username });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday
        }
      },
      { new: true }
    );

    res.status(201).json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
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
app.post('/users/:Username/movies/:movieId',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){
    return res.status(400).send('Permission denied');
}
  try {
    const { Username, movieId } = req.params;


    const user = await Users.findOne({ Username: Username });
    if (!user) {
      return res.status(404).send('User not found');
    }


    const movie = await Movies.findById(movieId);
    if (!movie) {
      return res.status(404).send('Movie not found');
    }


    if (user.FavoriteMovies.includes(movieId)) {
      return res.status(400).send('Movie already in favorites');
    }


    user.FavoriteMovies.push(movieId);
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  }
});



//remove a movie from a users favorite movie list (got it)
app.delete('/users/:Username/movies/:movieId',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){
    return res.status(400).send('Permission denied');
}
  try {
    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.Username },
      { $pull: { FavoriteMovies: req.params.movieId } },
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

// Delete a user by username (done)
app.delete('/users/:Username',passport.authenticate('jwt', { session: false }), async (req, res) => {
  if(req.user.Username !== req.params.Username){
    return res.status(400).send('Permission denied');
}
  await Users.findOneAndDelete({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//create a new user (no bcrypt)
/*app.post('/users',async (req, res) => {
  await Users.findOne({ Username: req.body.Username})
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + ' already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: req.body.Password,
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
});*/

//hash user password before storing using bcrypt
app.post('/users',async (req, res) => {
  console.log(req);
  let hashedPassword = Users.hashPassword(req.body.Password);
  console.log(hashedPassword);
  await Users.findOne({ Username: req.body.Username})
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

  // listen for requests
app.listen(8080, () => {
   console.log('Your app is listening on port 8080.');
});