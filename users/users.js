"use strict";

exports.signup = function (event, context, callback) {
  console.log(response);
  var responseBody = {
    key3: "value3",
    key2: "value2",
    key1: "value1",
  };

  var response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(responseBody),
    isBase64Encoded: false,
  };
  callback(null, response);
};
