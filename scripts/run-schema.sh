#!/bin/bash

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "🚀 Running database schema..."
echo ""

# Read the SQL file
SQL=$(cat supabase/schema.sql)

# Execute via psql through Supabase's connection string
# Note: This requires the database password from Supabase dashboard

echo "⚠️  To run the schema, please:"
echo "1. Go to https://supabase.com/dashboard/project/yemzxdqaextfsqnrtxyw"
echo "2. Click on 'SQL Editor' in the left sidebar"
echo "3. Click 'New query'"
echo "4. Copy and paste the content from: supabase/schema.sql"
echo "5. Click 'Run' or press Cmd+Enter"
echo ""
echo "This will create all tables, insert default data, and set up the database."
echo ""
echo "✅ After running the schema, come back here and we'll continue building!"
