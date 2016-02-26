var gulp        = require('gulp');
var browserSync = require('browser-sync').create();

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