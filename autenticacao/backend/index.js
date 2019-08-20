var express = require("express");
var consign = require("consign");
const path = require("path");
const VIEWS = path.join(__dirname, "views");
const app = express();
var cluster = require("cluster");
var os = require("os");
const CPUS = os.cpus();
if (cluster.isMaster) {
  CPUS.forEach(() => {
    cluster.fork();
  });
  cluster.on("listening", worker => {
    console.log("Cluster %d	conectado \n", worker.process.pid);
  });
  cluster.on("disconnect", worker => {
    console.log("Cluster %d	desconectado", worker.process.pid);
  });
  cluster.on("exit", worker => {
    console.log("Cluster %d	saiu do ar", worker.process.pid);
    cluster.fork();
    // Garante que um novo cluster inicie se um antigo morrer
  });
} else {
  app.set("json spaces", 4);
  consign({ verbose: false })
    .include("libs/config.js")
    .then("libs/middlewares.js")
    .then("servicos")
    .then("libs/boot.js")
    .into(app);

  // página não encontrada
  app.use(function(req, res) {
    res.status(400);
    res.sendFile("404.html", { root: VIEWS });
  });
  // erro interno no servidor
  app.use(function(error, req, res, next) {
    res.status(500);
    res.sendFile("500.html", { root: VIEWS });
  });
}
module.exports = app;
