/**
 * TRAX - A simple time tracking tool for Node.js.
 *
 * Written by Natanael Log
 *
 * MIT Licence
 */


var doc;
var AUTO_TRACK_MAX_DIFF = 4; // max hours it can take between auto tracks


exports.init = function(token, credentials, done) {
  var GoogleSpreadSheet = require('google-spreadsheet');

  doc = new GoogleSpreadSheet(token);
  doc.useServiceAccountAuth(credentials, done);
};


exports.status = function(user, done) {
  getSheet(user, function(err, sheet) {
    if (err) {
      done(err);
    }
    else {
      sheet.getRows({}, function(err, rows) {
	if (err) {
	  done(err);
	}
	else {
	  done(null, {
	    total: sumTotalTime(rows),
	    latestDate: getLatestDate(rows),
	    latestDescription: getLatestDescription(rows)
	  });
	}
      });
    }
  });
};


exports.track = function(user, t1, t2, description, done) {
  if (arguments.length == 3) { // time not passed
    description = arguments[1];
    done = arguments[2];

    try {
      trackAuto(user, description, done);
    }
    catch (err) {
      done(err);
    }
  }
  else if (arguments.length == 4) {
    done = arguments[3];
    description = arguments[2];

    try {
      trackFrom(user, t1, description, done);
    }
    catch (err) {
      done(err);
    }
  }
  else if (arguments.length == 5) { // time passed
    try {
      trackBetween(user, t1, t2, description, done);
    }
    catch (err) {
      done(err);
    }
  }
  else {
    throw(new Error('Wrong number of arguments'));
  }  
};


function trackBetween(user, t1, t2, description, done) {
  getSheet(user, function(err, sheet) {
    if (err) {
      done(err);
    }
    else {
      sheet.getRows({}, function(err, rows) {
	if (err) {
	  done(err);
	}
	else {
	  addTrack(sheet, t1, t2, description, done);
	}
      });
    }
  });
}


function trackFrom(user, from, description, done) {
  getSheet(user, function(err, sheet) {
    if (err) {
      done(err);
    }
    else {
      sheet.getRows({}, function(err, rows) {
	if (err) {
	  done(err);
	}
	else {
	  var latestDate = getLatestDate(rows);
	  var now = new Date();

	  if (latestDate > from) {
	    done(new Error('Your date have to be after the latest tracked date (' + latestDate + ')'));
	  }
	  else if (now < from) {
	    done(new Error('Your date is ahead of the current date'));
	  }
	  else {
	    addTrack(sheet, from, now, description, done);
	  }
	}
      });
    }
  });
}


function trackAuto(user, description, done) {
  getSheet(user, function(err, sheet) {
    if (err) {
      done(err);
    }
    else {
      sheet.getRows({}, function(err, rows) {
	if (err) {
	  done(err);
	}
	else {
	  var latestDate = getLatestDate(rows);
	  var currentDate = new Date();

	  if (Math.abs(currentDate - latestDate) > AUTO_TRACK_MAX_DIFF*60*60*1000) {
	    done(new Error('Latest tracked time is more than ' + AUTO_TRACK_MAX_DIFF + ' hours ago'));
	  }
	  else {
	    addTrack(sheet, latestDate, currentDate, description, done);
	  }
	}
      });
    }
  });
}


function getSheet(user, done) {
  doc.getInfo(function(err, info) {
    if (err) {
      done(err);
    }
    else {
      var sheet;

      for (var i = 0; i < info.worksheets.length; ++i) {
	if (info.worksheets[i].title == user) {
	  sheet = info.worksheets[i];
	}
      }

      if (!sheet) {
	done(new Error('User not found in spreadsheet'));
      }
      else {
	done(null, sheet);
      }
    }
  });
}


function addTrack(sheet, t1, t2, description, done) {
  var t1Hours = t1.getHours();
  var t1Minutes = t1.getMinutes();
  var t2Hours = t2.getHours();
  var t2Minutes = t2.getMinutes();
  var year = t1.getFullYear();
  var month = t1.getMonth() + 1; // month index goes from 0-11
  var day = t1.getDate();

  // make sure t1 and t2 are on the same day
  if (t1.getFullYear() != t2.getFullYear() ||
      t1.getMonth() != t2.getMonth() ||
      t1.getDate() != t2.getDate()) {
    done(new Error('Both dates must be on the same day'));
  }
  // make sure t2 is comes after t1
  else if (t2 <= t1) {
    done(new Error('Second date must come after first date'));
  }
  else {
    sheet.addRow({
      Date: '=DATE(' + year + ',' + month + ',' + day + ')',
      Start: '=TIME(' + t1Hours + ',' + t1Minutes + ',0)',
      End: '=TIME(' + t2Hours + ',' + t2Minutes + ',0)',
      Total: '=INDIRECT(ADDRESS(ROW(), COLUMN()-1, 4)) - INDIRECT(ADDRESS(ROW(), COLUMN()-2, 4))',
      Description: description
    }, done);
  }
}


function getLatestDate(rows) {
  rows.sort(dateComparator);
  return convertToDate(rows[0].date, rows[0].end);
}


function getLatestDescription(rows) {
  rows.sort(dateComparator);
  return rows[0].description;
}


function dateComparator(row1, row2) {
  var date1 = convertToDate(row1.date, row1.end);
  var date2 = convertToDate(row2.date, row2.end);

  return date2 - date1;
}


function convertToDate(dateString, timeString) {
  var dateArr = dateString.split('/');
  var timeArr = timeString.split(':');

   if (dateArr.length != 3 || timeArr.length != 3) {
    throw new Error('Wrong format in date or time');
  }
  else {
    var year = dateArr[2];
    var month = dateArr[1] - 1;
    var day = dateArr[0];
    var hour = timeArr[0];
    var minute = timeArr[1];

    return new Date(year, month, day, hour, minute);
  }
}


function sumTotalTime(rows) {
  var hours = 0;
  var minutes = 0;

  rows.forEach(function(row) {
    var date = convertToDate(row.date, row.total);
    hours += date.getHours();
    minutes += date.getMinutes();
  });

  return {
    hours: hours + Math.floor(minutes / 60),
    minutes: minutes % 60
  };
}


module.exports = exports;

