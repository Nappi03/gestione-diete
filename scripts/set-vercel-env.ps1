Param(
  [string]$project
)
if (-not $project) {
  Write-Host "Usage: .\scripts\set-vercel-env.ps1 -project <vercel-project-name>"
  exit 1
}

# SUPABASE_SERVICE_ROLE_KEY
$SUPA_KEY = Read-Host -AsSecureString "SUPABASE_SERVICE_ROLE_KEY value"
$SUPA_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SUPA_KEY))
vercel secrets add supabase-service-role-key $SUPA_KEY_PLAIN

# Add envs (production)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# add secret reference for service key
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# PDF service
$PDF_URL = Read-Host "PDF_SERVICE_URL (leave empty to skip)"
if ($PDF_URL) {
  vercel env add PDF_SERVICE_URL production
  $PDF_KEY = Read-Host -AsSecureString "PDF_SERVICE_KEY (leave empty to skip)"
  if ($PDF_KEY.Length -gt 0) {
    $PDF_KEY_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($PDF_KEY))
    vercel secrets add pdf-service-key $PDF_KEY_PLAIN
    vercel env add PDF_SERVICE_KEY production
  }
}

Write-Host "Done. Review variables in Vercel dashboard."