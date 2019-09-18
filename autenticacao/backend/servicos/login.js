/*
Serviço responsável pela autenticação no LDAP
- Entrada: usuário, senha,sistema e timeout em minutos
- Saída: token em JSON conforme o sistema
*/
const ldapjs = require("ldapjs");
const nJwt = require("njwt");
const Sequelize = require("sequelize");
const ERRO_USUARIO_INVALIDO = "Usuário ou senha inválidos.";
const ERRO_USUARIO_SENHA_BRANCO = "Usuário ou senha em branco.";
const ERRO_PROCURA_LDAP = "Erro ao fazer a procura no LDAP.";
const ERRO_PERMISSAO = "Sem permissão de acessar o sistema.";
const ERRO_PERMISSAO_SETOR =
  "Sem permissão de acessar o sistema, não pertence ao setor permitido.";

module.exports = app => {
  const cfg = app.libs.config;
  const ldapClient = ldapjs.createClient(cfg.ldapOptions);
  /**
   *	@api	{post}	/auxiliar/autenticacao/login/	API	Status
   *  @apiParam {String} usuario Usuário do sistema.
   *  @apiParam {String} senha Senha do usuário do sistema.
   *  @apiParam {String} sistema Sistema que está acessando a API.
   *  @apiParam {Number} timeout Tempo em minutos de expiração do token gerado.
   *	@apiGroup	Autenticacao
   *	@apiSuccess	{json}	token	Token gerado para a aplicação que solicitou.
   *	@apiSuccessExample	{json}	Sucesso
   *				HTTP/1.1	201	OK
   *				{"token":	"token gerado"}
   *  @apiError {json} msg "Usuário ou senha inválidos.", "Usuário ou senha em branco.", "Erro ao fazer a procura no LDAP.", "Sem permissão de acessar o sistema.", "Sem permissão de acessar o sistema, não pertence ao setor permitido."
   *  @apiErrorExample	{json}	Erro
   *				HTTP/1.1	412	ERRO
   *				{"msg":	"Usuário ou senha inválidos."}
   */
  app.post("/auxiliar/autenticacao/login/", (req, response, next) => {
    if (req.body.usuario && req.body.senha) {
      const usuario = req.body.usuario;
      const senha = req.body.senha;
      const sistema = req.body.sistema;
      const timeout = req.body.timeout;
      let dn = "uid=" + usuario + "," + cfg.ous;
      ldapClient.bind(dn, senha, function(err) {
        if (err != null) {
          console.log(err);
          console.log(ERRO_USUARIO_INVALIDO);
          response.status(412).json({ msg: ERRO_USUARIO_INVALIDO });
        } else {
          let search_options = {
            scope: "sub",
            filter: "(&(objectClass=*)(uid=" + usuario + "))",
            attrs: "memberOf"
          };
          ldapClient.search(cfg.ous, search_options, function(err, res) {
            if (err) {
              console.log(ERRO_PROCURA_LDAP);
              response.status(412).json({
                msg: ERRO_PROCURA_LDAP
              });
            } else {
              //aqui pertence ao sistema de ramais
              if (sistema === "ramais") {
                res.on("searchEntry", function(entry) {
                  let pesId = entry.object.employeeNumber;
                  //verifica se esta no setor correto
                  const sequelize = new Sequelize(
                    cfg.databaseRamais,
                    cfg.usernameRamais,
                    cfg.passwordRamais,
                    cfg.sequelizeOptions
                  );
                  let consulta = cfg.consultaAutorizacaoRamais + pesId;
                  sequelize
                    .query(consulta, { type: sequelize.QueryTypes.SELECT })
                    .then(resultado => {
                      if (resultado.length === 0) {
                        console.log(ERRO_PERMISSAO);
                        response.status(412).json({
                          msg: ERRO_PERMISSAO
                        });
                      } else {
                        //agora verifica se esta pessoa está lotada na telefonia, DIF, suporte ou desenvolvimento
                        const setoresRamais = cfg.setoresRamais;
                        let nomeUsuario;
                        let setorUsuario;
                        for (let chave in resultado) {
                          nomeUsuario = resultado[chave].nome;
                          setorUsuario = resultado[chave].setor;
                        }
                        if (setoresRamais.includes(setorUsuario)) {
                          console.log(
                            "Usuário: " +
                              usuario +
                              " logado com sucesso no sistema " +
                              sistema.toUpperCase() +
                              "."
                          );
                          let adicionaMinutos = function(dt, minutos) {
                            return new Date(dt.getTime() + minutos * 60000);
                          };
                          let claims = {
                            sub: usuario, // login do usuario
                            nomeUsuario: nomeUsuario, //nome do usuario
                            pesId: entry.object.employeeNumber, //pes_id no LDAP
                            iat: new Date().getTime(), //data e hora de criação do token
                            exp: adicionaMinutos(new Date(), timeout) //data e hora de expiração do token
                          };
                          let jwt = nJwt.create(claims, cfg.chave, "HS512");
                          let token = jwt.compact();
                          response.status(201).json({ token: token });
                        } else {
                          console.log(ERRO_PERMISSAO_SETOR);
                          response.status(412).json({
                            msg: ERRO_PERMISSAO_SETOR
                          });
                        }
                      }
                    });
                });
                res.on("error", function(err) {
                  console.log(err);
                  response.status(412).json({
                    msg: err
                  });
                });
              }
              //aqui pertence ao sistema de biblioteca
              if (sistema === "biblioteca") {
                res.on("searchEntry", function(entry) {
                  let pesId = entry.object.employeeNumber;
                  //verifica se esta no setor correto
                  const sequelize = new Sequelize(
                    cfg.databaseBiblioteca,
                    cfg.usernameBiblioteca,
                    cfg.passwordBiblioteca,
                    cfg.sequelizeOptions
                  );
                  let consulta = cfg.consultaAutorizacaoBiblioteca + pesId;
                  sequelize
                    .query(consulta, { type: sequelize.QueryTypes.SELECT })
                    .then(resultado => {
                      if (resultado.length === 0) {
                        console.log(ERRO_PERMISSAO);
                        response.status(412).json({
                          msg: ERRO_PERMISSAO
                        });
                      } else {
                        //agora verifica se esta pessoa está lotada na biblioteca, DIF, suporte ou desenvolvimento
                        const setoresBiblioteca = cfg.setoresBiblioteca;
                        let nomeUsuario;
                        let setorUsuario;
                        for (let chave in resultado) {
                          nomeUsuario = resultado[chave].nome;
                          setorUsuario = resultado[chave].setor;
                        }
                        if (setoresBiblioteca.includes(setorUsuario)) {
                          console.log(
                            "Usuário: " +
                              usuario +
                              " logado com sucesso no sistema " +
                              sistema.toUpperCase() +
                              "."
                          );
                          let adicionaMinutos = function(dt, minutos) {
                            return new Date(dt.getTime() + minutos * 60000);
                          };
                          let claims = {
                            sub: usuario, // login do usuario
                            nomeUsuario: nomeUsuario, //nome do usuario
                            pesId: entry.object.employeeNumber, //pes_id no LDAP
                            iat: new Date().getTime(), //data e hora de criação do token
                            exp: adicionaMinutos(new Date(), timeout) //data e hora de expiração do token
                          };
                          let jwt = nJwt.create(claims, cfg.chave, "HS512");
                          let token = jwt.compact();
                          response.status(201).json({ token: token });
                        } else {
                          console.log(ERRO_PERMISSAO_SETOR);
                          response.status(412).json({
                            msg: ERRO_PERMISSAO_SETOR
                          });
                        }
                      }
                    });
                });
                res.on("error", function(err) {
                  console.log(err);
                  response.status(412).json({
                    msg: err
                  });
                });
              }
              //aqui pertence ao sistema de saúde
              if (sistema === "saude") {
                res.on("searchEntry", function(entry) {
                  let pesId = entry.object.employeeNumber;
                  //verifica se esta no setor correto
                  const sequelize = new Sequelize(
                    cfg.databaseSaude,
                    cfg.usernameSaude,
                    cfg.passwordSaude,
                    cfg.sequelizeOptions
                  );
                  let consulta = cfg.consultaAutorizacaoSaude + pesId;
                  sequelize
                    .query(consulta, { type: sequelize.QueryTypes.SELECT })
                    .then(resultado => {
                      if (resultado.length === 0) {
                        console.log(ERRO_PERMISSAO);
                        response.status(412).json({
                          msg: ERRO_PERMISSAO
                        });
                      } else {
                        //agora verifica se esta pessoa está lotada na saúde, DIF, suporte ou desenvolvimento
                        const setoresSaude = cfg.setoresSaude;
                        let nomeUsuario;
                        let setorUsuario;
                        for (let chave in resultado) {
                          nomeUsuario = resultado[chave].nome;
                          setorUsuario = resultado[chave].setor;
                        }
                        if (setoresSaude.includes(setorUsuario)) {
                          console.log(
                            "Usuário: " +
                              usuario +
                              " logado com sucesso no sistema " +
                              sistema.toUpperCase() +
                              "."
                          );
                          let adicionaMinutos = function(dt, minutos) {
                            return new Date(dt.getTime() + minutos * 60000);
                          };
                          let claims = {
                            sub: usuario, // login do usuario
                            nomeUsuario: nomeUsuario, //nome do usuario
                            pesId: entry.object.employeeNumber, //pes_id no LDAP
                            iat: new Date().getTime(), //data e hora de criação do token
                            exp: adicionaMinutos(new Date(), timeout) //data e hora de expiração do token
                          };
                          let jwt = nJwt.create(claims, cfg.chave, "HS512");
                          let token = jwt.compact();
                          response.status(201).json({ token: token });
                        } else {
                          console.log(ERRO_PERMISSAO_SETOR);
                          response.status(412).json({
                            msg: ERRO_PERMISSAO_SETOR
                          });
                        }
                      }
                    });
                });
                res.on("error", function(err) {
                  console.log(err);
                  response.status(412).json({
                    msg: err
                  });
                });
              }
            }
          });
        }
      });
    } else {
      console.log(ERRO_USUARIO_SENHA_BRANCO);
      response.status(412).json({ msg: ERRO_USUARIO_SENHA_BRANCO });
    }
  });
};
