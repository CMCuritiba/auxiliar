const fs = require("fs");
const winston = require("winston");
const moment = require("moment");
const formatoTimestamp = () =>
  moment()
    .format("DD/MM/YYYY hh:mm:ss")
    .trim();
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

module.exports = new winston.Logger({
  transports: [
    new winston.transports.File({
      level: "info",
      filename: "logs/app.log",
      handleExceptions: true,
      maxsize: 1048576,
      maxFiles: 10,
      colorize: false,
      timestamp: formatoTimestamp
    }),
    new winston.transports.Console({
      level: "debug",
      handleExceptions: true,
      json: false,
      colorize: true,
      timestamp: formatoTimestamp
    })
  ]
});
