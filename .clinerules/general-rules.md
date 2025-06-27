### Database Workflow

When inserting new tables or columns:

1. Consult `src/types/supabase.ts` to verify if the table or column already exists.
2. If it does not exist, provide the user with the SQL query to be executed in the Supabase SQL Editor.
3. Wait for the user to confirm that the changes have been applied correctly.
   All database modification actions must be explicitly confirmed by the user.
