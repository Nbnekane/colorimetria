import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xrzhgjktlbnysrnukcsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyemhnamt0bGJueXNybnVrY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODI1MDgsImV4cCI6MjA4OTg1ODUwOH0.wxdyLzt1SkmVSqZ3XYc0daVCElVktiVd4hW2ZZl1Ysw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
