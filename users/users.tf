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
# CORS WILL BE AN ISSUE I THINK
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
  role = aws_iam_role.lambda_exec.arn
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cognito_user_pool_client.usersPool,
    aws_dynamodb_table.usersTable
  ]
  environment {
    variables = {
      COGNITO_POOL_ID = aws_cognito_user_pool.usersPool.id
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
      "Resource": "arn:aws:dynamodb:*:*:table/Users",
      "Effect": "Allow"
    }
  ]
}
EOF
}

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
      max_length = 36  # UUIDV4
    }
  }
}

resource "aws_cognito_user_pool_client" "usersPool" {
  name = "usersPoolClient"

  user_pool_id = aws_cognito_user_pool.usersPool.id
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
  authorization = "NONE" # this will need an authorizer!
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
  timeout = 15
  role = aws_iam_role.lambda_exec.arn
  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_dynamodb_table.usersTable
  ]
}

# Api gateway config for new lambda

# new lambda Authoriser

# new lambda (API)

# policy for lambda, can use the other logging policy

# new dynamo tables


#####
# END SIGNUP SERVICE
#####

# Outputs
output "base_url" {
  value = aws_api_gateway_deployment.valvid.invoke_url
}
