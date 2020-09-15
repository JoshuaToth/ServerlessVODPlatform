rm -rf dist
mkdir dist
zip dist/users.zip users.js
timestamp=$(date +%s)
aws s3 cp dist/users.zip s3://valvid-terraform/v$timestamp/users.zip
terraform init
terraform apply -var="app_version=$timestamp"