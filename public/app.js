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
  this.times = [];
  for(var i = 0; i<48; i++){
    var timeText = Math.floor(i/2)+":";
    if(i%2 === 1){
      timeText += "30";
    }else {
      timeText += "00";
    }
    this.times.push({text:timeText});
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
    $location.search("t", $scope.time.text);
  };
});
app.controller('SearchController',function($scope, SearchService, $location, $routeParams){
  $scope.times = SearchService.times;
  $scope.address = $routeParams.a || "";
  $scope.time = {text:$routeParams.t};
  SearchService.searchMe($routeParams.a, $routeParams.t).then(function(data){
    console.log("result data:", data);
    $scope.results = data.results;
  });

  $scope.submit = function(){
    //update query parameters and search again
    $location.path("search");
    $location.search("a", $scope.address);
    $location.search("t", $scope.time.text);
  };


});
