var gulp        = require('gulp');
var browserSync = require('browser-sync').create();

var uglify      = require('gulp-uglify');
var concat      = require('gulp-concat');
var rename      = require('gulp-rename');
var ngAnnotate  = require('gulp-ng-annotate');

var paths = {
  js: ['./src/tokenBucket.js', './src/rateLimiter.js', './src/angular-google-analytics.js']
}

// Static server
gulp.task('browsersync', function() {
    browserSync.init({
        server: {
            baseDir: ["src", "sample/web"]
        },
        files: "./**/*.js"
    });
    gulp.watch("./sample/web/index.html").on('change', browserSync.reload);
});

// uglify
gulp.task('uglify', function(done) {
    gulp.src(paths.js)
        .pipe(concat('angular-google-analytics.js'))
        .pipe(ngAnnotate())
        .pipe(gulp.dest('./dist/'))
        .pipe(uglify())
        .pipe(rename({
            extname: ".min.js"
         }))
        .pipe(gulp.dest('./dist/'))
        .on('end', done);
});