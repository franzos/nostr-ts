#!/bin/bash

pnpm run build || exit 1

# Prompt the user which folder to upload
FOLDER_NAME="./dist"
AWS_BUCKET_URL="s3://nostrop.com"
PROFILE_NAME="nostrop"
CLOUDFRONT_ID="E3QIFOMG099G2H"

echo "Using AWS profile: $PROFILE_NAME"
echo "Uploading folder: $FOLDER_NAME"
echo "Destination: $AWS_BUCKET_URL"

# Upload the folder to S3 using AWS CLI
aws s3 sync $FOLDER_NAME $AWS_BUCKET_URL --profile $PROFILE_NAME

# Invalidate CloudFront (Uncomment if you need this)
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --profile $PROFILE_NAME
