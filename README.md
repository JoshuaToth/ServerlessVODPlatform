# Valvid serverless VOD platform
This is the code from my personal hackathon. The directory structure is broken up into `/frontend` and `/platform`. The code is currently as it was when the first end-to-end was reached and definitely isn't my best work, it is hackathon code and should be treated as such.

## Getting started
First you need to set up the AWS cli and get Terraform up and running.

Once your environment is ready, first run `setup-terraform.sh` to create the s3 bucket that terraform needs to store the lambdas. You may need to edit the bucket name, they are unique.

Next will be standing up the platform itself. It should be as easy as
```
cd platform
npm i
./deploy.sh
```
Whenever you make a change to a lambda function you will need to run `./deploy.sh` to publish your latest changes. 

This should stand up the entire platform within AWS, cloudfront may take a little while so be patient. 

Now the platform is available go ahead and enter the frontend directory and start the app
```
cd ..
cd frontend
yarn
yarn start
```
The Frontend should open in your browser automatically and be good to use!

You will first need to create a users, there are some prefab credentials that I've added in for myself to get started. These should work if you want to leave them, or you can enter your own credentials.

Once a user has signed up, you will need to access the cognito console in AWS to authorize them. Once that is done, they can be used to log in and create videos!