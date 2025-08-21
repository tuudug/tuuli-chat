import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userEmail, transactionRemark } = await request.json();

    if (!userEmail || !transactionRemark) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Telegram Bot configuration
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Missing Telegram configuration");
      return NextResponse.json(
        { error: "Telegram configuration not found" },
        { status: 500 }
      );
    }

    // Format the message
    const message =
      `🔔 *Payment Notification*\n\n` +
      `👤 *User:* ${userEmail}\n` +
      `💰 *Amount:* 10,000₮\n` +
      `📝 *Transaction Remark:* \`${transactionRemark}\`\n` +
      `⏰ *Time:* ${new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ulaanbaatar",
      })}\n\n` +
      `Please verify the payment and upgrade the user to premium.`;

    // Send message to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      console.error("Telegram API error:", errorData);
      return NextResponse.json(
        { error: "Failed to send Telegram notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Notification sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
