/*
Serviço responsável pela autenticação no LDAP
- Entrada: usuário, senha e sistema
- Saída: token em JSON conforme o sistema
*/
const ldapjs = require("ldapjs");
const nJwt = require("njwt");
const Sequelize = require("sequelize");
const ERRO_USUARIO_INVALIDO = "Usuário ou senha inválidos.";
const ERRO_USUARIO_SENHA_BRANCO = "Usuário ou senha em branco.";
const ERRO_PROCURA_LDAP = "Erro ao fazer a procura no LDAP.";
const ERRO_PERMISSAO_RAMAIS = "Sem permissão de acessar o sistema de ramais.";
const ERRO_PERMISSAO_RAMAIS_SETOR =
  "Sem permissão de acessar o sistema de ramais, não pertence ao setor permitido.";
module.exports = app => {
  const cfg = app.libs.config;
  const ldapClient = ldapjs.createClient(cfg.ldapOptions);
  app.post("/auxiliar/autenticacao/login/", (req, response, next) => {
    if (req.body.usuario && req.body.senha) {
      const usuario = req.body.usuario;
      const senha = req.body.senha;
      const sistema = req.body.sistema;
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
                        console.log(ERRO_PERMISSAO_RAMAIS);
                        response.status(412).json({
                          msg: ERRO_PERMISSAO_RAMAIS
                        });
                      } else {
                        //agora verifica se esta pessoa está lotada na telefonia, DIF, suporte ou desenvolvimento
                        const setoresRamais = [27, 171, 172, 44];
                        let setorUsuario;
                        for (let chave in resultado) {
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
                          let claims = {
                            sub: usuario, // nome do usuario
                            pes_id: entry.object.employeeNumber //aqui vai o pes_id
                          };
                          let jwt = nJwt.create(claims, cfg.chave);
                          let token = jwt.compact();
                          response.status(201).json({ token: token });
                        } else {
                          console.log(ERRO_PERMISSAO_RAMAIS_SETOR);
                          response.status(412).json({
                            msg: ERRO_PERMISSAO_RAMAIS_SETOR
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
