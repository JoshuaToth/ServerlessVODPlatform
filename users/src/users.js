"use strict";
const awsServerlessExpress = require("aws-serverless-express");
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const router = express.Router()
const cors = require('cors')


app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(awsServerlessExpressMiddleware.eventContext())

app.get("/users/healthcheck", (req, res) => {
  res.json({ path: "healthcheck", body: req.body, event: req.apiGateway.event });
});

app.post("/users/signup", (req, res) => {
  res.json({ path: "signup", body: req.body, event: req.apiGateway.event });
});
app.post("/users/login", (req, res) => {
  res.json({ path: "login", body: req.body, event: req.apiGateway.event });
});


const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};

// exports.signup = function (event, context, callback) {
//   console.log(response);
//   var responseBody = {
//     signup: "signup called",
//     event,
//     context,
//   };

//   var response = {
//     statusCode: 200,
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(responseBody),
//     isBase64Encoded: false,
//   };
//   callback(null, response);
// };

// exports.login = function (event, context, callback) {
//   console.log(response);
//   var responseBody = {
//     login: "logging in called",
//     event,
//     context,
//   };

//   var response = {
//     statusCode: 200,
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(responseBody),
//     isBase64Encoded: false,
//   };
//   callback(null, response);
// };
