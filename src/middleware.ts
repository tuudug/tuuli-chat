import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isProtectedRoute = createRouteMatcher(["/chat(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();

  // If user is authenticated AND on the root path, redirect to /chat/new
  if (userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/chat/new", req.url));
  }

  // If the user is not authenticated AND is trying to access protected routes, redirect to homepage
  if (!userId && isProtectedRoute(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Supabase-Clerk integration: Pass Clerk session token to Supabase
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // If user is authenticated, get the Clerk token and set it in Supabase
  if (userId) {
    const token = await getToken({ template: "supabase" });
    if (token) {
      // Set the custom JWT token in Supabase session
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "mock_refresh_token", // Required but not used with custom tokens
      });
    }
  }

  return response;
});

export const config = {
  // Run middleware on the root and chat routes
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
