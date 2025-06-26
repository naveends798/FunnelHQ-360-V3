#!/usr/bin/env node

// Direct test of Supabase connection and table structure
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptlahrhzavhekjvtyfud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bGFocmh6YXZoZWtqdnR5ZnVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY4NjMxMiwiZXhwIjoyMDY2MjYyMzEyfQ.IvVrDFdAu46Ree6gagV_216_tG2hP6DWNGg1tLWArrs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Testing Supabase Connection...');
  
  try {
    // Test 1: Check if we can connect
    console.log('\n1. Testing connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
      
    if (tablesError) {
      console.log('❌ Connection error:', tablesError.message);
      return;
    }
    
    console.log('✅ Connection successful');
    
    // Test 2: Check existing users
    console.log('\n2. Checking existing users...');
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);
      
    if (usersError) {
      console.log('❌ Users select error:', usersError.message);
    } else {
      console.log('👥 Existing users:', existingUsers.length);
      if (existingUsers.length > 0) {
        console.log('👤 Sample user:', existingUsers[0]);
      }
    }
    
    // Test 2b: Try to get existing client data
    console.log('\n2b. Checking existing client data...');
    const { data: existingData, error: selectError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
      
    if (selectError) {
      console.log('❌ Select error:', selectError.message);
    } else {
      console.log('📊 Existing records:', existingData.length);
      if (existingData.length > 0) {
        console.log('📝 Sample record:', existingData[0]);
      }
    }
    
    // Test 3: Try minimal insert
    console.log('\n3. Testing minimal insert...');
    const testClient = {
      name: 'Direct Test Client',
      email: 'direct@test.com',
      created_by: 8  // Use existing user ID
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('clients')
      .insert([testClient])
      .select()
      .single();
      
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('🔍 Error details:', insertError);
    } else {
      console.log('✅ Insert successful!');
      console.log('📊 Inserted data:', insertData);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testSupabase();