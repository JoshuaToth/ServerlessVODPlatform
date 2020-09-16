"use strict";
const awsServerlessExpress = require("aws-serverless-express");
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient(); // new AWS.DynamoDB();

const context = require("./utils/context");
// const { DynamoDB } = require("aws-sdk");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(awsServerlessExpressMiddleware.eventContext());

const getVideo = async (videoId, userId) => {
  //dynamodb video stuffs
  return await new Promise((yeah, nah) => {
    const params = {
      TableName: "Videos",
      Key: {
        VideoId: videoId,
        UserId: userId,
      },
      // Key: {
      //   VideoId: {
      //     S: videoId,
      //   },
      //   UserId: {
      //     S: userId,
      //   },
      // },
    };
    dynamodb.get(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);
        nah(err);
      } else {
        const videoUserId = data.Item.UserId;
        console.log("GOT USER ID", data.Item.UserId);
        if (videoUserId !== userId || !data.Item) {
          nah("UNAUTHORIZED");
        }
        yeah(data.Item);
      }
    });
  });
};

// Can move this out into a router or something or their own functions. It's gonna be a long file

app.get("/creators/healthcheck", (req, res) => {
  const user = context.getUserContext(req);
  res.json({ path: "healthcheck", body: req.body, event: req.apiGateway.event, user: user });
});

app.post("/creators/video", async (req, res) => {
  const user = context.getUserContext(req);
  const videoID = uuidv4();
  const params = {
    Item: {
      UserId: user.userId,
      VideoId: videoID,
      Metadata: {},
      Title: "New video",
      Status: "DRAFT",
      UploadStatus: "N/A",
      CreatedDate: Date.now().toString(),
      Details: {},
    },
    TableName: "Videos",
  };
  dynamodb.put(params, function (err) {
    if (err) {
      console.log(err, err.stack);
      res.json(err);
    } else res.json({ path: "video created", videoId: videoID });
  });
});

app.put("/creators/video", async (req, res) => {
  const { userId } = context.getUserContext(req);
  const { videoId, content, title } = req.body;
  const video = await getVideo(videoId, userId);

  var params = {
    TableName: "Videos",
    Key: {
      VideoId: videoId,
      UserId: userId,
    },
    UpdateExpression: "set title=:t, Details.description=:d, Details.tags=:ta, Details.title=:t",
    ExpressionAttributeValues: {
      ":t": title,
      ":d": content.description,
      ":ta": content.tags,
    },
  };

  // const params = {
  //   Item: {
  //     VideoId: {
  //       S: videoId,
  //     },
  //     UserId: {
  //       S: userId,
  //     },
  //     Title: {
  //       S: title,
  //     },
  //     Details: {
  //       S: JSON.stringify(newDetails)
  //     }
  //   },
  //   ReturnConsumedCapacity: "TOTAL",
  //   TableName: "Videos",
  // };

  dynamodb.update(params, function (err) {
    if (err) {
      console.log('Broke updating video', err, err.stack);
      res.json(err);
    } else res.json({ path: "video updated", videoId });
  });
  // get dynamoDB record
  // validate schema + owner
  // reject if owner isnt the right user
  // update the dynamo values
});

app.delete("/creators/video/:videoId", async (req, res) => {
  // TODO: some other time
});

app.get("/creators/video/:videoId", async (req, res) => {
  // return video data if creator is user
  const { userId } = context.getUserContext(req);
  const { videoId } = req.params;
  const video = await getVideo(videoId, userId);
  res.json({ path: "video get", video });
});

app.post("/creators/video/upload/:videoId", async (req, res) => {
  // if creator is user, return presigned url with deets the user has to pass in body
});

app.get("/creators/videos", async (req, res) => {
  // get all videos for creatorID
});

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
