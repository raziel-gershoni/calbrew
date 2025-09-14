import { NextResponse } from 'next/server';
import { query, initializeDatabase } from '@/lib/postgres';

export async function GET() {
  try {
    console.log('Testing PostgreSQL connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log(
      'DATABASE_URL preview:',
      process.env.DATABASE_URL?.substring(0, 50) + '...',
    );

    // Test basic connection
    const result = await query('SELECT 1 as test, NOW() as current_time');
    console.log('Basic query successful:', result.rows[0]);

    // Test database initialization
    await initializeDatabase();
    console.log('Database initialization successful');

    // Test tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables found:', tablesResult.rows);

    return NextResponse.json({
      success: true,
      connection: result.rows[0],
      tables: tablesResult.rows,
      message: 'PostgreSQL connection successful!',
    });
  } catch (error) {
    console.error('PostgreSQL test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
