$ErrorActionPreference = 'Stop'

# Node 24 can use the Windows trusted certificate store. This avoids failures
# when the local network inserts a trusted corporate inspection certificate.
$env:NODE_USE_SYSTEM_CA = '1'
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue

function Read-DotEnvValue([string]$name) {
  $line = Get-Content .env.local | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $name in .env.local" }
  return (($line -split '=', 2)[1]).Trim().Trim('"').Trim("'")
}

function ConvertTo-PlainText([Security.SecureString]$secureValue) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Get-SupabaseToken([string]$label) {
  $email = (Read-Host "$label email").Trim()
  $password = ConvertTo-PlainText (Read-Host "$label password" -AsSecureString)
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $url = "$(Read-DotEnvValue 'VITE_SUPABASE_URL')/auth/v1/token?grant_type=password"
  $key = Read-DotEnvValue 'VITE_SUPABASE_PUBLISHABLE_KEY'
  try {
    $result = Invoke-RestMethod $url -Method Post -Headers @{ apikey = $key } -ContentType 'application/json' -Body $body
    Write-Host "$label login succeeded."
    return $result.access_token
  } catch {
    Write-Error "$label login failed: $($_.ErrorDetails.Message)"
    throw
  }
}

$env:SUPABASE_TEST_ACCESS_TOKEN = Get-SupabaseToken 'Identity A'
$env:SUPABASE_TEST_SECOND_ACCESS_TOKEN = Get-SupabaseToken 'Identity B'
$env:SUPABASE_TEST_ORGANIZATION_A_ID = (Read-Host 'Organization A UUID').Trim()
$env:SUPABASE_TEST_ORGANIZATION_B_ID = (Read-Host 'Organization B UUID').Trim()
$env:SUPABASE_TEST_ORGANIZATION_A_ALTERNATE_ROLE_ID = (Read-Host 'Organization A alternate role UUID').Trim()
$env:SUPABASE_TEST_ORGANIZATION_B_ROLE_ID = (Read-Host 'Organization B role UUID').Trim()

$teamWorkOrderId = (Read-Host 'Optional team Work Order UUID (press Enter to skip)').Trim()
$nonTeamWorkOrderId = (Read-Host 'Optional non-team Work Order UUID (press Enter to skip)').Trim()
if ($teamWorkOrderId) { $env:SUPABASE_TEST_TEAM_WORK_ORDER_ID = $teamWorkOrderId }
if ($nonTeamWorkOrderId) { $env:SUPABASE_TEST_NON_TEAM_WORK_ORDER_ID = $nonTeamWorkOrderId }

npm.cmd run check:security
