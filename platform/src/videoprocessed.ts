'use strict'
import * as AWS from 'aws-sdk'
const dynamodb = new AWS.DynamoDB.DocumentClient()

const {
  JOB_QUEUE_ARN,
  PROCESSED_VIDEOS_BUCKET,
  RAW_VIDEOS_BUCKET,
  JOB_IAM_ROLE_ARN,
} = process.env

export const handler = async (event: any, _: any, callback: any) => {
  const record = event.Records[0]
  console.log('first record', record)
  const fileName: string = record.s3?.object?.key
  if (!fileName) {
    console.error('no key found for', record)
    return
  }
  const properKey = fileName.replace('_1.mp4', '');
  const rawVideo: any = await new Promise((yeah, nah) => {
    const params = {
      TableName: 'RawVideos',
      Key: {
        RawVideoId: properKey,
      },
    }
    dynamodb.get(params, function (err, data) {
      if (err) {
        console.log(err, err.stack)
        nah(err)
      } else {
        console.log('yeah got item')
        yeah(data.Item)
      }
    })
  })
  const paramsRaw = {
    TableName: 'Videos',
    Key: {
      VideoId: rawVideo.VideoId,
      UserId: rawVideo.UserId,
    },
    UpdateExpression: 'set UploadStatus=:s, VideoFilename=:k',
    ExpressionAttributeValues: {
      ':s': 'PROCESSED',
      ':k': fileName,
    },
  }

  console.log('updating dynamo')
  await new Promise((yeah, nah) =>
    dynamodb.update(paramsRaw, function (err) {
      if (err) {
        console.log(err, err.stack)
        nah(err)
      } else yeah(err)
    })
  )
}
