var trax = require('./index');
var GoogleSpreadSheet = require('google-spreadsheet');
var async = require('async');
var token = require('./config').token;
var creds = require('./credentials.json');


var doc = new GoogleSpreadSheet(token);
var sheet;
var user = 'Default';


exports.setupDoc = function(test) {
  async.series([
    function authenticate(step) {
      doc.useServiceAccountAuth(creds, step);      
    },

    function getSheet(step) {
      doc.getInfo(function(err, info) {
	sheet = info.worksheets[0];
	sheet.setTitle(user, step);
      });
    },

    function clearSheet(step) {
      sheet.clear(step);
    },

    function resizeSheet(step) {
      sheet.resize({
	rowCount: 10,
	colCount: 5
      }, step);
    },

    function setHeaders(step) {
      sheet.setHeaderRow([
	'Date',
	'Start',
	'End',
	'Total',
	'Description'
      ], step);
    },

    function finish(step) {
      test.done();
    }
  ]);
};


exports.trackBeforeInit = function(test) {
  trax.track(null, null, null, null, function(err) {
    test.notStrictEqual(err, null, 'There should be an error here');
    test.done();
  });
};


exports.initWithBadToken = function(test) {
  trax.init('bad_token', creds, function(err) {
    test.notStrictEqual(err, null, 'There should be an error here');
    test.done();
  });
};


exports.initWithBadCredentials = function(test) {
  trax.init(token, 'bad_credentials', function(err) {
    test.notStrictEqual(err, null, 'There should be an error here');
    test.done();
  });
};


exports.initTrax = function(test) {
  trax.init(token, creds, test.done);
};


exports.testTrackWithWrongNumberOfArguments = function(test) {
  test.throws(
    function() {
      trax.track();
    },
    Error,
    'No arguments should throw error'
  );
  test.throws(
    function() {
      trax.track(null, null, null, null, null, null);
    },
    Error,
    'Too many arguments should throw error'
  );
  test.done();
};


exports.testTrackWithBadUser = function(test) {
  trax.track('bad_user', null, null, null, function(err) {
    test.notStrictEqual(err, null, 'Error should be defined');
    test.done();
  });
};


exports.testTrackWithBadTime = function(test) {
  var t1 = new Date();
  var t2 = new Date();

  t2.setHours(t1.getHours() - 1);
  
  trax.track(user, t1, t2, null, function(err) {
    test.notStrictEqual(err, null, 'Error should be defined');
    test.equal(err.message, 'Second date must come after first date', 'Error message should be this');
    test.done();
  });
};


exports.testTrackWithDifferentDays = function(test) {
  var t1 = new Date();
  var t2 = new Date();

  t1.setDate(t2.getDate() - 1);

  trax.track(user, t1, t2, null, function(err) {
    test.notStrictEqual(err, null, 'Error should be defined');
    test.equal(err.message, 'Both dates must be on the same day', 'Error message should be this');
    test.done();
  });
};


exports.testTrackStartOfDay = function(test) {
  var t1 = new Date();
  var t2 = new Date();

  t1.setHours(t1.getHours() - 8);
  t2.setHours(t2.getHours() - 6);

  async.series([
    function trackWithTrax(step) {
      trax.track(user, t1, t2, 'Starting off my awesome day!', function(err) {
	test.ifError(err);
	step();
      });
    },

    function checkActualRows(step) {
      sheet.getRows(function(err, rows) {
	test.ifError(err);
	test.equals(rows.length, 1, 'There should be one added row');
	test.done();
      });
    }
  ]);
};


exports.testTrackNextActivityFail = function(test) {
  trax.track(user, 'Doing more cool stuff.', function(err) {
    test.equal(err.message, 'Latest tracked time is more than 4 hours ago', 'Error message should be this');
    test.done();
  });
};


exports.testOneMoreManualTrack = function(test) {
  var t1 = new Date();
  var t2 = new Date();

  t1.setHours(t1.getHours() - 3);
  t2.setHours(t2.getHours() - 1);
  t1.setMinutes(t1.getMinutes() - 15);

  async.series([
    function trackWithTrax(step) {
      trax.track(user, t1, t2, 'Continuing doing more cool stuff!', function(err) {
	test.ifError(err);
	step();
      });
    },

    function checkActualRows(step) {
      sheet.getRows(function(err, rows) {
	test.ifError(err);
	test.equals(rows.length, 2, 'There should be two rows');
	test.done();
      });
    }
  ]);
};


exports.testTrackPreviousDay = function(test) {
  var t1 = new Date();
  var t2 = new Date();

  t1.setDate(t1.getDate() - 1);
  t1.setHours(t1.getHours() - 6);
  t2.setDate(t2.getDate() - 1);
  t2.setHours(t2.getHours() - 4);

  trax.track(user, t1, t2, 'Awesome work!', function(err) {
    test.ifError(err);
    test.done();
  });
};


exports.testTrackNextActivity = function(test) {
  async.series([
    function trackWithTrax(step) {
      trax.track(user, 'Continuing doing awesome stuff!', function(err) {
	test.ifError(err);
	step();
      });
    },

    function checkActualRows(step) {
      sheet.getRows(function(err, rows) {
	test.ifError(err);
	test.equals(rows.length, 4, 'There should now be 4 rows');
	test.done();
      });
    }
  ]);
};


exports.getStatusForBadUser = function(test) {
  trax.status('bad_user', function(err, status) {
    test.notStrictEqual(err, null, 'Error should be defined');
    test.equal(err.message, 'User not found in spreadsheet');
    test.done();
  });
};


exports.testStatus = function(test) {
  trax.status(user, function(err, status) {
    var thisDate = new Date();
    
    test.ifError(err);
    test.equal(status.total.hours, 7, 'There should be 7 hours total');
    test.equal(status.latestDate.getHours(), thisDate.getHours(), 'Latest hour should be this hour');
    test.equal(status.latestDate.getMinutes(), thisDate.getMinutes(), 'Latest minute should be this minute');
    test.equal(status.latestDescription, 'Continuing doing awesome stuff!', 'Latest description shoud be this');
    test.done();
  });
};


exports.testTrackFrom = function(test) {
  var date = new Date();
  
  trax.track(user, date, 'Working', function(err) {
    test.ifError(err);
    test.done();
  });
};


exports.testStatusAgain = function(test) {
  trax.status(user, function(err, status) {
    console.log(status);
    test.done();
  });
};
