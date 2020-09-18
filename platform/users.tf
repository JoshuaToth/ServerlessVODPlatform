terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}
provider "aws" {
  region = "us-east-1"
}

variable "app_version" {
}
#####
# SIGNUP SERVICE
#####
resource "aws_api_gateway_rest_api" "valvid" {
  name        = "ValvidAPI"
  description = "API gateway for all interactions"
}

resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  parent_id   = aws_api_gateway_rest_api.valvid.root_resource_id
  path_part   = "users"
}

resource "aws_api_gateway_resource" "users_proxy" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  parent_id   = aws_api_gateway_resource.users.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "users_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.valvid.id
  resource_id   = aws_api_gateway_resource.users_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "users_lambda" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  resource_id = aws_api_gateway_method.users_proxy.resource_id
  http_method = aws_api_gateway_method.users_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users.invoke_arn
}

resource "aws_api_gateway_deployment" "valvid" {
  depends_on = [
    aws_api_gateway_integration.users_lambda,
    aws_api_gateway_integration.creators_lambda
  ]

  rest_api_id = aws_api_gateway_rest_api.valvid.id
  stage_name  = "test"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.valvid.execution_arn}/*/*"
}

resource "aws_lambda_function" "users" {
  function_name = "UsersWorkflow"

  s3_bucket = "valvid-terraform"
  s3_key    = "v${var.app_version}/valvid.zip"

  handler = "users.handler"
  runtime = "nodejs12.x"
  timeout = 15
  role    = aws_iam_role.lambda_exec.arn
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cognito_user_pool_client.usersPool,
    aws_dynamodb_table.usersTable
  ]
  environment {
    variables = {
      COGNITO_POOL_ID        = aws_cognito_user_pool.usersPool.id
      COGNITO_POOL_CLIENT_ID = aws_cognito_user_pool_client.usersPool.id
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "users_lambda"

  assume_role_policy = <<EOF
{
"Version": "2012-10-17",
"Statement": [
  {
  "Action": "sts:AssumeRole",
  "Principal": {
    "Service": "lambda.amazonaws.com"
  },
  "Effect": "Allow",
  "Sid": ""
  }
]
}
EOF

}

resource "aws_iam_policy" "lambda_logging" {
  name        = "lambda_logging"
  path        = "/"
  description = "IAM policy for logging from a lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*",
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

resource "aws_iam_policy" "lambda_dynamodb" {
  name        = "lambda_dynamodb"
  path        = "/"
  description = "IAM policy for using dynamoDB User Table in lambda"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "dynamodb:*",
      "Resource": [
        "arn:aws:dynamodb:*:*:table/Users", 
        "arn:aws:dynamodb:*:*:table/RawVideos",
        "arn:aws:dynamodb:*:*:table/Videos", 
        "arn:aws:dynamodb:*:*:table/Videos/index/*"
      ],
      "Effect": "Allow"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": [
        "arn:aws:s3:::valvid-raw-videos/*",
        "arn:aws:s3:::valvid-processed-videos/*"
      ]
    }
  ]
}
EOF
}
# Typically the lambdas would have their own dynamo policy, the creators api doesn't need access to the users table

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_dynamodb.arn
}

resource "aws_cognito_user_pool" "usersPool" {
  name = "usersPool"
  schema {
    name                     = "userID"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = false
    required                 = false
    string_attribute_constraints {
      min_length = 36
      max_length = 36 # UUIDV4
    }
  }
}

resource "aws_cognito_user_pool_client" "usersPool" {
  name = "usersPoolClient"

  user_pool_id    = aws_cognito_user_pool.usersPool.id
  generate_secret = false
}

resource "aws_dynamodb_table" "usersTable" {
  name           = "Users"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "UserId"
  # range_key      = "GameTitle"

  attribute {
    name = "UserId"
    type = "S"
  }
}
#####
# END SIGNUP SERVICE
#####

#####
# CREATOR SERVICE
#####

resource "aws_api_gateway_resource" "creators" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  parent_id   = aws_api_gateway_rest_api.valvid.root_resource_id
  path_part   = "creators"
}

resource "aws_api_gateway_resource" "creators_proxy" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  parent_id   = aws_api_gateway_resource.creators.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "creators_proxy" {
  rest_api_id   = aws_api_gateway_rest_api.valvid.id
  resource_id   = aws_api_gateway_resource.creators_proxy.id
  http_method   = "ANY"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.users_authorizer.id
}

module "cors" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.1"

  api_id          = aws_api_gateway_rest_api.valvid.id
  api_resource_id = aws_api_gateway_resource.creators_proxy.id
}

resource "aws_api_gateway_integration" "creators_lambda" {
  rest_api_id = aws_api_gateway_rest_api.valvid.id
  resource_id = aws_api_gateway_method.creators_proxy.resource_id
  http_method = aws_api_gateway_method.creators_proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.creators.invoke_arn
}

resource "aws_lambda_permission" "apigw_creators" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.creators.function_name
  principal     = "apigateway.amazonaws.com"

  # The "/*/*" portion grants access from any method on any resource
  # within the API Gateway REST API.
  source_arn = "${aws_api_gateway_rest_api.valvid.execution_arn}/*/*"
}

