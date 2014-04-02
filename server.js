
/**
 * Module dependencies.
 */
var express = require('express');
var Promise = require('bluebird');
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
  var time;
  if(!req.query.time || req.query.time === "undefined"){
    time = (new Date()).getTime(); //set to current time if undefined
  }else{
    time = req.query.time;
  }
  var radius = req.query.radius || 5;
  var googleApiKey = process.env.GOOGLEAPIKEY || "123FAKEKEY";
  var meetupApiKey = process.env.MEETUPAPIKEY || "123FAKEKEY";
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
    //searches meetup api with lat, lon, and time to be minus 5 hours of setting. Time gets hard filtered elsewhere.
    request.getAsync({url:"https://api.meetup.com/2/open_events.json", qs:{key:meetupApiKey, lat:data.lat, lon:data.lng, radius:"smart", limited_events:"false", text_format:"plain", time:time-5*60*60*1000+","}})
    .then(function(response){
      var body = JSON.parse(response[0].body);
      // console.log("Meetup result count:", body.results.length);
      var results = body.results;
      //filters for fees and meetup size and public venue
      results = _.filter(body.results, function(item){
        return !item.fee && item.yes_rsvp_count >= 20 && item.distance; //&& item.venue && item.venue.name;
      });
      //filters for foods terms and adds found foods to json
      results = _.filter(results, function(item){
        var hasFood = false;
        var foodProvided = [];

        _.each(foodPhrases.regexpList, function(regexp){
          if(!item.description){
            return;
          }
          var matches = item.description.match(regexp);
          if(matches){
            hasFood = true;
            foodProvided = foodProvided.concat(matches);
          }
        });
        foodProvided = _.map(foodProvided, function(food){
          return food.toLowerCase().trim();
        });
        item.foodProvided = foodProvided;
        return hasFood;
      });
      //filters for excluded terms
      results = _.filter(results, function(item){
        var isValid = true;
        if(!item.description){
          return;
        }
        _.each(excludedPhrases.regexpList, function(regexp){
          var matches = item.description.match(regexp);
          if(matches){
            isValid = false;
          }
        });
        return isValid;
      });
      //filters if target time is after event ended (minus 30 minutes)
      results = _.filter(results, function(item){
        var isValid = true;
        return time < item.time + item.duration - 30*60*1000;
      });
      //filters duplicate events that share time and venue name
      var obj = {};
      _.each(results, function(item){
        item.venue = item.venue || {};
        obj[item.time+""+item.venue.name] = item;
      });
      results = _.map(obj, function(value, key){
        return value;
      });
      res.send(200, {results:results, status: "OK"});
    });
  });
  
});
// app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
