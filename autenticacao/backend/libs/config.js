require("dotenv").config();
module.exports = {
  //conexão com o banco ramais
  databaseRamais: process.env.DATABASE_RAMAIS,
  usernameRamais: process.env.USUARIO_RAMAIS,
  passwordRamais: process.env.PASSWORD_RAMAIS,
  consultaAutorizacaoRamais: process.env.CONSULTA_RAMAIS,
  //------------------------------
  port: process.env.PORT,
  sequelizeOptions: {
    host: process.env.HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: true
    },
    define: {
      timestamps: false
    },
    freezeTableName: true,
    pool: {
      max: 9,
      min: 0,
      idle: 10000
    },
    operatorsAliases: false
  },
  //chave de sessão
  chave: process.env.CHAVE,
  dominio: process.env.DOMINIO,
  //conexão com LDAP
  ldapOptions: {
    url: process.env.LDAP_URL,
    connectTimeout: 30000,
    reconnect: true
  },
  ous: process.env.OUS
};
