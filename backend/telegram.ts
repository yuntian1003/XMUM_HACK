/**
 * Telegram Bot service for Farm Desk PO approval workflow.
 *
 * Supports MULTIPLE owners — each farm links its own owner independently.
 *
 * Multi-owner linking flow:
 *  1. Farm owner opens Farm Desk → switches to "Owner" role.
 *  2. Clicks "Link My Telegram" → backend generates a 6-char one-time code.
 *  3. UI shows: send `/link ABC123` to @AgriGuard_Farm_bot
 *  4. Owner sends that on Telegram → poller records their chatId for that farmId.
 *  5. Future POs for that farmId are sent only to their linked Telegram.
 *
 * PO approval flow:
 *  1. Manager confirms treatment → shortages detected → "Send PO to Telegram" appears.
 *  2. sendPOToTelegram(poId, items, farmId) sends to the farm's linked owner.
 *  3. Owner taps ✅/❌ on Telegram → poller handles callback → updates poStore.
 *  4. Frontend polls trpc.farmDesk.pollStatus every 3s and auto-updates UI.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── In-memory PO state ─────────────────────────────────────────────────────────

export type POStatus = "pending" | "approved" | "rejected";

interface PORecord {
  poId: string;
  status: POStatus;
  messageId: number;
  decidedAt?: string;
}

const poStore = new Map<string, PORecord>();

// ── Multi-owner: farmId → Telegram chatId ─────────────────────────────────────

const farmChatIdMap = new Map<string, number>();

// ── Link codes: code → userId ─────────────────────────────────────────────────
// Codes are permanent and deterministic (derived from openId).
// They never expire — a user always has the same code.

interface LinkCodeEntry {
  userId: string;   // the user's openId
  expiresAt: number; // Infinity for permanent codes
}

const linkCodes = new Map<string, LinkCodeEntry>();

// ── Telegram API helpers ───────────────────────────────────────────────────────

async function telegramPost(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? "unknown error"}`);
  }
  return data.result;
}

// ── Deterministic link code per user ─────────────────────────────────────────
// The code is a stable 6-char alphanumeric string derived from the userId.
// It never expires and is always the same for the same user.
// Only authenticated users (protectedProcedure) can retrieve it.

function hashUserId(userId: string): string {
  // djb2 hash → base36 → uppercase 6 chars
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

/**
 * Returns the permanent link code for a user (derived from openId).
 * This is the ONLY way to get a code — no random generation, no expiry.
 */
export function getOrCreateLinkCode(userId: string): string {
  const code = hashUserId(userId);
  // Register code → userId so the bot's /link handler knows which user to link
  linkCodes.set(code, { userId, expiresAt: Infinity });
  return code;
}

/** Returns true if the user already has a linked Telegram account. */
export function isFarmLinked(userId: string): boolean {
  return farmChatIdMap.has(userId);
}

/** Unlink a user's Telegram (so they can re-link a different account). */
export function unlinkFarm(userId: string): void {
  farmChatIdMap.delete(userId);
  console.log(`[Telegram] User "${userId}" unlinked.`);
}

// ── Core update processor ──────────────────────────────────────────────────────

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number; first_name?: string };
    message?: { message_id: number; chat: { id: number } };
  };
};