resource "aws_lambda_function" "creators" {
  function_name = "CreatorsWorkflow"

  s3_bucket = "valvid-terraform"
  s3_key    = "v${var.app_version}/valvid.zip"

  handler = "creators.handler"
  runtime = "nodejs12.x"
  timeout = 5
  role    = aws_iam_role.lambda_exec.arn
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_dynamodb_table.usersTable,
    aws_dynamodb_table.videosTable
  ]
}


resource "aws_lambda_function" "authorizer" {
  function_name = "api_gateway_authorizer"

  s3_bucket = "valvid-terraform"
  s3_key    = "v${var.app_version}/valvid.zip"

  handler = "authorizer.handler"
  runtime = "nodejs12.x"
  timeout = 5
  role    = aws_iam_role.lambda_exec.arn
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_dynamodb_table.usersTable
  ]
}

resource "aws_api_gateway_authorizer" "users_authorizer" {
  name                             = "users_authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.valvid.id
  authorizer_uri                   = aws_lambda_function.authorizer.invoke_arn
  authorizer_credentials           = aws_iam_role.invocation_role.arn
  authorizer_result_ttl_in_seconds = 0
  type                             = "TOKEN"
}

resource "aws_iam_role" "invocation_role" {
  name = "api_gateway_auth_invocation"
  path = "/"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "invocation_policy" {
  name = "default"
  role = aws_iam_role.invocation_role.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "lambda:InvokeFunction",
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_dynamodb_table" "videosTable" {
  name           = "Videos"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "VideoId"
  range_key      = "UserId"

  attribute {
    name = "VideoId"
    type = "S"
  }
  attribute {
    name = "UserId"
    type = "S"
  }

  global_secondary_index {
    name            = "VideosUserIndex"
    hash_key        = "UserId"
    range_key       = "VideoId"
    write_capacity  = 1
    read_capacity   = 1
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "rawVideosTable" {
  name           = "RawVideos"
  billing_mode   = "PROVISIONED"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "RawVideoId"

  attribute {
    name = "RawVideoId"
    type = "S"
  }
}

resource "aws_s3_bucket" "raw_videos" {
  bucket = "valvid-raw-videos"
  acl    = "private"

  tags = {
    Name        = "Raw videos"
    Environment = "Dev"
  }
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["*"]
    # expose_headers  = ["Authorization"]
    max_age_seconds = 3000
  }
}


#####
# END SIGNUP SERVICE
#####

#####
# Start video processing service
#####

resource "aws_lambda_permission" "allow_bucket_raw" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.raw_uploaded.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw_videos.arn
}

resource "aws_s3_bucket_notification" "raw_bucket_notification" {
  bucket = aws_s3_bucket.raw_videos.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.raw_uploaded.arn
    events              = ["s3:ObjectCreated:*"]
    # filter_prefix       = "AWSLogs/"
    # filter_suffix       = ".log"
  }

  depends_on = [aws_lambda_permission.allow_bucket_raw]
}

resource "aws_lambda_function" "raw_uploaded" {
  function_name = "RawVideoUploaded"

  s3_bucket = "valvid-terraform"
  s3_key    = "v${var.app_version}/valvid.zip"

  handler = "rawuploaded.handler"
  runtime = "nodejs12.x"
  timeout = 100
  role    = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      JOB_QUEUE_ARN           = aws_media_convert_queue.aws_media_convert_queue.arn,
      PROCESSED_VIDEOS_BUCKET = aws_s3_bucket.processed_videos.id,
      RAW_VIDEOS_BUCKET       = aws_s3_bucket.raw_videos.id,
      JOB_IAM_ROLE_ARN        = aws_iam_role.mediaconvert_role.arn
    }
  }
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_dynamodb_table.usersTable,
    aws_dynamodb_table.videosTable
  ]
}

