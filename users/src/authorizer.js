"use strict";
const jwt = require("./utils/jwt");
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();

exports.handler = async (event, _, callback) => {
  // Use jwt decode here
  console.log('AUTHING');
  let token = {};
  try {
    token = jwt.verifyToken(event.authorizationToken);
  } catch (e) {
    callback(null, generatePolicy("user", "Deny", event.methodArn));
  }

  // validate user deets too
  const params = {
    TableName: "Users",
    Key: {
      UserId: {
        S: token.userID,
      },
    },
  };
  const userDetails = await new Promise((res, rej) =>
    dynamodb.getItem(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        rej(err);
      } else {
        const username = data.Item.Username.S;
        const userId = data.Item.UserId.S;
        const earliestTokenDate = data.Item.CertificateAgeLimit.N;
        // Now no other lambda will need to access the users table.
        res({
          username,
          userId,
          earliestTokenDate,
        });
      }
    })
  );

  if (!userDetails || userDetails.earliestTokenDate > token.generatedAt) {
    // TODO: Also add a check for token expiry.
    callback(null, generatePolicy("user", "Deny", event.methodArn));
  } else {
    // Add a new token here with a more recent expiry for the frontend to use if it wants
    const newToken = jwt.generateLoginToken(userDetails.userId, userDetails.username);
    callback(null, generatePolicy("user", "Allow", event.methodArn, { ...token, ...userDetails, newToken }));
  }
};

// Help function to generate an IAM policy
var generatePolicy = function (principalId, effect, resource, token) {
  var authResponse = {};

  authResponse.principalId = principalId;
  if (effect && resource) {
    var policyDocument = {};
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    var statementOne = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties of the String, Number or Boolean type.
  authResponse.context = token || {};
  return authResponse;
};
