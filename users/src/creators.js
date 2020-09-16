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

// Can move this out into a router or something or their own functions. It's gonna be a long file

app.get("/creators/healthcheck", (req, res) => {
  res.json({ path: "healthcheck", body: req.body, event: req.apiGateway.event });
});

app.post("/creators/video", async (req, res) => {});

app.put("/creators/video", async (req, res) => {});

app.delete("/creators/video/:videoId", async (req, res) => {});

app.get("/creators/video/:videoId", async (req, res) => {});

app.get("/creators/video/upload/:videoId", async (req, res) => {});

app.get("/creators/videos", async (req, res) => {});

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