resource "aws_media_convert_queue" "aws_media_convert_queue" {
  name = "raw-video-queue"
}


resource "aws_s3_bucket" "processed_videos" {
  bucket = "valvid-processed-videos"
  acl    = "private"

  tags = {
    Name        = "Processed videos"
    Environment = "Dev"
  }
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    # expose_headers  = ["Authorization"]
    max_age_seconds = 3000
  }
}


resource "aws_iam_role" "mediaconvert_role" {
  name = "MediaConvert_Default_Role"

  assume_role_policy = <<EOF
{
"Version": "2012-10-17",
"Statement": [
  {
  "Action": "sts:AssumeRole",
  "Principal": {
    "Service": "mediaconvert.amazonaws.com"
  },
  "Effect": "Allow",
  "Sid": ""
  }
]
}
EOF

}

resource "aws_iam_policy" "mediaconvert_policy" {
  name        = "mediaconvert_policy"
  path        = "/"
  description = "Allow the mediaconvert job to run"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::valvid-raw-videos/*",
        "arn:aws:s3:::valvid-processed-videos/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "mediaconvert:*",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "mediaconvert_policy" {
  role       = aws_iam_role.mediaconvert_role.name
  policy_arn = aws_iam_policy.mediaconvert_policy.arn
}

resource "aws_iam_role_policy_attachment" "lamba_media_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.mediaconvert_policy.arn
}


resource "aws_lambda_permission" "allow_bucket_processed" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processing_finished.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.processed_videos.arn
}

resource "aws_s3_bucket_notification" "processed_bucket_notification" {
  bucket = aws_s3_bucket.processed_videos.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processing_finished.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_bucket_processed]
}


resource "aws_lambda_function" "processing_finished" {
  function_name = "VideoProcessed"

  s3_bucket = "valvid-terraform"
  s3_key    = "v${var.app_version}/valvid.zip"

  handler = "videoprocessed.handler"
  runtime = "nodejs12.x"
  timeout = 100
  role    = aws_iam_role.lambda_exec.arn

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_dynamodb_table.usersTable,
    aws_dynamodb_table.videosTable
  ]
}

#####
# End video processing service
#####

#####
# Cloudfront config for viewing the videos
#####

locals {
  s3_origin_id = "processedVideosOrigin"
}
resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
  comment = "VideoOrigin"
}

resource "aws_s3_bucket_policy" "processed_videos" {
  bucket = aws_s3_bucket.processed_videos.id
  
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
      {
          "Effect": "Allow",
          "Principal": {
              "AWS": "${aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn}"
          },
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::valvid-processed-videos/*"
      }
  ]
}
POLICY
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.processed_videos.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = "origin-access-identity/cloudfront/${aws_cloudfront_origin_access_identity.origin_access_identity.id}"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Anything"
  default_root_object = "index.html"

  # logging_config {
  #   include_cookies = false
  #   bucket          = "mylogs.s3.amazonaws.com"
  #   prefix          = "myprefix"
  # }

  # aliases = ["mysite.example.com", "yoursite.example.com"]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  # Cache behavior with precedence 0
  # ordered_cache_behavior {
  #   path_pattern     = "/content/immutable/*"
  #   allowed_methods  = ["GET", "HEAD", "OPTIONS"]
  #   cached_methods   = ["GET", "HEAD", "OPTIONS"]
  #   target_origin_id = local.s3_origin_id

  #   forwarded_values {
  #     query_string = false
  #     headers      = ["Origin"]

  #     cookies {
  #       forward = "none"
  #     }
  #   }

  #   min_ttl                = 0
  #   default_ttl            = 86400
  #   max_ttl                = 31536000
  #   compress               = true
  #   viewer_protocol_policy = "redirect-to-https"
  # }

  # # Cache behavior with precedence 1
  # ordered_cache_behavior {
  #   path_pattern     = "/content/*"
  #   allowed_methods  = ["GET", "HEAD", "OPTIONS"]
  #   cached_methods   = ["GET", "HEAD"]
  #   target_origin_id = local.s3_origin_id

  #   forwarded_values {
  #     query_string = false

  #     cookies {
  #       forward = "none"
  #     }
  #   }

  #   min_ttl                = 0
  #   default_ttl            = 3600
  #   max_ttl                = 86400
  #   compress               = true
  #   viewer_protocol_policy = "redirect-to-https"
  # }

  # price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "dev"
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Outputs
output "base_url" {
  value = aws_api_gateway_deployment.valvid.invoke_url
}
output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.s3_distribution.domain_name
}
