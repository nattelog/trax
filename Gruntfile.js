module.exports = function(grunt) {
  grunt.initConfig({
    jshint: {
      all: ['index.js', 'test.js', 'Gruntfile.js']
    },

    nodeunit: {
      all: ['test.js'],
      options: {
	reporter: 'default'
      }
    },

    watch: {
      dev: {
	files: ['index.js', 'test.js'],
	tasks: ['jshint', 'nodeunit'],
	options: {
	  spawn: true
	}
      }
    }
  });

  require('grunt-task-loader')(grunt);

  grunt.registerTask('dev', ['jshint', 'nodeunit', 'watch']);
};
