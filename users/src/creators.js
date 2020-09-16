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
    // TODO be smarter about this expression, only update fields that get sent through. Rather than always update them
    UpdateExpression: "set title=:t, Details.description=:d, Details.tags=:ta, Details.title=:t",
    ExpressionAttributeValues: {
      ":t": title,
      ":d": content.description,
      ":ta": content.tags,
    },
  };

  dynamodb.update(params, function (err) {
    if (err) {
      console.log("Broke updating video", err, err.stack);
      res.json(err);
    } else res.json({ path: "video updated", videoId });
  });
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

app.post("/creators/video/upload", async (req, res) => {
  const { userId } = context.getUserContext(req);
  const { videoId } = req.body;
  const video = await getVideo(videoId, userId);
  const rawVideoID = uuidv4();

  const s3 = new AWS.S3();
  const myBucket = "valvid-raw-videos";

  const paramsRaw = {
    Item: {
      RawVideoId: rawVideoID,
      VideoId: videoId,
      CreatedDate: Date.now(),
      Status: 'PENDING'
    },
    TableName: "RawVideos",
  };
  await new Promise((yeah, nah) =>
    dynamodb.put(paramsRaw, function (err) {
      if (err) {
        console.log(err, err.stack);
        res.json(err);
        nah();
      } else yeah();
    })
  );

  const paramsSigned = {
    Bucket: myBucket,
    Fields: {
      key: rawVideoID,
    },
  };

  // TODO get content length of intended video and limit if needed
  console.log("created presigned URL");
  s3.createPresignedPost(paramsSigned, function (err, data) {
    if (err) {
      console.error("Presigning post data encountered an error", err);
    } else {
      console.log("The post data is", data);
      res.json({ path: "video get upload url", postData: data });
    }
  });
  // if creator is user, return presigned url with deets the user has to pass in body
});

app.get("/creators/videos", async (req, res) => {
  // get all videos for creatorID
  // TODO add a secondary index to table
  const { userId } = context.getUserContext(req);
  const params = {
    TableName: "Videos",
    IndexName: "VideosUserIndex",
    KeyConditionExpression: "#usr = :usr",
    ExpressionAttributeNames: {
      "#usr": "UserId",
    },
    ExpressionAttributeValues: {
      ":usr": userId,
    },
  };
  dynamodb.query(params, (err, data) => {
    if (err) res.json(err);
    else res.json({ path: "video get all uploaded by this user", items: data.Items });
  });
});

const server = awsServerlessExpress.createServer(app);

exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
