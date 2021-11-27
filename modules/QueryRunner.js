const mysql = require('mysql');
const config = require('../config.json');
const pool = mysql.createPool(config.db);
// const {log, debug, logger.info, info, warn, error} = require('../Logger.js');
var Logger = require('./Logger');
var logger = Logger.logger();

class QueryRunner {
	constructor() {
		this.pool = pool;
	}
	query(sql, values, redactValueLogging) {
		return new Promise((resolve, reject) => {
			this.pool.getConnection(function(err, connection) {
				if (err != null) {
	    			reject(err);
				} else {
					connection.query({
						sql: sql,
						values: values
					}, (err, rows) => {
						connection.release();
						if (err != null) {
	            			reject(err);
						}
            			logger.info(`${sql}\tvalues:[${redactValueLogging?'REDACTED':values}]\n\tresult:${JSON.stringify(rows)}`);
						resolve(rows);
					});
				}
			});
		});
	}
	transaction(sqls) {
		return new Promise((resolve, reject) => {
			this.pool.getConnection(function(err, connection) {
				logger.info(`starting transaction`);
				connection.beginTransaction(function(err) {
					if (err) {
						connection.rollback(function() {
							connection.release();
							logger.info(`transaction rolled back due to err:${err}`);
							reject(err);
						});
					} else {
						for (let sql of sqls) {
							connection.query(sql, [], function(err, rows) {
								if (err) {
									connection.rollback(function() {
										connection.release();
										logger.info(`transaction rolled back due to err:${err}`);
										reject(err);
									});
								} else {
		            				logger.info(`${sql}\tresult:${JSON.stringify(rows)}`);
								}
							});
						}
						connection.commit(function(err) {
							if (err) {
								connection.rollback(function() {
									connection.release();
									logger.info(`transaction rolled back due to err:${err}`);
									reject(err);
								});
							} else {
								connection.release();
								logger.info(`transaction committed`);
								resolve();
							}
						});
					}
				});
			});
		});
	}
}

module.exports = QueryRunner;
