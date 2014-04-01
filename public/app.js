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
    console.log(moment().format('LL')+" "+timeText);
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
app.controller('SearchController',function($scope, SearchService, $location, $routeParams){
  $scope.times = SearchService.times;
  $scope.address = $routeParams.a || "";
  $scope.time = {text:$routeParams.t};
  $scope.moment = moment;
  SearchService.searchMe($routeParams.a, $routeParams.t).then(function(data){
    console.log("result data:", data);
    $scope.results = data.results;
  });

  $scope.submit = function(){
    //update query parameters and search again
    console.log("Time:",$scope.time);
    $location.path("search");
    $location.search("a", $scope.address);
    if(!!$scope.time.time){
      $location.search("t", $scope.time.time+"");
    }
  };


});
