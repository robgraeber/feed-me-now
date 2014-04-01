
/**
 * Module dependencies.
 */
var express = require('express');
var Promise = require('bluebird');
var config = require('./config');
var foodPhrases = require('./foodPhrases');
var excludedPhrases = require('./excludedPhrases');
var http = require('http');
var path = require('path');
var request = Promise.promisifyAll(require('request'));
var _ = require('underscore');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/results', function(req, res){
  var address = req.query.address || "";
  var time = req.query.time || "12:00";
  var radius = req.query.radius || 5;
  var googleApiKey = config.googleApiKey;
  var meetupApiKey = config.meetupApiKey;
  console.log("address:", address, "time:", time);
  
  request.getAsync({url:"https://maps.googleapis.com/maps/api/geocode/json", qs:{key:googleApiKey, sensor:"false", address:address}})
  .then(function(response){
    var body = JSON.parse(response[0].body);
    if(body.status === "OK"){
      var lat = body.results[0].geometry.location.lat;
      var lng = body.results[0].geometry.location.lng;
      return {lat: lat, lng:lng};
    }else {
      console.log("API Error:", body.status);
      res.send(200, {results:{}, status: body.status});
      return null;
    }})
  .then(function(data){
    if(!data){
      return;
    }
    console.log("Lat:", data.lat, "Long:", data.lng, "Status: OK");
    request.getAsync({url:"https://api.meetup.com/2/open_events.json", qs:{key:meetupApiKey, lat:data.lat, lon:data.lng, radius:radius}})
    .then(function(response){
      var body = JSON.parse(response[0].body);
      var results = _.filter(body.results, function(item){
        return !item.fee && item.yes_rsvp_count >= 20;
      });
      console.log((new Date()).getTime());
      results = _.filter(results, function(item){
        var hasFood = false;
        var foodProvided = [];

        _.each(foodPhrases.regexpList, function(regexp){
          var matches = item.description.match(regexp);
          if(matches){
            hasFood = true;
            foodProvided = foodProvided.concat(matches);
          }
        });
        _.each(foodProvided, function(food){
          food = food.toLowerCase();
        });
        item.foodProvided = foodProvided;
        return hasFood;
      });
      results = _.filter(results, function(item){
        var isValid = true;
        _.each(excludedPhrases.regexpList, function(regexp){
          var matches = item.description.match(regexp);
          if(matches){
            isValid = false;
          }
        });
        return isValid;
      });
      console.log((new Date()).getTime());
      res.send(200, {results:results, status: "OK"});
    });
  });
  
});
// app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
