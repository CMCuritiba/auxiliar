var https = require("https");
var fs = require("fs");
module.exports = app => {
  const credenciais = {
    key: fs.readFileSync(".cmc.pr.gov.br.key", "utf8"),
    cert: fs.readFileSync(".cmc.pr.gov.br.crt", "utf8")
  };
  https.createServer(credenciais, app).listen(app.get("port"), () => {
    console.log(`Autenticacao - API - porta ${app.get("port")}`);
  });
};
