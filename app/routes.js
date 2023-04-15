// app/routes.js

var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);
connection.connect(function(err) {
    if (err) throw err
});
connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		connection.query(`SELECT * FROM images`,async function(err, rows){
			if(rows && rows.length) {
				for(let row of rows) {
					let countArr = await sqlQuery(`SELECT COUNT(id) AS count FROM likes WHERE image_id='${row.id}'`)
					row.likes = countArr[0].count
					row.comments = await sqlQuery(`SELECT * FROM comments WHERE image_id='${row.id}'`)
				}
			}
			res.render('index.ejs', {
				user : req.user, // get the user out of session and pass to template
				images: rows
			});
		});
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)

	async function sqlQuery(query) {
		return await new Promise((resolve) => {
			connection.query(query, function(err, rows){
				resolve(rows)
			});
		});
	}

	app.post('/imageLike', isLoggedIn, function(req, res) {
		connection.query(`SELECT * FROM likes WHERE image_id='${req.body.imageId}' AND user_id='${req.body.userId}'`,async function(err, rows){
			if(!(rows && rows.length)) {
				await sqlQuery(`INSERT INTO likes (image_id, user_id, favorite) VALUES ('${req.body.imageId}', '${req.body.userId}', true)`)
				res.send('yes')
			} else {
				res.send('no')
			}
		});
	});

	app.get('/profile', isLoggedIn, function(req, res) {
		connection.query(`SELECT * FROM images WHERE user_id='${req.user.id}'`,async function(err, rows){
			if(rows && rows.length) {
				for(let row of rows) {
					row.likes = await sqlQuery(`SELECT * FROM likes WHERE user_id='${req.user.id}'`)
					row.comments = await sqlQuery(`SELECT * FROM comments WHERE user_id='${req.user.id}'`)
				}
			}
			res.render('profile.ejs', {
				user : req.user, // get the user out of session and pass to template
				images: rows
			});
		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
