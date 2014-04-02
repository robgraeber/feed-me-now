window.app = angular.module('myApp', [
  'ngRoute',
]);
 
app.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      templateUrl: '/templates/home.html',
       controller: 'HomeController'
    })
    .when('/search', {
      templateUrl: '/templates/search.html',
       controller: 'SearchController'
    });
});
app.service('SearchService', function($http){
  var timeText, i, timePeriod;
  this.times = [];
  for(i = 0; i<48; i++){
    if(i<24){
      timePeriod = " AM";
    }else{
      timePeriod = " PM";
    }

    if(i < 24){
      if(i <= 1){
        timeText = 12+":";
      }else{
        timeText = Math.floor(i/2)+":";
      }
    }else{
      if(i <= 25){
        timeText = 12+":";
      }else{
        timeText = Math.floor(i/2)-12+":";
      }
    }
    if(i%2 === 1){
      timeText += "30"+timePeriod;
    }else {
      timeText += "00"+timePeriod;
    }
    var time = moment(moment().format('LL')+" "+timeText).toDate().getTime();
    // console.log(moment().format('LL')+" "+timeText);
    this.times.push({text:timeText, time:time});
  }
 
  this.searchMe = function(address, time){
    console.log("GET /results from server, address:", address, "time:", time);
    return $http({
      url: "/results", 
      method: "GET",
      params: {address: address, time: time}
    }).then(function(response){
      return response.data;
    });
  };
});

app.controller('HomeController',function($scope, SearchService, $location){
  $scope.times = SearchService.times;
  $scope.time = {};
  var currentTime = (new Date()).getTime();
  //sets default select menu time to current time
  for(var i = $scope.times.length-1; i >= 0; i--){
    if(currentTime > $scope.times[i].time){
      $scope.time = $scope.times[i];
      break;
    }
  }
  $scope.submit = function(){
    //pass query parameters and redirect to search route
    console.log("Params:", $scope.time);
    $location.path("search");
    $location.search("a", $scope.address);
    if(!!$scope.time.time){
      $location.search("t", $scope.time.time+"");
    }
  };
});
app.controller('SearchController',function($scope, SearchService, $location, $routeParams, $interval){
  $scope.times = SearchService.times;
  $scope.address = $routeParams.a || "";
  for(var i = 0; i < $scope.times.length; i++){
    if($scope.times[i].time+"" === $routeParams.t){
      $scope.time = $scope.times[i];
      break;
    }
  }
  $scope.moment = moment;
  SearchService.searchMe($routeParams.a, $routeParams.t).then(function(data){
    console.log("result data:", data);
    var obj = {};
    //marks if item is first event of the day
    _.each(data.results, function(item){
      if(!obj[moment(item.time).format("dd")]){
        obj[moment(item.time).format("dd")] = true;
        item.firstEvent = true;
      }
    });
    $scope.results = [];

    if(data.results.length){ 
      $scope.results.push(data.results.shift());
    }else{
      $scope.errorText = "No meetups found :(";
    }
    if(data.results.length > 0){
      $interval(function(){
        $scope.results.push(data.results.shift());
      }, 50, data.results.length);
    }
    $scope.finishedLoading = true;
  });

  $scope.submit = function(){
    //update query parameters and search again
    $location.path("search");
    $location.search("a", $scope.address);
    if($scope.time && !!$scope.time.time){
      $location.search("t", $scope.time.time+"");
    }
  };
  var updateCounter = 1;
  var updateLoadingText = function(){
    if(updateCounter === 1){
      $scope.loadingText = "Loading";
    }else if(updateCounter === 2){
      $scope.loadingText = "Loading.";
    }else if(updateCounter === 3){
      $scope.loadingText = "Loading..";
    }else if(updateCounter === 4){
      updateCounter = 0;
      $scope.loadingText = "Loading...";
    }
    updateCounter++;
  };
  updateLoadingText();
  $interval(updateLoadingText, 440);
  //formatting numbers to 2 decimals
  $scope.round = function(num){
    return Math.floor(num * 10)/10;
  };


});
