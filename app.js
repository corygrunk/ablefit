var dotenv = require('dotenv');
  dotenv.config({silent: true});
  dotenv.load();
var express = require('express');
var app = express();
var request = require('request');
var url = require('url');
var http = require('http');

var apiLink = "";
var getUrlToken = "";

// PROD ENV
var siteUrl = "http://ablefit.herokuapp.com";
// DEV ENV
// var siteUrl = "http://localhost:3000";

// PROD ENV
var userAuthUrl = "https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=" + process.env.CLIENT_ID + "&redirect_uri=http%3A%2F%2Fablefit.herokuapp.com%2Fcallback&scope=heartrate%20profile%20weight&expires_in=604800";
// DEV ENV
// var userAuthUrl = "https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=" + process.env.CLIENT_ID +
"&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=heartrate%20profile%20weight&expires_in=604800";

// PROD ENV
var getTokenDataString = "clientId=" + process.env.CLIENT_ID + "&grant_type=authorization_code&redirect_uri=http%3A%2F%2Fablefit.herokuapp.com%2Fcallback&code=" + clientToken;
// DEV ENV
// var getTokenDataString = "clientId=" + process.env.CLIENT_ID + "&grant_type=authorization_code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&code=" + clientToken;

var apiEndpoint = "https://api.fitbit.com/1/user/-/profile.json";

var currentHeartrate = '0';

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));


// GET USER TOKENS
var getUserTokens = function (callback) {
  var headers = {
    'Authorization': 'Basic ' + process.env.CLIENT_AUTH,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  dataString = getTokenDataString,
  options = {
      url: 'https://api.fitbit.com/oauth2/token',
      method: 'POST',
      headers: headers,
      body: dataString
  };
  function callback1(error, response, body) {
      if (!error && response.statusCode == 200) {
        callback(JSON.parse(body));
      } else {
        console.log(body);
        callback(JSON.parse(body));
      }
  }
  request(options, callback1);
};


// MAKE REQUEST
var getHeartrate = function (obj, callback) {
  var headers = {
      'Authorization': 'Bearer ' + obj.access_token
    },
    options = {
      url: apiEndpoint,
      headers: headers
    };
  function callback2(error, response, body) {
      if (!error && response.statusCode == 200) {
        var bodyObj = JSON.parse(body);
        bodyObj.user.access_token = obj.access_token;
        callback(bodyObj);
      } else {
        callback(JSON.parse(body));
      }
  }
  request(options, callback2);
};

var parseUrlForClientToken = function (url) {
  var s = url.split('=');
  clientToken = s[1];
};


// EXPRESS MIDDLEWARE

app.use('/callback', function (req, res, next) {
  // console.log('Request Type:', req.method);
  parseUrlForClientToken(req.originalUrl);
  getUserTokens(function (obj) {
    getHeartrate(obj, function (heartrate) {
      if(heartrate.hasOwnProperty("user")){
        apiMsg = "You're authenticated. You can make requests from MAX/MSP to this URL:";
        apiLink = siteUrl + "/api/" + heartrate.user.access_token;
        apiDetails = "The API returns your current heart rate. It updates every 30 seconds.";
        next();
      } else {
        apiMsg = "Uh oh, something went wrong. Try returning to the homepage and re-authenticating.";
        apiLink = siteUrl;
        apiDetails = "";
        next();
      }
    });
  });
});

app.use('/api/:token', function (req, res, next) {
  var obj = {};
  obj.access_token = req.params.token;
  getHeartrate(obj, function (heartrate) {
    if(heartrate.hasOwnProperty("user")){
      currentHeartrate = heartrate.user.age;
      next();
    } else {
      next();
    }
  });
});


// EXPRESS SERVER

app.get('/', function (req, res) {
  res.render('index.jade', {pageData: { authUrl : userAuthUrl}});
});

app.get('/callback', function (req, res) {
  res.render('callback.jade', {pageData: { message : apiMsg, link : apiLink, details : apiDetails }});
});

app.get("/api/:token",function(req, res){
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify({ heartrate : currentHeartrate }));
});

app.listen(3000, function () {
  console.log('Listening on port 3000.');
});
