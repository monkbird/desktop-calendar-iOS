// src/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://meykzllvsjngtebcyhba.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1leWt6bGx2c2puZ3RlYmN5aGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjk2NjcsImV4cCI6MjA4MDc0NTY2N30.ZDPJcYePqcID4XmEqsviQLMliPN2yId_CEJtnr-vW-0';

export const supabase = createClient(supabaseUrl, supabaseKey);
