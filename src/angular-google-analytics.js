(function() {
  angular.module('ngGoogleAnalytics', [])
  .config(function($httpProvider) {
    $httpProvider.defaults.headers.common = {};
    $httpProvider.defaults.headers.post = {};
    $httpProvider.defaults.headers.put = {};
    $httpProvider.defaults.headers.patch = {};
  })
  .provider('ga', function() {
    var limiter = new RateLimiter(60, 2000);
    var extend = angular.extend;
    var hasInit = false;
    var gaUrl = 'http://www.google-analytics.com/collect';
    var defaultsParams = {
      v: 1,
      tid: null,
      cid: null,
      t: null,
      ds: 'app'
    };
    var HITTYPES = {
      PAGEVIEW: 'pageview',
      SCREENVIEW: 'screenview',
      EVENT: 'event',
      TIMING: 'timing'
    };

    function init(gaId, packageName, appName, appVersion) {
      if(hasInit) return;
      defaultsParams.tid = gaId;
      defaultsParams.cid = _generateCustomerId();
      defaultsParams.aid = packageName;
      defaultsParams.an = appName;
      defaultsParams.av = appVersion;
      hasInit = true;
    }

    function _generateCustomerId() {
      var cid = window.localStorage.getItem('cid');
      if(!cid) {
        cid = (window.device && window.device.uuid) || _generateUUID();
        window.localStorage.setItem('cid', cid);
      }
      return cid;
    }

    function _generateUUID() {
      var d = new Date().getTime();
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
      return uuid;
    }

    function $get($http) {
      function _postData(data) {
        return $http({
          url: gaUrl,
          method: 'POST',
          data: data,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          transformRequest: function(obj) {
            var str = [];
            for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            return str.join("&");
          }
        });
      }

      function _callLimiter(cb) {
        if(limiter.accept(1)) {
          cb();
        }
      }

      function trackScreenView(screenName) {
        if(!hasInit) return;
        _callLimiter(function() {
          var params = extend({}, defaultsParams);
          params.t = HITTYPES.SCREENVIEW;
          params.cd = screenName;
          _postData(params);
        });
      }

      function trackEvent(action, category, label, value) {
        if(!hasInit) return;
        _callLimiter(function() {
          var params = extend({}, defaultsParams);
          params.t = HITTYPES.EVENT;
          params.ea = action;
          params.ec = category;
          if(label) params.el = label;
          if(value) params.ev = value;
          _postData(params);
        });
      }

      function trackTiming(category, lookup, time, label) {
        if(!hasInit) return;
        _callLimiter(function() {
          var params = extend({}, defaultsParams);
          params.t = HITTYPES.TIMING;
          params.utc = category;
          params.utv = lookup;
          params.utt = time;
          if(label) params.utl = label;
          _postData(params);
        });
      }

      return {
        trackScreenView: trackScreenView,
        trackEvent: trackEvent,
        trackTiming: trackTiming
      };
    }
    return {
      init: init,
      $get: $get
    }
  })
  .directive('analyticsOn', function(ga) {
    return {
      restrict: 'A',
      link: function($scope, $element, $attrs) {
        var eventType = $attrs.analyticsOn || 'click';
        $element.on(eventType, function ($event) {
          var eventName = $attrs.analyticsEvent || eventType;
          var eventCategory = $attrs.analyticsCategory || 'mobile';
          var eventLabel = $attrs.analyticsLabel;
          var eventValue = $attrs.analyticsValue;
          $scope.$apply(function() {
            ga.trackEvent(eventName, eventCategory, eventLabel, eventValue);
          });
        });
      }
    }
  });
})();