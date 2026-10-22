/* Nhắc nhở trong lúc trang đang mở. Không giả lập thông báo nền khi trang đã đóng. */
(() => {
  "use strict";
  let app = null;
  let timer = null;
  const notifiedThisSession = new Set();
  const fmtDate = date => new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeZone:"Asia/Ho_Chi_Minh"}).format(date);
  function dueDate(task) { return new Date(`${task.dueDate}T${task.dueTime || "23:59"}:00+07:00`); }
  function reminderDate(task, settings) {
    if (task.snoozeUntil && task.snoozeUntil > Date.now()) return new Date(task.snoozeUntil);
    const due = dueDate(task);
    const advance = Number(task.advanceMinutes ?? settings.advanceMinutes ?? 15);
    if (advance > 0) return new Date(due.getTime() - advance * 60000);
    const [h,m] = (task.reminderTime || settings.defaultReminderTime || "19:00").split(":").map(Number);
    const reminder = new Date(`${task.dueDate}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00+07:00`);
    return reminder;
  }
  function start(api) {
    app = api;
    if (timer) clearInterval(timer);
    timer = setInterval(check, 15000);
    check();
  }
  function check() {
    if (!app) return;
    const data = app.getData();
    if (!data.settings.notificationsEnabled) return;
    const now = Date.now();
    for (const task of data.tasks) {
      if (task.completedAt || !task.reminderEnabled) continue;
      const remindAt = reminderDate(task, data.settings).getTime();
      const due = dueDate(task).getTime();
      if (now < remindAt || now > due + 24*60*60*1000) continue;
      const key = task.id + ":" + (task.snoozeUntil || remindAt);
      if (notifiedThisSession.has(key) || task.lastReminderKey === key) continue;
      notifiedThisSession.add(key);
      task.lastReminderKey = key;
      app.saveData();
      app.showReminder(task);
      if (data.settings.browserNotifications && "Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification("STUDY REMINDER · " + task.subject, { body:task.title + " — Hạn: " + fmtDate(dueDate(task)), tag:"study-reminder-" + task.id });
          n.onclick = () => { window.focus(); app.openTask(task.id); n.close(); };
        } catch (e) { console.warn("Không thể hiện thông báo trình duyệt",e); }
      }
      if (data.settings.soundEnabled) playSound();
    }
  }
  function playSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 740;
      gain.gain.setValueAtTime(.0001,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.24);
      osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.25);
      osc.onended = () => ctx.close();
    } catch (e) { /* Âm thanh có thể bị chặn trước tương tác người dùng. */ }
  }
  function requestPermission() {
    if (!("Notification" in window)) return Promise.resolve("unsupported");
    return Notification.requestPermission();
  }
  window.StudyNotifications = {start,check,playSound,requestPermission};
})();