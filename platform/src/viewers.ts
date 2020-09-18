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

app.get('/viewers/healthcheck', (req: any, res) => {
  const user = getUserContext(req)
  res.json({
    path: 'healthcheck',
    body: req.body,
    event: req.apiGateway.event,
    user: user,
  })
})


app.get('/viewers/video/:videoId', async (req, res) => {
  const { userId } = getUserContext(req)
  const { videoId } = req.params
  const video: any = await getVideo(videoId, userId)
  if (video.Status !== 'PUBLISHED')
  res.json({ path: 'video get', video })
})

app.get('/viewers/videos', async (req, res) => {
  const params = {
    TableName: 'Videos',
    IndexName: 'VideosPubloishedIndex',
    KeyConditionExpression: '#Status = :Status',
    ExpressionAttributeNames: {
      '#Status': 'Status',
    },
    ExpressionAttributeValues: {
      ':Status': 'PUBLISHED',
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
