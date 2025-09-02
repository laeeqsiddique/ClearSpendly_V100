import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // This requires service role key to modify functions
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Insert into the correct table name: "user" (singular, quoted)
          INSERT INTO public."user" (id, email, full_name, avatar_url)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>\'full_name\', \'\'),
            COALESCE(NEW.raw_user_meta_data->>\'avatar_url\', \'\')
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, "user".full_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, "user".avatar_url),
            updated_at = NOW();
          
          RETURN NEW;
        EXCEPTION
          WHEN OTHERS THEN
            -- Log error but don\'t fail the auth process
            RAISE LOG \'Failed to create user record for %: %\', NEW.email, SQLERRM;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    if (error) {
      console.error('Database fix error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OAuth user creation function fixed' 
    })

  } catch (error) {
    console.error('Fix OAuth DB error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}