async function processUpdate(update: TelegramUpdate): Promise<void> {

  // ── /link <CODE> messages ────────────────────────────────────────────────────
  if (update.message?.text) {
    const text = update.message.text.trim();
    const match = text.match(/^\/link\s+([A-Z0-9]{6})$/i);
    if (match) {
      const code = match[1].toUpperCase();
      const chatId = update.message.chat.id;
      const senderName = update.message.from?.first_name ?? "Owner";
      const entry = linkCodes.get(code);

      if (!entry) {
        await telegramPost("sendMessage", {
          chat_id: chatId,
          text: "❌ That code is not recognised.\nMake sure you are logged in to Farm Desk, switch to the Owner role, and tap \"Generate Link Code\" to get your code.",
        });
        return;
      }

      // ✅ Link this user's account to their Telegram chatId
      farmChatIdMap.set(entry.userId, chatId);
      // Keep the code in the map so it can be re-used (it's permanent)
      console.log(`[Telegram] User "${entry.userId}" linked → chat_id ${chatId} (@${update.message.from?.username ?? "unknown"})`);

      await telegramPost("sendMessage", {
        chat_id: chatId,
        text: [
          `🌾 *Farm Desk — Telegram Linked Successfully!*`,
          ``,
          `Hi ${senderName}! Your Telegram is now linked as the *Farm Owner* for this account.`,
          ``,
          `You will receive Purchase Order drafts here for approval.`,
          `Tap ✅ *Approve PO* or ❌ *Reject PO* on each message.`,
        ].join("\n"),
        parse_mode: "Markdown",
      });
      return;
    }
  }

  // ── ✅/❌ inline button taps ──────────────────────────────────────────────────
  const cq = update.callback_query;
  if (!cq?.data) return;

  const [action, poId] = cq.data.split(":");
  if (!poId || (action !== "po_approve" && action !== "po_reject")) return;

  const existing = poStore.get(poId);
  if (existing && existing.status !== "pending") return; // already decided, ignore

  const status: POStatus = action === "po_approve" ? "approved" : "rejected";
  const decidedAt = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  poStore.set(poId, {
    poId,
    status,
    messageId: existing?.messageId ?? cq.message?.message_id ?? 0,
    decidedAt,
  });

  // Acknowledge button tap (clears spinner on Telegram)
  await telegramPost("answerCallbackQuery", {
    callback_query_id: cq.id,
    text: status === "approved" ? "✅ PO Approved!" : "❌ PO Rejected",
  });

  // Edit the message to reflect the final decision
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id ?? existing?.messageId;
  const icon = status === "approved" ? "✅" : "❌";
  const label = status === "approved" ? "APPROVED" : "REJECTED";

  await telegramPost("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: [
      `🌾 *Farm Desk — Purchase Order*`,
      ``,
      `*PO Reference:* \`${poId}\``,
      ``,
      `${icon} *${label} by Owner*`,
      `_Decision recorded at ${decidedAt}_`,
      ``,
      status === "approved"
        ? "✅ Draft approved. Contact the supplier to place the order."
        : "❌ Draft rejected. No order will be placed.",
    ].join("\n"),
    parse_mode: "Markdown",
  });

  console.log(`[Telegram] PO ${poId} → ${status} at ${decidedAt}`);
}

// ── Long-polling loop (works on localhost, no webhook/public URL needed) ────────

let pollerOffset = 0;
let pollerRunning = false;

export function startTelegramPoller(): void {
  if (!BOT_TOKEN) {
    console.warn("[Telegram] BOT_TOKEN not set — poller disabled.");
    return;
  }
  if (pollerRunning) return;
  pollerRunning = true;
  console.log("[Telegram] Long-poll poller started.");

  void (async () => {
    while (pollerRunning) {
      try {
        const updates = (await telegramPost("getUpdates", {
          offset: pollerOffset,
          timeout: 20,
          allowed_updates: ["message", "callback_query"],
        })) as TelegramUpdate[];

        for (const update of updates) {
          pollerOffset = update.update_id + 1;
          await processUpdate(update).catch((err) =>
            console.error("[Telegram] Update error:", err)
          );
        }
      } catch (err) {
        console.error("[Telegram] getUpdates error:", err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
}

// ── Webhook alternative (for production with a public URL) ─────────────────────

export async function handleTelegramCallback(body: unknown): Promise<void> {
  await processUpdate(body as TelegramUpdate);
}

// ── PO sending ─────────────────────────────────────────────────────────────────

export interface POItem {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

/**
 * Send a PO draft to the owner linked to the given farmId.
 * Throws if no owner has linked their Telegram for this farm yet.
 */
export async function sendPOToTelegram(
  poId: string,
  items: POItem[],
  farmId: string
): Promise<{ poId: string }> {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const chatId = farmChatIdMap.get(farmId);
  if (!chatId) {
    throw new Error(
      `No Telegram owner linked for farm "${farmId}". The owner must link their Telegram first.`
    );
  }

  const now = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const total = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const lines = items
    .map((i) =>
      `  • ${i.name}: ${i.qty} ${i.unit} × RM${i.unitPrice.toFixed(2)} = RM${(i.qty * i.unitPrice).toFixed(2)}`
    )
    .join("\n");

  const text = [
    `🌾 *Farm Desk — Purchase Order Draft*`,
    ``,
    `*PO Reference:* \`${poId}\``,
    `*Farm ID:* \`${farmId}\``,
    `*Prepared:* ${now}`,
    ``,
    `*Items Required:*`,
    lines,
    ``,
    `*Estimated Total: RM ${total.toFixed(2)}*`,
    ``,
    `⚠️ _Draft only. No order is sent until you approve._`,
    `Please review and tap a button below:`,
  ].join("\n");

  const result = (await telegramPost("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve PO", callback_data: `po_approve:${poId}` },
          { text: "❌ Reject PO",  callback_data: `po_reject:${poId}`  },
        ],
      ],
    },
  })) as { message_id: number };

  poStore.set(poId, { poId, status: "pending", messageId: result.message_id });
  console.log(`[Telegram] PO ${poId} → farm "${farmId}" owner (chat_id ${chatId})`);
  return { poId };
}

export function getPOStatus(poId: string): PORecord | null {
  return poStore.get(poId) ?? null;
}
