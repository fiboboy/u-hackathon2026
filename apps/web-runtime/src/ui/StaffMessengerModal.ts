import { mcpConsole } from "./McpConsole.js";
import { soundManager } from "../services/SoundManager.js";

export type MessengerChannel = "telegram" | "line" | "whatsapp";

export interface StaffRecipient {
  id: string;
  name: string;
  role: string;
  avatar: string;
  telegramUsername: string;
  telegramChatId: string;
  lineId: string;
  lineUserId: string;
  whatsappNumber: string;
  status: string;
  staminaPct: number;
  replies: {
    break: string;
    room: string;
    rush: string;
    reception: string;
    praise: string;
    default: string;
  };
}

export interface DispatchEvent {
  staffId: string;
  staffName: string;
  channel: MessengerChannel;
  text: string;
  replyText: string;
  isBreakPrompt: boolean;
}

export class StaffMessengerModal {
  private modalEl!: HTMLElement;
  private recipientListEl!: HTMLElement;
  private channelTabs!: HTMLButtonElement[];
  private presetChips!: HTMLButtonElement[];
  private messageInput!: HTMLTextAreaElement;
  private charCountEl!: HTMLElement;
  private endpointInfoEl!: HTMLElement;
  private sendBtn!: HTMLButtonElement;
  private historyListEl!: HTMLElement;
  private closeBtn!: HTMLElement;

  private selectedStaffId = "master_somchai";
  private selectedChannel: MessengerChannel = "telegram";
  private isSending = false;

  public static readonly STAFF_ROSTER: Record<string, StaffRecipient> = {
    master_somchai: {
      id: "master_somchai",
      name: "Somchai Prasert",
      role: "Lead Thai Massage Master",
      avatar: "/assets/avatars/avatar_somchai.png",
      telegramUsername: "@somchai_nuad",
      telegramChatId: "tg_71049281",
      lineId: "somchai.nuad",
      lineUserId: "U4829fa018c12a",
      whatsappNumber: "+66 81 234 5678",
      status: "ACTIVE ON SHIFT",
      staminaPct: 45,
      replies: {
        break: "รับทราบครับ กำลังไปนั่งพักที่โต๊ะน้ำชาครับ 🍵 (Acknowledged, heading to tea table)",
        room: "เตรียมตัวพร้อมแล้วครับ กำลังเข้าห้อง 1 ครับ 🏮 (Ready, heading to Room #1)",
        rush: "รับทราบครับ จะเร่งมือให้ตรงเวลาครับ ⏱️ (Understood, pacing up to stay on schedule)",
        reception: "กำลังเดินไปที่เคาน์เตอร์ต้อนรับครับ 📋 (Walking to reception counter now)",
        praise: "ขอบคุณมากครับ จะรักษามาตรฐานไว้ครับ ✨ (Thank you so much, will keep it up!)",
        default: "รับทราบครับคุณผู้จัดการ 👍 (Understood, Khun Manager!)"
      }
    },
    master_ken: {
      id: "master_ken",
      name: "Kenichi Morimoto",
      role: "Senior Shiatsu Specialist",
      avatar: "/assets/avatars/avatar_ken.png",
      telegramUsername: "@ken_morimoto",
      telegramChatId: "tg_77192044",
      lineId: "ken.shiatsu",
      lineUserId: "U7391bc4428e91",
      whatsappNumber: "+66 82 345 6789",
      status: "STANDBY READY",
      staminaPct: 92,
      replies: {
        break: "了解しました。お茶を飲んで少し休みます 🍵 (Understood, taking a quick tea break)",
        room: "承知いたしました。指圧の施術準備完了しています 🏮 (Understood, shiatsu bed prepared)",
        rush: "了解です、ペースを調整して間に合わせます ⏱️ (Roger that, adjusting rhythm)",
        reception: "すぐ受付に向かいます 📋 (Heading to reception desk immediately)",
        praise: "高評価ありがとうございます！光栄です ✨ (Thank you for the 5-star feedback!)",
        default: "了解です！すぐに対応します 👍 (Roger that, attending immediately)"
      }
    },
    master_yuki: {
      id: "master_yuki",
      name: "Yuki Ishikawa",
      role: "Master Aromatherapist",
      avatar: "/assets/avatars/avatar_yuki.png",
      telegramUsername: "@yuki_aroma",
      telegramChatId: "tg_66281033",
      lineId: "yuki.cypress",
      lineUserId: "U10499ee148102",
      whatsappNumber: "+66 83 456 7890",
      status: "IN TREATMENT",
      staminaPct: 68,
      replies: {
        break: "ありがとうございます！ハーブティーで一息入れます 🍵 (Thank you! Having herbal tea now)",
        room: "アロマオイルの準備をして向かいます 🏮 (Preparing cypress essential oils now)",
        rush: "はい、スムーズに施術をまとめます ⏱️ (Yes, wrapping up smoothly on time)",
        reception: "はい、すぐ受付に伺います 📋 (Yes, coming to reception right away)",
        praise: "お客様に喜んでいただけて何よりです ✨ (Delighted that the guest enjoyed the session!)",
        default: "はい、承知いたしました ✨ (Yes, confirmed!)"
      }
    },
    staff_receptionist: {
      id: "staff_receptionist",
      name: "Mei Lin",
      role: "Concierge & Cashier Hostess",
      avatar: "/assets/avatars/avatar_receptionist.png",
      telegramUsername: "@meilin_reception",
      telegramChatId: "tg_99014119",
      lineId: "meilin.concierge",
      lineUserId: "U847201aa99482",
      whatsappNumber: "+66 84 567 8901",
      status: "FRONT DESK",
      staminaPct: 98,
      replies: {
        break: "好的！我让副手顶班10分钟去泡茶 🍵 (Got it! Deputy covering front for 10m)",
        room: "已同步更新房态至CRM系统 🏮 (Updated room availability in CRM)",
        rush: "已提前通知等待区客人，一切有序 ⏱️ (Guest notified in lounge, all orderly)",
        reception: "我在前台，已准备好对账单 📋 (At front desk, ledger ready)",
        praise: "太棒了！已在系统记录客户忠诚积分 ✨ (Awesome! Recorded loyalty bonus)",
        default: "收到！前台已做好接待安排 📋 (Got it! Front desk is all set)"
      }
    }
  };

