/* Lưu trữ cục bộ: dữ liệu không được gửi lên máy chủ. */
(() => {
  "use strict";
  const KEY = "studyReminder.data.v1";
  const DEFAULT_SUBJECTS = ["Toán","Ngữ văn","Tiếng Anh","Khoa học tự nhiên","Lịch sử và Địa lý","Tin học","Công nghệ","Giáo dục công dân","Giáo dục thể chất","Nghệ thuật","Hoạt động trải nghiệm"];
  const DEFAULT_SETTINGS = { notificationsEnabled:true, browserNotifications:false, soundEnabled:false, defaultReminderTime:"19:00", advanceMinutes:15, snoozeMinutes:15, remindCount:3, repeatMinutes:15 };
  const api = {
    defaults: { subjects: DEFAULT_SUBJECTS, settings: DEFAULT_SETTINGS },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { version:1, tasks:[], subjects:[...DEFAULT_SUBJECTS], settings:{...DEFAULT_SETTINGS}, sentReminders:{}, completedLog:{} };
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") throw new Error("Dữ liệu không hợp lệ");
        const clean = {
          version:1,
          tasks:Array.isArray(data.tasks) ? data.tasks.filter(t => t && typeof t.id === "string" && typeof t.title === "string" && typeof t.dueDate === "string").map(t => ({
            id:t.id, subject:String(t.subject || "Khác"), title:t.title.slice(0,240), dueDate:t.dueDate,
            dueTime:/^\d{2}:\d{2}$/.test(t.dueTime || "") ? t.dueTime : "23:59",
            priority:[1,2,3,4].includes(Number(t.priority)) ? Number(t.priority) : 2,
            notes:String(t.notes || ""), reminderTime:/^\d{2}:\d{2}$/.test(t.reminderTime || "") ? t.reminderTime : "19:00",
            advanceMinutes:Math.max(0, Number(t.advanceMinutes) || 0), reminderEnabled:t.reminderEnabled !== false,
            startAt:String(t.startAt || ""), duration:t.duration ? Number(t.duration) : 0,
            createdAt:Number(t.createdAt) || Date.now(), completedAt:t.completedAt ? Number(t.completedAt) : null,
            snoozeUntil:Number(t.snoozeUntil) || 0, lastReminderKey:String(t.lastReminderKey || "")
          })) : [],
          subjects:Array.isArray(data.subjects) ? [...new Set(data.subjects.filter(s => typeof s === "string" && s.trim()).map(s => s.trim().slice(0,40)))].slice(0,100) : [...DEFAULT_SUBJECTS],
          settings:{...DEFAULT_SETTINGS, ...(data.settings && typeof data.settings === "object" ? data.settings : {})},
          sentReminders:data.sentReminders && typeof data.sentReminders === "object" ? data.sentReminders : {},
          completedLog:data.completedLog && typeof data.completedLog === "object" ? data.completedLog : {}
        };
        if (!clean.subjects.length) clean.subjects = [...DEFAULT_SUBJECTS];
        return clean;
      } catch (error) {
        console.error("Không đọc được dữ liệu STUDY REMINDER:", error);
        return { version:1, tasks:[], subjects:[...DEFAULT_SUBJECTS], settings:{...DEFAULT_SETTINGS}, sentReminders:{}, completedLog:{}, recoveredFromError:true };
      }
    },
    save(data) {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error("Không lưu được dữ liệu:", error);
        return false;
      }
    },
    export(data) { return JSON.stringify({ app:"STUDY REMINDER", exportedAt:new Date().toISOString(), ...data }, null, 2); },
    import(text) {
      const obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.tasks) || !Array.isArray(obj.subjects) || typeof obj.settings !== "object") throw new Error("Tệp không đúng định dạng bản sao lưu STUDY REMINDER.");
      const tasks = obj.tasks.filter(t => t && typeof t.id === "string" && typeof t.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate || "")).map(t => ({
        id:t.id, subject:String(t.subject || "Khác"), title:t.title.slice(0,240), dueDate:t.dueDate, dueTime:/^\d{2}:\d{2}$/.test(t.dueTime || "")?t.dueTime:"23:59",
        priority:[1,2,3,4].includes(Number(t.priority))?Number(t.priority):2, notes:String(t.notes||""), reminderTime:/^\d{2}:\d{2}$/.test(t.reminderTime||"")?t.reminderTime:"19:00",
        advanceMinutes:Math.max(0,Number(t.advanceMinutes)||0), reminderEnabled:t.reminderEnabled!==false, startAt:String(t.startAt||""), duration:Number(t.duration)||0,
        createdAt:Number(t.createdAt)||Date.now(), completedAt:t.completedAt?Number(t.completedAt):null, snoozeUntil:Number(t.snoozeUntil)||0,lastReminderKey:String(t.lastReminderKey||"")
      }));
      return {version:1,tasks,subjects:[...new Set(obj.subjects.filter(s=>typeof s==="string"&&s.trim()).map(s=>s.trim().slice(0,40)))],settings:{...DEFAULT_SETTINGS,...obj.settings},sentReminders:obj.sentReminders&&typeof obj.sentReminders==="object"?obj.sentReminders:{},completedLog:obj.completedLog&&typeof obj.completedLog==="object"?obj.completedLog:{}};
    }
  };
  window.StudyStorage = api;
})();