const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require("./Movies");
const Review = require("./Reviews");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(passport.initialize());

const router = express.Router();

function getJSONObjectForMovieRequirement(req, msg) {
    let json = {
        message: msg,
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function (req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        let user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function (err) {
            if (err) {
                if (err.code == 11000)
                    return res.json({success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    let userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function (isMatch) {
            if (isMatch) {
                let userToken = {id: user.id, username: user.username};
                let token = jwt.sign(userToken, process.env.SECRET_KEY, null, null);
                res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});



router.route('/movies/*')
    .get(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        Movie.findOne({ title: req.params[0] }, function(err, movie) {
            if (err) {
                res.send(err);
            }
            else if (!movie) {
                res.status(400).json({ success: false, message: "Movie not found" })
            }
            else {
                if (req.query.reviews === 'true') {
                    Movie.aggregate( [
                        {
                            $match:
                                {
                                    title: req.params[0]
                                },
                        },
                        {
                            $lookup:
                                {
                                    from: "reviews",
                                    localField: "title",
                                    foreignField: "title",
                                    as: "movieReview"
                                }
                        },
                        {
                            $addFields:
                                {
                                    averageRating: { $avg: "$movieReview.rating"}
                                }
                        }
                    ]).exec( function( err, movieReview) {
                        if (err) {
                            res.status( 500 ).json({ success: false, message: "Failed get reviews" })
                        }
                        else {
                            return res.status(200).json(movieReview)
                        }
                    })
                }
                else {
                    res.status(200).json(movie)
                }
            }
        })
    })
    // .put( authJwtController.isAuthenticated, function (req, res) {
    //     console.log(req.body);
    //     Movie.findOneAndUpdate({ title: req.params[0] }, req.body, { new: true }, function(err) {
    //         if (err) {
    //             res.status(400).json({ success: false, message: "Failed to update movie" })
    //         }
    //         else {
    //             res.status(200).json({ success: true, message: "Movie updated" })
    //         }
    //     })
    // })
    // .delete(authJwtController.isAuthenticated, function(req, res) {
    //     // console.log(req.body);
    //     // Movie.remove({ title: req.params[0] }, (err) => {
    //     //     if (err) {
    //     //         res.status(400).json({ success: false, message: "Failed to delete movie" })
    //     //     }
    //     //     else {
    //     //         res.status(200).json({ success: true, message: "Movie deleted" })
    //     //     }
    //     // })
    //     //     .delete(authJwtController.isAuthenticated, function (req, res) {
    //     console.log(req.body);
    //     // res = res.status(200);
    //     if (req.get('Content-Type')) {
    //         res = res.type(req.get('Content-Type'));
    //     }
    //     Movie.find({title: req.params[0]}).exec(function (err, movie) {
    //         if (err) {
    //             res.send(err);
    //         }
    //         console.log(movie);
    //         if (movie.length < 1) {
    //             res.status(400).json({success: false, message: 'Title not found.'});
    //         } else {
    //             Movie.deleteOne({title: req.params[0]}).exec(function (err) {
    //                 if (err) {
    //                     res.send(err);
    //                 } else {
    //                     var o = getJSONObjectForMovieRequirement(req, 'movie deleted');
    //                     res.json(o);
    //                 }
    //             })
    //         }
    //     })
    // })
    // })

router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        Movie.find({}, function (err, movies) {
            if (err) {
                res.status(401).json({ success: false, message: "Failed to get movies" })
            }
            else {
                if (req.query.reviews === 'true') {
                    Movie.aggregate( [
                        {
                            $match:
                                {
                                    title: req.params[0]
                                },
                        },
                        {
                            $lookup:
                                {
                                    from: "reviews",
                                    localField: "title",
                                    foreignField: "title",
                                    as: "movieReview"
                                }
                        },
                        {
                            $addFields:
                                {
                                    averageRating: { $avg: "$movieReview.rating"}
                                }
                        }
                    ]).sort({ averageRating: -1 }).exec( function(err, movieReview) {
                        if (err) {
                            res.status(500).json({ success: false, message: "Failed to get movies" })
                        }
                        else {
                            res.status(200).json(movieReview)
                        }
                    })
                }
                else {
                    res.status(200).json(movies)
                }
            }
        })
    })
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);

        const genres = ["Action", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Thriller", "Western"];

        if (!req.body.genre) {
            res.json({success: false, message: 'Movie must contain a genre.'})
        }
        else if (!genres.includes(req.body.genre)) {
            res.json({success: false, message: "Invalid genre.", accepted_genres: genres})
        }
        else if (req.body.yearReleased.length < 4) {
            res.json({success: false, message: 'yearReleased must be at least 4 digits.'})
        }
        else if (req.body.actors.length < 3) {
            res.json({success: false, message: 'Movie must contain at least three actors.'})
        }
        else {
            let movieNew = new Movie();
            movieNew.title = req.body.title;
            movieNew.yearReleased = req.body.yearReleased;
            movieNew.genre = req.body.genre;
            movieNew.actors = req.body.actors;
            movieNew.imgURL = req.body.imgURL;

            if (req.get('Content-Type')) {
                res = res.type(req.get('Content-Type'));
            }

            movieNew.save(function (err) {
                if (err) {
                    if (err.code === 11000)
                        return res.json({success: false, message: 'A movie with that title already exists.'});
                    else
                        return res.json(err);
                } else {
                    var o = getJSONObjectForMovieRequirement(req, 'movie saved');
                    res.json(o)
                }
            })
        }
    })

router.route('/reviews')
    .get(authJwtController.isAuthenticated, function (req, res) {
        Review.find({}, function (err, reviews) {
            if (err) {
                res.status(401).json({ success: false, message: "Failed to get reviews" })
            }
            else {
                res.status(200).json(reviews)
            }
        })
    })
    .post(authJwtController.isAuthenticated, function (req, res) {
        if (!req.body.title) {
            res.status(400).json({success: false, message: 'Title must be included to post reviews.'})
        }
        else if (!req.body.review) {
            res.status(400).json({success: false, message: 'Must include a review'})
        }
        else if (!req.body.rating) {
            res.status(400).json({success: false, message: 'Must include a rating'})
        }
        else if (!req.body.reviewerName) {
            res.status(400).json({success: false, message: 'Must include name of reviewer'})
        }
        else {
            Movie.findOne({ title: req.body.title }, function (err, movie) {
                if (err) {
                    res.json(err)
                }
                else if (!movie) {
                    res.status(400).json({success: false, message: 'Movie not found'})
                }
                else {
                    let reviewNew = new Review();
                    reviewNew.title = req.body.title;
                    reviewNew.reviewerName = req.body.reviewerName;
                    reviewNew.review = req.body.review;
                    reviewNew.rating = req.body.rating;

                    if (req.get('Content-Type')) {
                        res = res.type(req.get('Content-Type'));
                    }

                    reviewNew.save(function (err) {
                        if (err) {
                            res.send(err);
                        }
                        else {
                            let o = getJSONObjectForMovieRequirement(req, 'review saved');
                            res.json(o)
                        }
                    });
                }
            })
        }
    })


// router.route('/movies')
//     .get(authJwtController.isAuthenticated, function (req, res) {
//         console.log(req.body);
//         res = res.status(200);
//
//         if (req.get('Content-Type')) {
//             res = res.type(req.get('Content-Type'));
//         }
//
//         Movie.find().exec(function (err, movies) {
//             if (err) {
//                 res.send(err);
//             }
//             if (movies.length < 1) {
//                 res.json({success: false, message: 'No movies found.'});
//             }
//             else if (req.body.title) {
//                 for (let i = 0; i < movies.length; i++) {
//                     if (movies[i].title === req.body.title) {
//                         return res.json(movies[i]);
//                     }
//                     else {
//                         return res.json({success: false, message: 'Movie not found. If searching for reviews,' +
//                                 'review paramater must be included in query.'})
//                     }
//                 }
//             }
//             else {
//                 res.json(movies);
//             }
//         })
//     })
//     .post(authJwtController.isAuthenticated, function (req, res) {
//         console.log(req.body);
//         res = res.status(200);
//         const genres = ["Action", "Comedy", "Drama", "Fantasy", "Horror", "Mystery", "Thriller", "Western"];
//
//         if (!req.body.genre) {
//             res.json({success: false, message: 'Movie must contain a genre.'})
//         }
//         else if (!genres.includes(req.body.genre)) {
//             res.json({success: false, message: "Invalid genre.", accepted_genres: genres})
//         }
//         else if (req.body.yearReleased.length < 4) {
//             res.json({success: false, message: 'yearReleased must be at least 4 digits.'})
//         }
//         else if (req.body.actors.length < 3) {
//             res.json({success: false, message: 'Movie must contain at least three actors.'})
//         }
//         else {
//             let movieNew = new Movie();
//             movieNew.title = req.body.title;
//             movieNew.yearReleased = req.body.yearReleased;
//             movieNew.genre = req.body.genre;
//             movieNew.actors = req.body.actors;
//             movieNew.imgURL = req.body.imgURL;
//             movieNew.test = req.body.test;
//
//             if (req.get('Content-Type')) {
//                 res = res.type(req.get('Content-Type'));
//             }
//
//             movieNew.save(function (err) {
//                 if (err) {
//                     if (err.code === 11000)
//                         return res.json({success: false, message: 'A movie with that title already exists.'});
//                     else
//                         return res.json(err);
//                 } else {
//                     var o = getJSONObjectForMovieRequirement(req, 'movie saved');
//                     res.json(o)
//                 }
//             });
//         }
//     })
//
// router.route('/movies/:reviews')
//     .post(authJwtController.isAuthenticated, function (req, res) {
//         console.log(req.body);
//         res = res.status(200);
//
//         Movie.find().exec(function (err, movies) {
//             if (err) {
//                 res.send(err);
//             }
//             let found = false;
//
//             for (let i = 0; i < movies.length; i++) {
//                 if (movies[i].title === req.body.title) {
//                     found = true;
//                 }
//             }
//             if (!found) {
//                 return res.json({success: false, message: 'Movie not found'});
//             }
//         })
//
//         if (!req.body.title) {
//             res.json({success: false, message: 'Title must be included to post reviews.'})
//         }
//         else if (!req.body.review) {
//             res.json({success: false, message: 'Must include a review'})
//         }
//         else {
//             let reviewNew = new Review();
//             reviewNew.title = req.body.title;
//             reviewNew.reviewerName = req.body.reviewerName;
//             reviewNew.review = req.body.review;
//             reviewNew.rating = req.body.rating;
//
//             if (req.get('Content-Type')) {
//                 res = res.type(req.get('Content-Type'));
//             }
//
//             reviewNew.save(function (err) {
//                 if (err) {
//                     return res.send(err);
//                 }
//                 else {
//                     let o = getJSONObjectForMovieRequirement(req, 'review saved');
//                     res.json(o)
//                 }
//             });
//         }
//     })
//     .get(function (req, res) {
//         console.log(req.body);
//         res = res.status(200);
//
//         if (req.get('Content-Type')) {
//             res = res.type(req.get('Content-Type'));
//         }
//
//         Movie.find().exec(function (err) {
//             if (err) {
//                 res.send(err);
//             }
//             else {
//                 Movie.aggregate(
//                     [
//                         {
//                             $lookup: {
//                                 from: "reviews",
//                                 localField: "title",
//                                 foreignField: "title",
//                                 as: "movieReview"
//                             },
//                         },
//                         {
//                             $match: { "title": req.body.title },
//                         },
//                         {
//                             $addFields: {
//                                 averageRating: { $avg: "$movieReview.rating"}
//                             }
//                         }
//                     ])
//                     .then ((result) => {
//                         console.log(result);
//                         return res.json(result);
//                     })
//             }
//         })
//     })
//
router.route('/movies/:title')
//     .get(authJwtController.isAuthenticated, function (req, res) {
//         console.log(req.body);
//         res = res.status(200);
//
//         if (req.get('Content-Type')) {
//             res = res.type(req.get('Content-Type'));
//         }
//         Movie.find({title: req.params.title}).exec(function (err, movie) {
//             if (err) {
//                 res.send(err);
//             }
//             res.json(movie);
//         })
//     })
    .delete(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        Movie.find({title: req.params.title}).exec(function (err, movie) {
            if (err) {
                res.send(err);
            }
            console.log(movie);
            if (movie.length < 1) {
                res.json({success: false, message: 'Title not found.'});
            } else {
                Movie.deleteOne({title: req.params.title}).exec(function (err) {
                    if (err) {
                        res.send(err);
                    } else {
                        var o = getJSONObjectForMovieRequirement(req, 'movie deleted');
                        res.json(o);
                    }
                })
            }
        })
    })
    .put(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        res = res.status(200);
        if (req.get('Content-Type')) {
            res = res.type(req.get('Content-Type'));
        }
        Movie.updateOne({title: req.params.title}, {
            title: req.body.title,
            yearReleased: req.body.yearReleased, genre: req.body.genre, actors: req.body.actors
        })
            .exec(function (err) {
                if (err) {
                    res.send(err);
                }
            })
        var o = getJSONObjectForMovieRequirement(req, 'movie updated');
        res.json(o);
    });

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


