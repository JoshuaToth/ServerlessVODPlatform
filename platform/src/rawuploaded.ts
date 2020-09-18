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
  const key = record.s3?.object?.key
  if (!key) {
    console.error('no key found for', record)
    return
  }
  const rawRecord = await new Promise((yeah, nah) => {
    const params = {
      TableName: 'RawVideos',
      Key: {
        RawVideoId: key,
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
    TableName: 'RawVideos',
    Key: {
      RawVideoId: key,
    },
    UpdateExpression: 'set Progress=:s',
    ExpressionAttributeValues: {
      ':s': 'PROCESSING',
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

  // need role ARN
  const jobParams = {
    Queue: JOB_QUEUE_ARN,
    UserMetadata: {
      Customer: 'Amazon',
    },
    Role: JOB_IAM_ROLE_ARN,
    Settings: {
      OutputGroups: [
        {
          Name: 'File Group',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${PROCESSED_VIDEOS_BUCKET}/`,
            },
          },
          Outputs: [
            {
              VideoDescription: {
                ScalingBehavior: 'DEFAULT',
                TimecodeInsertion: 'DISABLED',
                AntiAlias: 'ENABLED',
                Sharpness: 50,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    InterlaceMode: 'PROGRESSIVE',
                    NumberReferenceFrames: 3,
                    Syntax: 'DEFAULT',
                    Softness: 0,
                    GopClosedCadence: 1,
                    GopSize: 90,
                    Slices: 1,
                    GopBReference: 'DISABLED',
                    SlowPal: 'DISABLED',
                    SpatialAdaptiveQuantization: 'ENABLED',
                    TemporalAdaptiveQuantization: 'ENABLED',
                    FlickerAdaptiveQuantization: 'DISABLED',
                    EntropyEncoding: 'CABAC',
                    Bitrate: 5000000,
                    FramerateControl: 'SPECIFIED',
                    RateControlMode: 'CBR',
                    CodecProfile: 'MAIN',
                    Telecine: 'NONE',
                    MinIInterval: 0,
                    AdaptiveQuantization: 'HIGH',
                    CodecLevel: 'AUTO',
                    FieldEncoding: 'PAFF',
                    SceneChangeDetect: 'ENABLED',
                    QualityTuningLevel: 'SINGLE_PASS',
                    FramerateConversionAlgorithm: 'DUPLICATE_DROP',
                    UnregisteredSeiTimecode: 'DISABLED',
                    GopSizeUnits: 'FRAMES',
                    ParControl: 'SPECIFIED',
                    NumberBFramesBetweenReferenceFrames: 2,
                    RepeatPps: 'DISABLED',
                    FramerateNumerator: 30,
                    FramerateDenominator: 1,
                    ParNumerator: 1,
                    ParDenominator: 1,
                  },
                },
                AfdSignaling: 'NONE',
                DropFrameTimecode: 'ENABLED',
                RespondToAfd: 'NONE',
                ColorMetadata: 'INSERT',
              },
              AudioDescriptions: [
                {
                  AudioTypeControl: 'FOLLOW_INPUT',
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      AudioDescriptionBroadcasterMix: 'NORMAL',
                      RateControlMode: 'CBR',
                      CodecProfile: 'LC',
                      CodingMode: 'CODING_MODE_2_0',
                      RawFormat: 'NONE',
                      SampleRate: 48000,
                      Specification: 'MPEG4',
                      Bitrate: 64000,
                    },
                  },
                  LanguageCodeControl: 'FOLLOW_INPUT',
                  AudioSourceName: 'Audio Selector 1',
                },
              ],
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {
                  CslgAtom: 'INCLUDE',
                  FreeSpaceBox: 'EXCLUDE',
                  MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                },
              },
              NameModifier: '_1',
            },
          ],
        },
      ],
      AdAvailOffset: 0,
      Inputs: [
        {
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1,
              SelectorType: 'TRACK',
            },
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW',
          },
          FilterEnable: 'AUTO',
          PsiControl: 'USE_PSI',
          FilterStrength: 0,
          DeblockFilter: 'DISABLED',
          DenoiseFilter: 'DISABLED',
          TimecodeSource: 'EMBEDDED',
          FileInput: `s3://${RAW_VIDEOS_BUCKET}/${key}`,
        },
      ],
      TimecodeConfig: {
        Source: 'EMBEDDED',
      }
    },
  }
  console.log('making media convert', jobParams)
  try {
    const endpointsPromise = new AWS.MediaConvert({ apiVersion: '2017-08-29' })
      .describeEndpoints()
      .promise()
    const endpoint: string = await endpointsPromise
      .then((endpoints) => endpoints.Endpoints ? endpoints.Endpoints[0].Url : 'foo')
      .catch((e) => {
        console.log('failed to get endpoints', e)
        throw new Error('boom')
      })
    AWS.config.mediaconvert = { endpoint: endpoint }

    const createJobPromise = new AWS.MediaConvert({ apiVersion: '2017-08-29' })
      .createJob(jobParams)
      .promise()
    await createJobPromise
      .then((e) => {
        console.log('Job created!', e)
      })
      .catch((e) => {
        console.log('Job failed to get made', e)
      })
  } catch (e) {
    console.log('failed to make the job', e)
  }

  // event.Records.forEach((record: any) => {

  // })
}
