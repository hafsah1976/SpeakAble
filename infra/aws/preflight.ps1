param(
  [string]$Region = "us-east-1",
  [string]$UserPoolId = "us-east-1_Elr16XsoJ",
  [string]$EcrRepository = "speakable-api"
)

$ErrorActionPreference = "Continue"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "== $Title =="
}

function Invoke-Check {
  param(
    [string]$Title,
    [scriptblock]$Command
  )

  Write-Section $Title
  try {
    & $Command
  } catch {
    Write-Host "FAILED: $($_.Exception.Message)"
  }
}

$aws = Get-Command aws -ErrorAction SilentlyContinue
if (-not $aws) {
  $defaultAws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
  if (Test-Path $defaultAws) {
    $awsCommand = $defaultAws
  } else {
    Write-Error "AWS CLI was not found on PATH or at $defaultAws."
    exit 1
  }
} else {
  $awsCommand = $aws.Source
}

Invoke-Check "AWS identity" {
  & $awsCommand sts get-caller-identity --output table
}

Invoke-Check "AWS region" {
  & $awsCommand configure get region
  Write-Host "Expected deployment region: $Region"
}

Invoke-Check "Cognito user pool" {
  & $awsCommand cognito-idp describe-user-pool `
    --region $Region `
    --user-pool-id $UserPoolId `
    --query "UserPool.{Name:Name,Id:Id}" `
    --output table
}

Invoke-Check "ECR repository" {
  & $awsCommand ecr describe-repositories `
    --region $Region `
    --repository-names $EcrRepository `
    --query "repositories[].{Name:repositoryName,Uri:repositoryUri,ScanOnPush:imageScanningConfiguration.scanOnPush}" `
    --output table
}

Invoke-Check "RDS instances" {
  & $awsCommand rds describe-db-instances `
    --region $Region `
    --query "DBInstances[].{Id:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Endpoint:Endpoint.Address,Port:Endpoint.Port}" `
    --output table
}

Invoke-Check "App Runner services" {
  & $awsCommand apprunner list-services `
    --region $Region `
    --query "ServiceSummaryList[].{Name:ServiceName,Status:Status,Url:ServiceUrl}" `
    --output table
}

Invoke-Check "Docker daemon" {
  docker info --format "Docker server: {{.ServerVersion}}"
}
