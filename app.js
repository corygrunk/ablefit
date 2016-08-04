var dotenv = require('dotenv');
  dotenv.config({silent: true});
  dotenv.load();
var express = require('express');
var app = express();
var request = require('request');
var url = require('url');

var clientToken = "";

var userId = "",
    accessToken = "",
    refreshToken = "";

var userAuthUrl = "https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=" + process.env.CLIENT_ID +
"&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=heartrate%20profile%20weight&expires_in=604800";

var apiEndpoint = "https://api.fitbit.com/1/user/-/profile.json";

var currentHeartrate = '0';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));


// GET USER TOKENS
var getUserTokens = function () {
  var headers = {
    'Authorization': 'Basic ' + process.env.CLIENT_AUTH,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  dataString = "clientId=" + process.env.CLIENT_ID + "&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&code=" + clientToken,
  options = {
      url: 'https://api.fitbit.com/oauth2/token',
      method: 'POST',
      headers: headers,
      body: dataString
  };
  function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
          userId = JSON.parse(body).user_id;
          accessToken = JSON.parse(body).access_token;
          refreshToken = JSON.parse(body).refresh_token;
      } else {
        console.log(body);
      }
  }
  request(options, callback);
};


// MAKE REQUEST
var getHeartrate = function () {
  var headers = {
      'Authorization': 'Bearer ' + accessToken
    },
    options = {
      url: apiEndpoint,
      headers: headers
    };
  function callback(error, response, body) {
      if (!error && response.statusCode == 200) {
          console.log(JSON.parse(body));
          currentHeartrate = JSON.parse(body).user.age;
      } else {
        console.log(body);
        currentHeartrate = 'Error connecting to Fitbit. Try re-authenicating.';
      }
  }
  request(options, callback);
};

var parseUrlForClientToken = function (url) {
  var s = url.split('=');
  clientToken = s[1];
};



// EXPRESS SERVER

app.get('/', function (req, res) {
  res.render('index.jade', {pageData: { authUrl : userAuthUrl}});
});

app.get('/callback', function (req, res) {
  parseUrlForClientToken(req.originalUrl);
  getUserTokens();
  getHeartrate();
  res.render('callback.jade', {pageData: { heartrate : currentHeartrate}});
});

app.listen(3000, function () {
  console.log('Listening on port 3000.');
});