  public onMessageDispatched?: (event: DispatchEvent) => void;

  constructor() {
    this.initElements();
  }

  private initElements() {
    this.modalEl = document.getElementById("staff-messenger-modal") as HTMLElement;
    this.recipientListEl = document.getElementById("msg-recipients-list") as HTMLElement;
    this.messageInput = document.getElementById("msg-input-text") as HTMLTextAreaElement;
    this.charCountEl = document.getElementById("msg-char-counter") as HTMLElement;
    this.endpointInfoEl = document.getElementById("msg-endpoint-info") as HTMLElement;
    this.sendBtn = document.getElementById("btn-msg-send") as HTMLButtonElement;
    this.historyListEl = document.getElementById("msg-history-log") as HTMLElement;
    this.closeBtn = document.getElementById("msg-modal-close") as HTMLElement;

    this.closeBtn?.addEventListener("click", () => this.close());
    this.modalEl?.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Channel tabs
    this.channelTabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".msg-channel-tab"));
    this.channelTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        this.channelTabs.forEach(t => t.classList.remove("active-channel"));
        tab.classList.add("active-channel");
        this.selectedChannel = (tab.dataset.channel || "telegram") as MessengerChannel;
        soundManager.playAction("tap");
        this.updateRecipientUI();
      });
    });

    // Preset quick chips
    this.presetChips = Array.from(document.querySelectorAll<HTMLButtonElement>(".msg-preset-chip"));
    this.presetChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.text || chip.textContent || "";
        if (this.messageInput) {
          this.messageInput.value = text;
          this.updateCharCounter();
          soundManager.playAction("tap");
        }
      });
    });

    // Message input listener
    this.messageInput?.addEventListener("input", () => {
      this.updateCharCounter();
    });

    // Send button
    this.sendBtn?.addEventListener("click", () => {
      this.dispatchCurrentMessage();
    });

    // Render staff roster buttons
    this.renderRosterSelection();
    this.updateRecipientUI();
  }

  private renderRosterSelection() {
    if (!this.recipientListEl) return;
    this.recipientListEl.innerHTML = "";

    Object.values(StaffMessengerModal.STAFF_ROSTER).forEach(staff => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `msg-staff-pill ${staff.id === this.selectedStaffId ? "active-staff" : ""}`;
      card.dataset.staffId = staff.id;

      card.innerHTML = `
        <div class="msg-staff-avatar-box">
          <img src="${staff.avatar}" class="msg-staff-avatar" alt="${staff.name}" />
        </div>
        <div class="msg-staff-meta">
          <div class="msg-staff-name">${staff.name.split(" ")[0]}</div>
          <div class="msg-staff-sub">${staff.role.split(" ")[0]}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        this.selectedStaffId = staff.id;
        document.querySelectorAll(".msg-staff-pill").forEach(p => p.classList.remove("active-staff"));
        card.classList.add("active-staff");
        soundManager.playAction("tap");
        this.updateRecipientUI();
      });

      this.recipientListEl.appendChild(card);
    });
  }

  private updateCharCounter() {
    if (!this.charCountEl || !this.messageInput) return;
    const len = this.messageInput.value.length;
    this.charCountEl.textContent = `${len}/280 chars`;
  }

  private updateRecipientUI() {
    const staff = StaffMessengerModal.STAFF_ROSTER[this.selectedStaffId];
    if (!staff) return;

    // Update endpoint banner
    if (this.endpointInfoEl) {
      if (this.selectedChannel === "telegram") {
        this.endpointInfoEl.innerHTML = `
          <div class="msg-endpoint-row tg-theme">
            <span class="msg-ep-badge">[Telegram Bot API]</span>
            <span class="msg-ep-user">Recipient: <strong>${staff.telegramUsername}</strong> (${staff.telegramChatId})</span>
            <span class="msg-ep-url">POST https://api.telegram.org/bot&lt;token&gt;/sendMessage</span>
          </div>
        `;
      } else if (this.selectedChannel === "line") {
        this.endpointInfoEl.innerHTML = `
          <div class="msg-endpoint-row line-theme">
            <span class="msg-ep-badge">[LINE Messaging Push API]</span>
            <span class="msg-ep-user">Recipient: <strong>@${staff.lineId}</strong> (${staff.lineUserId})</span>
            <span class="msg-ep-url">POST https://api.line.me/v2/bot/message/push [Bearer OA]</span>
          </div>
        `;
      } else {
        this.endpointInfoEl.innerHTML = `
          <div class="msg-endpoint-row wa-theme">
            <span class="msg-ep-badge">[WhatsApp Business Cloud API]</span>
            <span class="msg-ep-user">Recipient: <strong>${staff.whatsappNumber}</strong></span>
            <span class="msg-ep-url">POST https://graph.facebook.com/v21.0/{phone_id}/messages</span>
          </div>
        `;
      }
    }
  }

  public open(staffId?: string, presetText?: string) {
    if (staffId && StaffMessengerModal.STAFF_ROSTER[staffId]) {
      this.selectedStaffId = staffId;
      document.querySelectorAll(".msg-staff-pill").forEach(p => {
        p.classList.toggle("active-staff", (p as HTMLElement).dataset.staffId === staffId);
      });
    }

    if (presetText && this.messageInput) {
      this.messageInput.value = presetText;
      this.updateCharCounter();
    } else if (this.messageInput && !this.messageInput.value) {
      this.messageInput.value = "🍵 Подойди в Чайную зону для отдыха и восстановления выносливости (перерыв на 15 мин).";
      this.updateCharCounter();
    }

    this.updateRecipientUI();
    this.modalEl?.classList.add("visible");
  }

  public close() {
    this.modalEl?.classList.remove("visible");
  }

  public async dispatchCurrentMessage() {
    if (this.isSending) return;
    const text = (this.messageInput?.value || "").trim();
    if (!text) {
      soundManager.playAction("tap");
      return;
    }

    const staff = StaffMessengerModal.STAFF_ROSTER[this.selectedStaffId];
    if (!staff) return;

    this.isSending = true;
    if (this.sendBtn) {
      this.sendBtn.disabled = true;
      this.sendBtn.textContent = "[...] Dispatching API...";
    }

    // Resolve which reply makes sense
    let replyText = staff.replies.default;
    const isBreak = text.includes("перерыв") || text.includes("Чайную") || text.includes("tea") || text.includes("отдых");
    if (isBreak) {
      replyText = staff.replies.break;
    } else if (text.includes("Кабинет") || text.includes("комнат") || text.includes("Room")) {
      replyText = staff.replies.room;
    } else if (text.includes("Ускорься") || text.includes("темп") || text.includes("быстр")) {
      replyText = staff.replies.rush;
    } else if (text.includes("ресепшн") || text.includes("касс") || text.includes("front")) {
      replyText = staff.replies.reception;
    } else if (text.includes("5★") || text.includes("Отличная") || text.includes("молодец")) {
      replyText = staff.replies.praise;
    }

    // 1. Play outbound chime
    soundManager.playMessageSent();

    // 2. Log to McpConsole
    const channelTag = this.selectedChannel === "telegram" ? "TG" : this.selectedChannel === "line" ? "LINE" : "WA";
    mcpConsole.logMcpIn("send_staff_notification", {
      staff_id: staff.id,
      staff_name: staff.name,
      channel: this.selectedChannel,
      destination: this.selectedChannel === "telegram" ? staff.telegramUsername : this.selectedChannel === "line" ? staff.lineId : staff.whatsappNumber,
      message: text
    });

    // 3. Append to dialog conversation history
    this.appendHistoryItem("manager", staff.name, this.selectedChannel, text);

    // 4. Trigger scene callbacks (speech bubble over character, diorama animation)
    this.onMessageDispatched?.({
      staffId: staff.id,
      staffName: staff.name,
      channel: this.selectedChannel,
      text,
      replyText,
      isBreakPrompt: isBreak
    });

    // 5. Simulate async API delivery
    await new Promise(r => setTimeout(r, 650));

    if (this.sendBtn) {
      this.sendBtn.disabled = false;
      this.sendBtn.textContent = "[>] Send Ping";
    }
    this.isSending = false;

    // 6. Simulate employee reaction / reply 2.4 seconds later
    setTimeout(() => {
      soundManager.playMessageReply();
      this.appendHistoryItem("staff", staff.name, this.selectedChannel, replyText);
      mcpConsole.logMcpOut("send_staff_notification", {
        status: "DELIVERED_AND_ACKNOWLEDGED",
        staff_id: staff.id,
        reply: replyText
      });
    }, 2400);
  }

  private appendHistoryItem(sender: "manager" | "staff", staffName: string, channel: MessengerChannel, text: string) {
    if (!this.historyListEl) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    const item = document.createElement("div");
    item.className = `msg-history-bubble ${sender === "manager" ? "manager-outbound" : "staff-inbound"}`;

    const channelBadge = channel === "telegram" ? "TG" : channel === "line" ? "LINE" : "WA";
    const channelClass = channel === "telegram" ? "badge-tg" : channel === "line" ? "badge-line" : "badge-wa";

    if (sender === "manager") {
      item.innerHTML = `
        <div class="msg-bubble-meta">
          <span class="msg-chan-badge ${channelClass}">[${channelBadge} OUT]</span>
          <span class="msg-time">${timeStr}</span>
          <span class="msg-status-tick">[✓ 200 OK]</span>
        </div>
        <div class="msg-bubble-text">${text}</div>
      `;
    } else {
      item.innerHTML = `
        <div class="msg-bubble-meta">
          <span class="msg-chan-badge badge-staff">[${staffName.split(" ")[0]} via ${channelBadge}]</span>
          <span class="msg-time">${timeStr}</span>
          <span class="msg-status-tick" style="color: var(--warning);">[REPLY]</span>
        </div>
        <div class="msg-bubble-text reply-text">${text}</div>
      `;
    }

    this.historyListEl.appendChild(item);
    this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
  }
}
