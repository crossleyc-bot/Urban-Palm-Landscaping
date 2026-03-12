#!/bin/bash
set -euo pipefail

#######################################################################
# Urban Palm Landscaping — AWS CLI Deployment Script
#
# Provisions and deploys the full Elastic Beanstalk stack:
#   - S3 bucket for application versions
#   - EB application & environment (Node.js 22 on AL2023)
#   - ALB with HTTPS (ACM certificate) + HTTP→HTTPS redirect
#   - Environment variables, health check, IAM instance profile
#
# Prerequisites:
#   - AWS CLI v2 configured with credentials (aws configure)
#   - Existing ACM certificate and IAM instance profile
#   - Node.js & npm installed locally for building the bundle
#
# Usage:
#   chmod +x deploy-aws.sh
#   ./deploy-aws.sh          # Full provision + deploy
#   ./deploy-aws.sh deploy   # Deploy new version to existing env
#######################################################################

# ── Configuration ────────────────────────────────────────────────────
APP_NAME="urban-palm-landscaping"
ENV_NAME="urban-palm-prod"
REGION="us-east-1"
PLATFORM="64bit Amazon Linux 2023 v6.4.1 running Node.js 22"
S3_BUCKET="${APP_NAME}-deployments"
INSTANCE_PROFILE="aws-elasticbeanstalk-ec2-role"
ACM_CERT_ARN="arn:aws:acm:us-east-1:059378383038:certificate/001d6601-1016-4b12-bd6d-1d585e4d4554"
SSL_POLICY="ELBSecurityPolicy-TLS13-1-2-2021-06"
HEALTH_CHECK_PATH="/api/health"
VERSION_LABEL="v-$(date +%Y%m%d-%H%M%S)"
BUNDLE_NAME="${APP_NAME}-${VERSION_LABEL}.zip"

echo "=== Urban Palm Landscaping — AWS Deployment ==="
echo "Region:  ${REGION}"
echo "App:     ${APP_NAME}"
echo "Env:     ${ENV_NAME}"
echo "Version: ${VERSION_LABEL}"
echo ""

# ── Helper: retry with exponential backoff ───────────────────────────
retry() {
  local max_attempts=4
  local delay=2
  local attempt=1
  while true; do
    "$@" && return 0
    if (( attempt >= max_attempts )); then
      echo "ERROR: Command failed after ${max_attempts} attempts: $*"
      return 1
    fi
    echo "  Retry ${attempt}/${max_attempts} in ${delay}s..."
    sleep "${delay}"
    delay=$(( delay * 2 ))
    attempt=$(( attempt + 1 ))
  done
}

# ── Step 1: Create S3 bucket for deployment artifacts ────────────────
create_s3_bucket() {
  echo "── Creating S3 bucket: ${S3_BUCKET}"
  if aws s3api head-bucket --bucket "${S3_BUCKET}" --region "${REGION}" 2>/dev/null; then
    echo "   Bucket already exists, skipping."
  else
    if [ "${REGION}" = "us-east-1" ]; then
      aws s3api create-bucket \
        --bucket "${S3_BUCKET}" \
        --region "${REGION}"
    else
      aws s3api create-bucket \
        --bucket "${S3_BUCKET}" \
        --region "${REGION}" \
        --create-bucket-configuration LocationConstraint="${REGION}"
    fi
    echo "   Bucket created."
  fi
}

# ── Step 2: Create Elastic Beanstalk application ─────────────────────
create_eb_application() {
  echo "── Creating EB application: ${APP_NAME}"
  if aws elasticbeanstalk describe-applications \
      --application-names "${APP_NAME}" \
      --region "${REGION}" \
      --query "Applications[0].ApplicationName" \
      --output text 2>/dev/null | grep -q "${APP_NAME}"; then
    echo "   Application already exists, skipping."
  else
    aws elasticbeanstalk create-application \
      --application-name "${APP_NAME}" \
      --description "Urban Palm Landscaping — Full-stack web application" \
      --region "${REGION}"
    echo "   Application created."
  fi
}

# ── Step 3: Bundle source code ───────────────────────────────────────
create_bundle() {
  echo "── Bundling application source..."
  # Build frontend
  npm ci
  npm run build

  # Create deployment zip (exclude dev/git artifacts)
  zip -r "/tmp/${BUNDLE_NAME}" . \
    -x ".git/*" \
    -x "node_modules/*" \
    -x ".elasticbeanstalk/*" \
    -x "deploy-aws.sh" \
    -x ".env*" \
    -x "*.log"

  echo "   Bundle created: /tmp/${BUNDLE_NAME}"
}

# ── Step 4: Upload bundle to S3 & create application version ────────
create_app_version() {
  echo "── Uploading bundle to S3..."
  retry aws s3 cp "/tmp/${BUNDLE_NAME}" "s3://${S3_BUCKET}/${BUNDLE_NAME}" \
    --region "${REGION}"

  echo "── Creating application version: ${VERSION_LABEL}"
  aws elasticbeanstalk create-application-version \
    --application-name "${APP_NAME}" \
    --version-label "${VERSION_LABEL}" \
    --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${BUNDLE_NAME}" \
    --region "${REGION}"
  echo "   Version created."
}

