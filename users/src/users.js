"use strict";
const awsServerlessExpress = require("aws-serverless-express");
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const { COGNITO_POOL_ID, COGNITO_POOL_CLIENT_ID } = process.env;
const poolData = {
  UserPoolId: COGNITO_POOL_ID,
  ClientId: COGNITO_POOL_CLIENT_ID,
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const generateLoginToken = (userID, username) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);
  const token = {
    userID,
    username,
    generatedAt: Date.now(),
    expiresAt,
  };
  return jwt.sign(token, "superSecretHash"); // For the love of all, do not use this secret in prod hahaha
};

app.get("/users/healthcheck", (req, res) => {
  res.json({ path: "healthcheck", body: req.body, event: req.apiGateway.event });
});

app.post("/users/signup", async (req, res) => {
  // Username should be validated and unique. It might be worth adding a secondary index to dynamo to do a search for it.
  const attributeList = [];
  const userID = uuidv4();
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: req.body.email }));
  attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "custom:userID", Value: userID }));
  userPool.signUp(req.body.email, req.body.password, attributeList, null, function (err, result) {
    if (err) {
      console.log(err);
      res.json(err);
      return;
    }

    const params = {
      Item: {
        UserId: {
          S: userID,
        },
        EmailAddress: {
          S: req.body.email,
        },
        Username: {
          S: req.body.username, //obv check for this. Need a req validator anyway
        },
        SignupDate: {
          N: Date.now().toString(),
        },
        LastLogin: {
          N: Date.now().toString(),
        },
        AccountStatus: {
          S: "PENDING",
        },
        CertificateAgeLimit: {
          N: Date.now().toString(),
        },
      },
      ReturnConsumedCapacity: "TOTAL",
      TableName: "Users",
    };
    dynamodb.putItem(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        res.json(err);
      } else res.json({ path: "signup", username: req.body.username});
    });
  });
});

app.post("/users/login", async (req, res) => {
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: req.body.email,
    Password: req.body.password,
  });

  var userData = {
    Username: req.body.email,
    Pool: userPool,
  };

  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      const UserID = result.getIdToken().decodePayload()["custom:userID"];
      const params = {
        TableName: "Users",
        Key: {
          UserId: {
            S: UserID,
          },
        },
      };
      dynamodb.getItem(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          res.json(err);
        } else {
          const username = data.Item.Username.S;
          res.json({
            path: "login",
            session: generateLoginToken(UserID, username),
          });
        }
      });
    },
    onFailure: function (err) {
      console.log(err);
      res.status(500).json(err);
    },
  });
});

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
