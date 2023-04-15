// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var session  = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');

const path = require('path');
const formidable = require('formidable');
const fs = require('fs');

var mysql = require('mysql');
var dbconfig = require('./config/database');
var connection = mysql.createConnection(dbconfig.connection);
connection.connect(function(err) {
    if (err) throw err
});
connection.query('USE ' + dbconfig.database);


var app      = express();
var port     = process.env.PORT || 8080;

var passport = require('passport');
var flash    = require('connect-flash');

// configuration ===============================================================
// connect to our database

require('./config/passport')(passport); // pass passport for configuration


app.use(express.static(__dirname + '/public'));
// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
	secret: 'vidyapathaisalwaysrunning',
	resave: true,
	saveUninitialized: true
 } )); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);

//===================================================
const allowedFileTypes = ['image/jpeg', 'image/png'];
app.post('/uploadfile',function(req, res) {
	console.log("user====>", req.user.id)
	// create an incoming form object
	var form = new formidable.IncomingForm();
	// specify that we want to allow the user to upload multiple files in a single request
	form.multiples = true;
	form.keepExtensions = true;
	// store all uploads in the /uploads directory
	form.uploadDir = 'public/uploads'
	// every time a file has been uploaded successfully,
	// rename it to it's orignal name
	form.on('file', function(field, file) {
		console.log('file===>', file.mimetype)
		if(allowedFileTypes.indexOf(file.mimetype) < 0) return;
		const newFileName = file.newFilename + "_"+file.originalFilename
		fs.rename(file.filepath, path.join(form.uploadDir, newFileName), function(err){
				if (err) throw err;
				//console.log('renamed complete: '+file.name);
				connection.query(`INSERT INTO images(name, path, user_id) VALUES ('${file.originalFilename}', 'uploads/${newFileName}', '${req.user.id}')`, function(err, rows){
        });
		});
	});
	// log any errors that occur
	form.on('error', function(err) {
			console.log('An error has occured: \n' + err);
	});
	// once all the files have been uploaded, send a response to the client
	form.on('end', function() {
			 //res.end('success');
			 res.statusMessage = "Process cashabck initiated";
			 res.statusCode = 200;
			 res.redirect('/profile')
			 res.end()
	});
	// parse the incoming request containing the form data
	form.parse(req);
});
