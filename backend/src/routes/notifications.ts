import { Hono } from "hono";

const app = new Hono();

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: string;
}

// POST /api/notifications/push
// Sends a push notification via Expo Push API
// Called from the mobile app when a user action should notify another user
app.post("/push", async (c) => {
  try {
    const { token, title, body, data } = await c.req.json<{
      token: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }>();

    if (!token || !title || !body) {
      return c.json({ error: "Missing required fields: token, title, body" }, 400);
    }

    // Validate Expo push token format
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      return c.json({ error: "Invalid push token format" }, 400);
    }

    const message: PushMessage = {
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
      priority: "high",
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json() as { data?: { status: string; message?: string; details?: unknown } };

    if (!response.ok) {
      console.error("Expo Push API error:", responseData);
      return c.json({ error: "Failed to send push notification" }, 500);
    }

    if (responseData.data?.status === "error") {
      console.error("Push notification error:", responseData.data.message);
      return c.json({
        success: false,
        error: responseData.data.message,
        deviceNotRegistered: responseData.data.details &&
          typeof responseData.data.details === 'object' &&
          'error' in responseData.data.details &&
          responseData.data.details.error === "DeviceNotRegistered"
      }, 200);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Push notification route error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export const notificationsRouter = app;
