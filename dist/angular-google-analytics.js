(function() {
  /**
 * A hierarchical token bucket for rate limiting. See
 * http://en.wikipedia.org/wiki/Token_bucket for more information.
 * @author John Hurliman <jhurliman@cull.tv>
 *
 * @param {Number} bucketSize Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param {Number} tokensPerInterval Number of tokens to drip into the bucket
 *  over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 */
var TokenBucket = function(bucketSize, tokensPerInterval, interval) {
  this.bucketSize = bucketSize;
  this.tokensPerInterval = tokensPerInterval;

  if (typeof interval === 'string') {
    switch (interval) {
      case 'sec': case 'second':
        this.interval = 1000; break;
      case 'min': case 'minute':
        this.interval = 1000 * 60; break;
      case 'hr': case 'hour':
        this.interval = 1000 * 60 * 60; break;
      case 'day':
        this.interval = 1000 * 60 * 60 * 24; break;
    }
  } else {
    this.interval = interval;
  }

  this.content = 0;
  this.lastDrip = +new Date();
};

TokenBucket.prototype = {
  bucketSize: 1,
  tokensPerInterval: 1,
  interval: 1000,
  content: 0,
  lastDrip: 0,

  /**
   * Remove the requested number of tokens.
   * @param {Number} count The number of tokens to remove.
   * @returns {Boolean} True if transaction has been accepted, false otherwise
   */
  accept: function(count) {
    var self = this;

    // Is this an infinite size bucket?
    if (!this.bucketSize) {
      return true;
    }

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize) {
      return false;
    }

    // Drip new tokens into this bucket
    this.drip();

    // If we don't have enough tokens in this bucket, do nothing
    if (count > this.content) {
      return false;
    }

    // Remove the requested tokens from this bucket and fire the callback
    this.content -= count;
    return true;
  },

  /**
   * Add any new tokens to the bucket since the last drip.
   * @returns {Boolean} True if new tokens were added, otherwise false.
   */
  drip: function() {
    if (!this.tokensPerInterval) {
      this.content = this.bucketSize;
      return false;
    }
    var now = +new Date();
    var deltaMS = Math.max(now - this.lastDrip, 0);
    this.lastDrip = now;

    if(deltaMS > this.interval) {
      var dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
      this.content = Math.min(this.content + dripAmount, this.bucketSize);
      return true;
    } else {
      return false;
    }
  }
};

window.TokenBucket = TokenBucket;
})();

(function(TokenBucket) {
/**
 * A generic rate limiter. Underneath the hood, this uses a token bucket plus
 * an additional check to limit how many tokens we can remove each interval.
 * @author John Hurliman <jhurliman@cull.tv>
 * @param {Number} bucketSize  Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param {Number} tokensPerInterval Maximum number of tokens that can be
 *  removed at any given moment and over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 */
var RateLimiter = function(bucketSize, tokensPerInterval, interval) {
  //this.tokenBucket = new TokenBucket(tokensPerInterval, tokensPerInterval, interval);
  this.tokenBucket = new TokenBucket(bucketSize, tokensPerInterval, interval);

  // Fill the token bucket to start
  this.tokenBucket.content = bucketSize;

};

RateLimiter.prototype = {
  tokenBucket: null,

  /**
   * Attempt to remove the requested number of tokens and return immediately.
   * If the bucket  contains enough tokens this will
   * return true, otherwise false is returned.
   * @param {Number} count The number of tokens to remove.
   * @param {Boolean} True if the tokens were successfully removed, otherwise
   *  false.
   */
  accept: function(count) {
    // Make sure the request isn't for more than we can handle
    if (count > this.tokenBucket.bucketSize) {
      return false;
    }

    // Remove the requested number of tokens from the token bucket
    return this.tokenBucket.accept(count);
  }
};

window.RateLimiter = RateLimiter;

})(TokenBucket);
(function() {
  angular.module('ngGoogleAnalytics', [])
  .config(["$httpProvider", function($httpProvider) {
    $httpProvider.defaults.headers.common = {};
    $httpProvider.defaults.headers.post = {};
    $httpProvider.defaults.headers.put = {};
    $httpProvider.defaults.headers.patch = {};
  }])
  .run(["$rootScope", "ga", function($rootScope, ga) {
    $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      var screenView = toState.analyticName || toState.name;
      ga.trackScreenView(screenView);
    });
  }])
  .provider('ga', function() {
    $get.$inject = ["$http"];
    var limiter = new RateLimiter(20, 2, 1000);
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

    // hold list of timings tracking start point
    var timings = {};

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
      var cid = window.localStorage.getItem('analytics-cid');
      if(!cid) {
        cid = (window.device && window.device.uuid) || _generateUUID();
        window.localStorage.setItem('analytics-cid', cid);
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
          if(value != null) params.ev = value;
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

      function startTiming(key) {
        timings[key] = Date.now();
      }

      function sendTiming(key, category, lookup, label) {
        if(timings[key]) {
          var timeHavePassed = Date.now() - timings[key];
          category = category || key;
          trackTiming(category, lookup, timeHavePassed, label);
          timings[key] = null;
        }
      }

      return {
        trackScreenView: trackScreenView,
        trackEvent: trackEvent,
        trackTiming: trackTiming,
        startTiming: startTiming,
        sendTiming: sendTiming
      };
    }
    return {
      init: init,
      $get: $get
    };
  })
  .directive('analyticsOn', ["ga", function(ga) {
    return {
      restrict: 'A',
      link: function($scope, $element, $attrs) {
        var eventType = $attrs.analyticsOn || 'click';
        $element.on(eventType, function ($event) {
          var eventName = $attrs.analyticsEvent || eventType;
          var eventCategory = $attrs.analyticsCategory || 'mobile';
          var eventLabel = $attrs.analyticsLabel || 'default';
          var eventValue = $attrs.analyticsValue || 0;
          $scope.$apply(function() {
            ga.trackEvent(eventName, eventCategory, eventLabel, eventValue);
          });
        });
      }
    }
  }]);
})();