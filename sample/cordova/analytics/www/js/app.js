angular.module("SampleApp", ['ngGoogleAnalytics'])
.config(function(gaProvider) {
  gaProvider.init('UA-74326119-1', 'com.google.samples.quickstart.analytics', 'Default Demo App Android: com.google.samples.quickstart.analytics', '1.0');
})
.controller('MainCrtl', function(ga, $scope) {
  $scope.trackScreen = function() {
    ga.trackScreenView('demo5');
  };
  $scope.trackEvent = function() {
    ga.trackEvent('demo action2', 'demo cate2', 'demo label2', 123);
  };
  $scope.trackTiming = function() {
    ga.trackTiming('demo time', 'demo lookup', 30000);
  };
});