const awsServerlessExpress = require('aws-serverless-express')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

// const express = require('express')
import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import { v4 } from 'uuid'
import * as AWS from 'aws-sdk'

import { getUserContext } from './utils/context'
const dynamodb = new AWS.DynamoDB.DocumentClient()

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

const getVideo = async (videoId: string, userId: string) => {
  return await new Promise((yeah, nah) => {
    const params = {
      TableName: 'Videos',
      Key: {
        VideoId: videoId,
        UserId: userId,
      },
    }
    dynamodb.get(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        nah(err)
      } else {
        const videoUserId = data.Item.UserId
        console.log('GOT USER ID', data.Item.UserId)
        if (videoUserId !== userId || !data.Item) {
          nah('UNAUTHORIZED')
        }
        yeah(data.Item)
      }
    })
  })
}

app.get('/creators/healthcheck', (req: any, res) => {
  const user = getUserContext(req)
  res.json({
    path: 'healthcheck',
    body: req.body,
    event: req.apiGateway.event,
    user: user,
  })
})

app.post('/creators/video', async (req, res) => {
  const user = getUserContext(req)
  const videoID = v4()
  const params = {
    Item: {
      UserId: user.userId,
      VideoId: videoID,
      Metadata: {},
      Title: 'New video',
      Status: 'DRAFT',
      UploadStatus: 'N/A',
      CreatedDate: Date.now().toString(),
      Details: {},
    },
    TableName: 'Videos',
  }
  dynamodb.put(params, function (err) {
    if (err) {
      console.log(err, err.stack)
      res.json(err)
    } else res.json({ path: 'video created', videoId: videoID })
  })
})

app.put('/creators/video', async (req, res) => {
  const { userId } = getUserContext(req)
  const { videoId, content, title } = req.body
  const video = await getVideo(videoId, userId)

  const params = {
    TableName: 'Videos',
    Key: {
      VideoId: videoId,
      UserId: userId,
    },
    // TODO be smarter about this expression, only update fields that get sent through. Rather than always update them
    UpdateExpression:
      'set Title=:t, Details.description=:d, Details.tags=:ta, Details.title=:t',
    ExpressionAttributeValues: {
      ':t': title,
      ':d': content.description,
      ':ta': content.tags,
    },
  }

  dynamodb.update(params, function (err) {
    if (err) {
      console.log('Broke updating video', err, err.stack)
      res.json(err)
    } else res.json({ path: 'video updated', videoId })
  })
})

app.delete('/creators/video/:videoId', async (req, res) => {
  // TODO: some other time
})

app.get('/creators/video/:videoId', async (req, res) => {
  const { userId } = getUserContext(req)
  const { videoId } = req.params
  const video = await getVideo(videoId, userId)
  res.json({ path: 'video get', video })
})

app.post('/creators/video/upload', async (req, res) => {
  const { userId } = getUserContext(req)
  const { videoId, videoName } = req.body
  const mime = require('mime')
  const video = await getVideo(videoId, userId)
  const rawVideoID = v4()

  const s3 = new AWS.S3()
  const myBucket = 'valvid-raw-videos'

  const paramsRaw = {
    Item: {
      RawVideoId: rawVideoID,
      VideoId: videoId,
      CreatedDate: Date.now(),
      Status: 'PENDING',
      UserId: userId,
    },
    TableName: 'RawVideos',
  }
  await new Promise((yeah, nah) =>
    dynamodb.put(paramsRaw, function (err) {
      if (err) {
        console.log(err, err.stack)
        res.json(err)
        nah()
      } else yeah()
    })
  )

  const paramsSigned = {
    Bucket: myBucket,
    Expires: 600,
    Fields: {
      key: rawVideoID,
      'Content-Type': mime.getType(videoName),
    },
    // Nice, I didn't know you could limit this way!
    Conditions: [["content-length-range", 100, 1000000000]], // ~1gb
  }

  console.log('created presigned URL')
  s3.createPresignedPost(paramsSigned, function (err, data) {
    if (err) {
      console.error('Presigning post data encountered an error', err)
    } else {
      console.log('The post data is', data)
      res.json({ path: 'video get upload url', postData: data })
    }
  })
  // if creator is user, return presigned url with deets the user has to pass in body
})

app.get('/creators/videos', async (req, res) => {
  const { userId } = getUserContext(req)
  const params = {
    TableName: 'Videos',
    IndexName: 'VideosUserIndex',
    KeyConditionExpression: '#usr = :usr',
    ExpressionAttributeNames: {
      '#usr': 'UserId',
    },
    ExpressionAttributeValues: {
      ':usr': userId,
    },
  }
  dynamodb.query(params, (err, data) => {
    if (err) res.json(err)
    else res.json({ path: 'video get all uploaded by this user', items: data.Items })
  })
})

const server = awsServerlessExpress.createServer(app)

export const handler = (event: any, context: any) => {
  awsServerlessExpress.proxy(server, event, context)
}
