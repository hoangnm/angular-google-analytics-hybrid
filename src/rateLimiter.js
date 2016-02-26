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