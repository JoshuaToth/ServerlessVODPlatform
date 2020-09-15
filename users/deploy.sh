rm -rf dist
mkdir dist
cp -r node_modules/ dist/node_modules/
cp -r src/ dist/
cp package.json dist/
cd dist
zip -r -q users.zip *
cd ..
timestamp=$(date +%s)
aws s3 cp dist/users.zip s3://valvid-terraform/v$timestamp/users.zip
terraform init
# taint the api gateway so it deploys properly
# terraform taint aws_api_gateway_deployment.users
terraform apply -var="app_version=$timestamp"