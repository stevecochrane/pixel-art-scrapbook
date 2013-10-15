module.exports = function(grunt) {

    //  Project configuration.
    grunt.initConfig({

        //  Read in settings from package.json.
        pkg: grunt.file.readJSON('package.json'),

        //  Lint test the JavaScript. (Only the new JS for this app, frameworks not included.)
        jshint: {
            //  Define the files to lint.
            files: [
                'gruntfile.js',
                'js/app.js'
            ]
        },

        //  Concatenate multiple JavaScript files into a single file.
        concat: {
            options: {
                //  Define a string to put between each file in the concatenated output.
                //  The docs say this is a good thing to do when minifying the concatenated output:
                //  https://github.com/gruntjs/grunt-contrib-concat#separator
                separator: ';'
            },
            dist: {
                //  The files to concatenate, in their intended order.
                src: [
                    'js/libs/jquery-1.9.1.js',
                    'js/libs/handlebars-1.0.0.js',
                    'js/libs/ember-1.0.0.js',
                    'js/app.js'
                ],
                //  The location of the resulting JS file.
                dest: 'dist/<%= pkg.name %>.js'
            }
        },

        //  Minify the concatenated JavaScript file.
        uglify: {
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }
    });

    //  Load plugin(s).
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    //  Default task(s).
    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};