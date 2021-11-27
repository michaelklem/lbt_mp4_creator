/*
  Use this to add a logger object that includes a timestamp in the log message.
  Refer to: https://www.npmjs.com/package/winston

  Example usage:
  var logger = require('./modules/Logger').logger();
  logger.info('my message here');

  output:
  2018-01-27T05:21:31.417Z - info: my message here
*/
//var winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, json } = format;

exports.logger = function() {

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Uncomment the json() setting below if we need JSON formatted logs. These are
// useful when sending logs to a remote service for processing.
const logger = createLogger({
  format: combine(
    timestamp(),
    myFormat,
//    json()
  ),
  transports: [new transports.Console()]
});

  return logger;
}


exports.handleQueryError = function(query, err, callback)
{
  if (err) {
    exports.logger().error('Query error for : ' + query + ' Error: ' + err);
    if (callback) callback(null);
  }
}
