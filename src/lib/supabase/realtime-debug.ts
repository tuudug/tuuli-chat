import { createClient } from "./client";

export const debugRealtimeConfig = async () => {
  console.log("🔍 Debugging Supabase Realtime Configuration...");

  const supabase = createClient();

  try {
    // Test basic connection
    console.log("Testing Supabase connection...");
    const { error } = await supabase
      .from("chats")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("❌ Failed to connect to Supabase:", error);
      return false;
    }

    console.log("✅ Supabase connection successful");

    // Test realtime subscription with minimal config
    console.log("Testing realtime subscription...");

    const channel = supabase
      .channel("realtime-test")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        (payload) => {
          console.log("✅ Realtime test event received:", payload);
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Realtime test subscription successful");

          // Clean up test subscription after 2 seconds
          setTimeout(() => {
            channel.unsubscribe();
            console.log("🧹 Cleaned up test subscription");
          }, 2000);
        } else if (err) {
          console.error("❌ Realtime test subscription failed:", err);
          console.log(`
🛠️  To fix realtime issues, ensure:
1. Realtime is enabled in your Supabase dashboard
2. Row Level Security (RLS) is properly configured for the 'chats' table  
3. The 'chats' table has realtime enabled:
   - Go to Supabase Dashboard > Database > Replication
   - Enable realtime for the 'chats' table
4. Your RLS policies allow the authenticated user to SELECT their own chats
          `);
        }
      });

    return true;
  } catch (error) {
    console.error("❌ Failed to debug realtime config:", error);
    return false;
  }
};

// Call this function in development to debug realtime issues
if (process.env.NODE_ENV === "development") {
  // Delay the debug to let the app initialize
  setTimeout(() => {
    debugRealtimeConfig();
  }, 3000);
}