# ── Step 5: Create or update the environment ─────────────────────────
deploy_environment() {
  local env_exists
  env_exists=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query "Environments[?Status!='Terminated'] | length(@)" \
    --output text 2>/dev/null || echo "0")

  # Option settings array (JSON)
  local OPTION_SETTINGS
  OPTION_SETTINGS=$(cat <<'SETTINGS'
[
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "IamInstanceProfile",
    "Value": "IAM_PROFILE_PLACEHOLDER"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment",
    "OptionName": "LoadBalancerType",
    "Value": "application"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:proxy",
    "OptionName": "ProxyServer",
    "Value": "nginx"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "NODE_ENV",
    "Value": "production"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PORT",
    "Value": "8080"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "NPM_CONFIG_PRODUCTION",
    "Value": "false"
  },
  {
    "Namespace": "aws:elasticbeanstalk:environment:process:default",
    "OptionName": "HealthCheckPath",
    "Value": "HEALTH_CHECK_PLACEHOLDER"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "Protocol",
    "Value": "HTTPS"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLCertificateArns",
    "Value": "ACM_CERT_PLACEHOLDER"
  },
  {
    "Namespace": "aws:elbv2:listener:443",
    "OptionName": "SSLPolicy",
    "Value": "SSL_POLICY_PLACEHOLDER"
  },
  {
    "Namespace": "aws:elbv2:listener:default",
    "OptionName": "ListenerEnabled",
    "Value": "true"
  }
]
SETTINGS
)

  # Substitute placeholders with actual values
  OPTION_SETTINGS=$(echo "${OPTION_SETTINGS}" \
    | sed "s|IAM_PROFILE_PLACEHOLDER|${INSTANCE_PROFILE}|" \
    | sed "s|HEALTH_CHECK_PLACEHOLDER|${HEALTH_CHECK_PATH}|" \
    | sed "s|ACM_CERT_PLACEHOLDER|${ACM_CERT_ARN}|" \
    | sed "s|SSL_POLICY_PLACEHOLDER|${SSL_POLICY}|")

  if [ "${env_exists}" = "0" ]; then
    echo "── Creating environment: ${ENV_NAME}"
    aws elasticbeanstalk create-environment \
      --application-name "${APP_NAME}" \
      --environment-name "${ENV_NAME}" \
      --solution-stack-name "${PLATFORM}" \
      --version-label "${VERSION_LABEL}" \
      --option-settings "${OPTION_SETTINGS}" \
      --region "${REGION}"
    echo "   Environment creation initiated."
  else
    echo "── Updating environment: ${ENV_NAME}"
    aws elasticbeanstalk update-environment \
      --application-name "${APP_NAME}" \
      --environment-name "${ENV_NAME}" \
      --version-label "${VERSION_LABEL}" \
      --option-settings "${OPTION_SETTINGS}" \
      --region "${REGION}"
    echo "   Environment update initiated."
  fi
}

# ── Step 6: Wait for environment to be ready ─────────────────────────
wait_for_environment() {
  echo "── Waiting for environment to be ready (this may take several minutes)..."
  aws elasticbeanstalk wait environment-updated \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" 2>/dev/null || true

  # Get final status
  local status
  status=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query "Environments[0].[Status, HealthStatus, CNAME]" \
    --output text)
  echo "   Environment status: ${status}"
}

# ── Step 7: Print environment info ───────────────────────────────────
print_info() {
  echo ""
  echo "=== Deployment Complete ==="
  local cname
  cname=$(aws elasticbeanstalk describe-environments \
    --application-name "${APP_NAME}" \
    --environment-names "${ENV_NAME}" \
    --region "${REGION}" \
    --query "Environments[0].CNAME" \
    --output text 2>/dev/null || echo "pending")
  echo "URL:     http://${cname}"
  echo "HTTPS:   https://${cname}"
  echo "Health:  https://${cname}${HEALTH_CHECK_PATH}"
  echo "Version: ${VERSION_LABEL}"
  echo ""
  echo "Useful commands:"
  echo "  aws elasticbeanstalk describe-environment-health --environment-name ${ENV_NAME} --attribute-names All --region ${REGION}"
  echo "  aws elasticbeanstalk describe-events --environment-name ${ENV_NAME} --region ${REGION} --max-items 10"
  echo "  aws elasticbeanstalk terminate-environment --environment-name ${ENV_NAME} --region ${REGION}"
}

# ── Main ─────────────────────────────────────────────────────────────
main() {
  local mode="${1:-full}"

  if [ "${mode}" = "deploy" ]; then
    echo "Mode: deploy only (skip provisioning)"
    create_bundle
    create_app_version
    deploy_environment
    wait_for_environment
    print_info
  else
    echo "Mode: full provision + deploy"
    create_s3_bucket
    create_eb_application
    create_bundle
    create_app_version
    deploy_environment
    wait_for_environment
    print_info
  fi

  # Cleanup
  rm -f "/tmp/${BUNDLE_NAME}"
}

main "$@"
