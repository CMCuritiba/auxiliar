var bodyParser = require("body-parser");
var express = require("express");
var morgan = require("morgan");
var compression = require("compression");
var helmet = require("helmet");
var log = require("./logger.js");

module.exports = app => {
  app.set("port", 3000);
  app.set("json spaces", 4);
  app.use(
    morgan("common", {
      stream: {
        write: message => {
          log.info(message);
        }
      }
    })
  );
  app.use(
    helmet.hsts({
      maxAge: 31436000000,
      includeSubdomains: true,
      preload: true
    })
  );
  app.use(compression());
  app.use(bodyParser.json());
  app.use("/auxiliar/autenticacao", express.static("public"));

  app.use(
    bodyParser.urlencoded({
      extended: true
    })
  );
  app.use(bodyParser.json());
};
