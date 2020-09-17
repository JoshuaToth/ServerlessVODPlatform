rm -rf dist
mkdir dist
npm run compile
cp -r node_modules/ dist/node_modules/
cp -r tsc/ dist/
cp package.json dist/
cd dist
zip -r -q valvid.zip *
cd ..
timestamp=$(date +%s)
aws s3 cp dist/valvid.zip s3://valvid-terraform/v$timestamp/valvid.zip
terraform init
# taint the api gateway so it deploys properly
terraform taint aws_api_gateway_deployment.valvid
terraform apply -var="app_version=$timestamp"