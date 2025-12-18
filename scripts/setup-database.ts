import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...\n')

  // Read SQL schema
  const schemaPath = join(process.cwd(), 'supabase', 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')

  console.log('📄 Loaded schema.sql')
  console.log(`📊 SQL length: ${schema.length} characters\n`)

  // Execute SQL via Supabase REST API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: schema }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Failed to execute SQL:')
    console.error(error)
    process.exit(1)
  }

  console.log('✅ Database schema executed successfully!\n')
  console.log('📋 Verifying tables...\n')

  // Verify tables were created
  const tables = [
    'clients',
    'contacts',
    'gig_types',
    'gigs',
    'invoices',
    'invoice_lines',
    'expenses',
    'company_settings',
  ]

  for (const table of tables) {
    try {
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?limit=0`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      )

      if (checkResponse.ok) {
        console.log(`✅ Table '${table}' exists`)
      } else {
        console.log(`⚠️  Table '${table}' might not exist`)
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}':`, error)
    }
  }

  console.log('\n🎉 Database setup complete!')
  console.log('\n📝 Next steps:')
  console.log('  1. Run: npm run dev')
  console.log('  2. Open: http://localhost:3000')
  console.log('  3. Start adding your clients!\n')
}

setupDatabase().catch(console.error)
