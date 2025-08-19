# tuuli Chat

This is a [Next.js](https://nextjs.org) project with Clerk authentication and Supabase database integration.

## Prerequisites

Before running the application, you'll need to set up:

1. A [Clerk](https://clerk.com) account for authentication
2. A [Supabase](https://supabase.com) account for the database
3. Enable the Clerk-Supabase integration in your Clerk dashboard

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Site URL for redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Getting Your Environment Variables

#### Clerk Variables:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys** in the sidebar
4. Copy the **Publishable key** and **Secret key**

#### Supabase Variables:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings > API**
4. Copy the **Project URL** and **anon public** key

#### Enable Clerk-Supabase Integration:

1. In Clerk Dashboard, go to **Integrations**
2. Find and enable **Supabase** integration
3. This adds the required JWT claims for Supabase RLS

## Database Setup

The application expects certain tables in your Supabase database:

- `user_profiles` - User profile information and settings
- Other tables as defined in your schema

Make sure your Supabase Row Level Security (RLS) policies are configured to work with Clerk user IDs.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up your environment variables (see above)

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser

## Authentication Flow

- Users sign in through Clerk (Google OAuth supported)
- Clerk provides session tokens that work with Supabase RLS
- Database operations are performed using Clerk-authenticated Supabase clients
- User profiles are stored in Supabase with Clerk user IDs

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run sync:types` - Generate Supabase types

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk-Supabase Integration](https://clerk.com/docs/integrations/databases/supabase)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Make sure to add all environment variables to your Vercel deployment settings.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
