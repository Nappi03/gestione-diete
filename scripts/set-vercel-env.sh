#!/usr/bin/env bash
# Usage: ./scripts/set-vercel-env.sh <project-name>
# Requires `vercel` CLI and that you're logged in.

PROJECT=${1:-}
if [ -z "$PROJECT" ]; then
  echo "Usage: $0 <vercel-project-name>"
  exit 1
fi

# Secrets should be added first
read -s -p "SUPABASE_SERVICE_ROLE_KEY value: " SUPA_KEY
echo
vercel secrets add supabase-service-role-key "$SUPA_KEY"

# Add production env vars (example)
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<EOF
$PROJECT
EOF
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<EOF
$PROJECT
EOF
# For service role key, add from secret
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<EOF
supabase-service-role-key
EOF

# PDF service
read -p "PDF_SERVICE_URL (leave empty to skip): " PDF_URL
if [ -n "$PDF_URL" ]; then
  vercel env add PDF_SERVICE_URL production <<EOF
$PDF_URL
EOF
  read -s -p "PDF_SERVICE_KEY (leave empty to skip): " PDF_KEY
  echo
  if [ -n "$PDF_KEY" ]; then
    vercel secrets add pdf-service-key "$PDF_KEY"
    vercel env add PDF_SERVICE_KEY production <<EOF
pdf-service-key
EOF
  fi
fi

echo "Environment variables added (production). Repeat for preview/development if needed."