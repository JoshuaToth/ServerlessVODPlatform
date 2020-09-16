"use strict";
const jwt = require("./utils/jwt");

exports.handler = function (event, _, callback) {
  // Use jwt decode here
  const token = jwt.verifyToken(event.authorizationToken);
  if (!token) {
    callback(null, generatePolicy("user", "Deny", event.methodArn));
  }
//   console.log("sent event body", event.body);
//   console.log("sent event", event);
  callback(null, generatePolicy("user", "Allow", event.methodArn, token));
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
