#Requires -Version 5.1
<#
  部署 ai_pred 到服务器上的 Nginx 静态目录（默认与 /ai-pred/ 子路径部署一致）。

  用法（在项目根目录执行）:
    .\deploy.ps1
    .\deploy.ps1 -SkipBuild
    $env:DEPLOY_HOST = "111.229.25.160"; .\deploy.ps1

  环境变量（可选）:
    DEPLOY_HOST     服务器地址，默认 111.229.25.160
    DEPLOY_USER     SSH 用户，默认 ubuntu
    DEPLOY_PATH     远端 dist 目录，默认 /home/project2/dist
    VITE_API_BASE   若接口非同源，构建前设置，例如 http://111.229.25.160:8001/api/v1

  依赖: 本机已安装 Node.js、npm；已配置好 SSH 密钥登录远端，且本机有 scp 命令（Windows 10+ 自带 OpenSSH 客户端）。
#>

param(
  [switch] $SkipBuild,
  [string] $ServerHost = "",
  [string] $ServerUser = "",
  [string] $RemotePath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-DeployVar {
  param([string] $EnvName, [string] $ParamVal, [string] $Default)
  if ($ParamVal) { return $ParamVal }
  $e = [Environment]::GetEnvironmentVariable($EnvName, "Process")
  if ($e) { return $e }
  return $Default
}

$DeployHost = Resolve-DeployVar "DEPLOY_HOST" $ServerHost "111.229.25.160"
$DeployUser = Resolve-DeployVar "DEPLOY_USER" $ServerUser "ubuntu"
$DeployRemotePath = Resolve-DeployVar "DEPLOY_PATH" $RemotePath "/home/project2/dist"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "==> 项目目录: $Root" -ForegroundColor Cyan
Write-Host "==> 目标: ${DeployUser}@${DeployHost}:${DeployRemotePath}" -ForegroundColor Cyan

if (-not $SkipBuild) {
  Write-Host "==> npm install..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "==> npm run build..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host "==> 已跳过构建 (-SkipBuild)" -ForegroundColor Yellow
}

if (-not (Test-Path -Path (Join-Path $Root "dist\index.html"))) {
  Write-Error "dist\index.html 不存在，请先构建或去掉 -SkipBuild"
}

Write-Host "==> 上传 dist -> 远端 (${DeployRemotePath})..." -ForegroundColor Cyan
$distFolder = Join-Path $Root "dist"
# 上传 dist 目录内容到远端（与 nginx alias 指向的 dist 一致）
$scpTarget = "${DeployUser}@${DeployHost}:${DeployRemotePath}/"
& scp -r "${distFolder}/." $scpTarget
if ($LASTEXITCODE -ne 0) {
  Write-Error "scp 失败，请检查 SSH、路径与权限"
}

Write-Host "==> 部署完成。若需重载 Nginx，在服务器执行:" -ForegroundColor Green
Write-Host "    sudo nginx -t && sudo systemctl reload nginx" -ForegroundColor Gray
