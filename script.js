(function () {
  var ACTIVE_ACCOUNT_KEY = "mobile_expense_active_account_v31";
  var SWIPE_REVEAL_PX = 38;

  var MARIBANK_TIER_LIMIT = 1000000;
  var MARIBANK_BASE_RATE = 0.0325;
  var MARIBANK_EXCESS_RATE = 0.0375;
  var MARIBANK_DAYS_IN_YEAR = 365;
  var MARIBANK_TAX_RATE = 0.20;

  var SUPABASE_URL = "https://ajyhxlvqjkgovcrfsnig.supabase.co";
  var SUPABASE_KEY = "sb_publishable_wa_eoq6Z21iTyijZgWALkg_6DXwPCWw";
  var sbClient = (window.supabase && typeof window.supabase.createClient === "function")
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  if (!sbClient) {
    console.warn("Supabase client not initialized. Check that @supabase/supabase-js is loaded in index.html before script.js.");
  }

  var isSyncingFromCloud = false;
  var isFlushingPendingSync = false;

  var DEVICES = {
    "galaxy-a56": { width: "480px", height: "924px" },
    "redmi-note-13-pro": { width: "508px", height: "1023px" },
    "iphone-11-pro": { width: "375px", height: "812px" }
  };

  var ACCOUNTS = ["Doom", "Ellie"];
  var PERIODS = ["week", "semi", "month", "year"];
  var EXPENSE_CATEGORIES = ["Shoppings", "Food", "Utilities", "Transport", "Housing", "Loan", "Others"];
  var INCOME_CATEGORIES = ["PBCOM", "Maribank", "Maya", "Extra", "Cash", "Others"];
  var FILTER_CYCLE = ["expense", "income", "all"];
  var RECURRENCE_CYCLE = ["once", "months", "lifetime"];

  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  var ORDINAL_NAMES = [
    "1st", "2nd", "3rd", "4th", "5th", "6th"
  ];

  var DEFAULT_PERIOD_SETTINGS = {
    weekStart: 0,
    weekEnd: 6,
    semiStart: 1,
    semiEnd: 15,
    monthStart: 1,
    monthEnd: 31,
    yearStart: 0,
    yearEnd: 11
  };

  var nowInit = new Date();
  var activeAccount = loadActiveAccount();
  var prefs = loadAccountPreferences(activeAccount);
  var activeDevice = prefs.device;
  var darkMode = prefs.darkMode;
  var activePeriod = prefs.activePeriod;
  var lastCategoryExpense = prefs.lastCategoryExpense;
  var lastCategoryIncome = prefs.lastCategoryIncome;
  var periodSettings = prefs.periodSettings;
  var transactions = loadTransactions(activeAccount);

  var navYear = nowInit.getFullYear();
  var navMonth = nowInit.getMonth();
  var navHalf = getInitialHalfIndex(nowInit, periodSettings);
  var navWeekIndex = getCalendarWeekIndexInMonth(nowInit);

  var txFilterType = "all";
  var activeTab = "dashboard";
  var editingTxId = null;
  var openSwipeCard = null;
  var openSwipeDir = 0;

  function normalizeAccount(acct) {
    return acct === "Ellie" ? "Ellie" : "Doom";
  }

  function acctPrefix(acct) {
    return normalizeAccount(acct).toLowerCase();
  }

  function getAccountPrefsKey(acct) {
    return "mobile_expense_prefs_" + acctPrefix(acct) + "_v31";
  }

  function getAccountStorageKey(acct) {
    return "mobile_expense_tracker_acct_" + acctPrefix(acct) + "_v31";
  }

  function getMaribankInterestStateKey(acct) {
    return "mobile_expense_maribank_interest_" + acctPrefix(acct) + "_v31";
  }

  function getPendingSyncKey(acct) {
    return "mobile_expense_pending_sync_" + acctPrefix(acct) + "_v31";
  }

  function getPendingLogsKey(acct) {
    return "mobile_expense_pending_logs_" + acctPrefix(acct) + "_v31";
  }

  function loadPendingSyncFlags(acct) {
    try {
      var raw = JSON.parse(localStorage.getItem(getPendingSyncKey(acct)) || "{}");
      return {
        txDirty: Boolean(raw.txDirty),
        profileDirty: Boolean(raw.profileDirty),
        updatedAt: Number(raw.updatedAt) || 0
      };
    } catch (e) {
      return { txDirty: false, profileDirty: false, updatedAt: 0 };
    }
  }

  function setPendingSyncFlags(acct, patch) {
    var cur = loadPendingSyncFlags(acct);
    var next = {
      txDirty: patch && typeof patch.txDirty === "boolean" ? patch.txDirty : cur.txDirty,
      profileDirty: patch && typeof patch.profileDirty === "boolean" ? patch.profileDirty : cur.profileDirty,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(getPendingSyncKey(acct), JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function loadPendingLogs(acct) {
    try {
      var raw = JSON.parse(localStorage.getItem(getPendingLogsKey(acct)) || "{}");
      return {
        history: Array.isArray(raw.history) ? raw.history : [],
        edits: Array.isArray(raw.edits) ? raw.edits : [],
        deletes: Array.isArray(raw.deletes) ? raw.deletes : []
      };
    } catch (e) {
      return { history: [], edits: [], deletes: [] };
    }
  }

  function savePendingLogs(acct, logsObj) {
    try {
      localStorage.setItem(getPendingLogsKey(acct), JSON.stringify({
        history: Array.isArray(logsObj.history) ? logsObj.history : [],
        edits: Array.isArray(logsObj.edits) ? logsObj.edits : [],
        deletes: Array.isArray(logsObj.deletes) ? logsObj.deletes : []
      }));
    } catch (e) {}
  }

  function queueLogEntry(acct, bucket, entry) {
    var logs = loadPendingLogs(acct);
    logs[bucket].push(entry);
    savePendingLogs(acct, logs);
  }

  function getAccountTableNames(acct) {
    var p = acctPrefix(acct);
    return {
      expenses: p + "_expenses",
      transfers: p + "_transfers",
      income: p + "_income",
      history: p + "_history",
      edit: p + "_edit",
      del: p + "_delete",
      profile: p + "_profile"
    };
  }

  function loadActiveAccount() {
    try {
      var saved = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      return ACCOUNTS.indexOf(saved) !== -1 ? saved : "Doom";
    } catch (e) {
      return "Doom";
    }
  }

  function saveActiveAccount(acct) {
    try { localStorage.setItem(ACTIVE_ACCOUNT_KEY, normalizeAccount(acct)); } catch (e) {}
  }

  function clampDayNumber(val, fallback) {
    var n = parseInt(val, 10);
    if (isNaN(n)) return fallback;
    return Math.max(1, Math.min(31, n));
  }

  function clampMonthIndex(val, fallback) {
    var n = parseInt(val, 10);
    if (isNaN(n) || n < 0 || n > 11) return fallback;
    return n;
  }

  function sanitizePeriodSettings(raw) {
    var src = raw && typeof raw === "object" ? raw : {};
    var wStart = parseInt(src.weekStart, 10);
    if (isNaN(wStart) || wStart < 0 || wStart > 6) wStart = DEFAULT_PERIOD_SETTINGS.weekStart;
    var wEnd = (wStart + 6) % 7;

    var yStart = clampMonthIndex(src.yearStart, DEFAULT_PERIOD_SETTINGS.yearStart);
    var yEnd = (yStart + 11) % 12;

    return {
      weekStart: wStart,
      weekEnd: wEnd,
      semiStart: clampDayNumber(src.semiStart, DEFAULT_PERIOD_SETTINGS.semiStart),
      semiEnd: clampDayNumber(src.semiEnd, DEFAULT_PERIOD_SETTINGS.semiEnd),
      monthStart: clampDayNumber(src.monthStart, DEFAULT_PERIOD_SETTINGS.monthStart),
      monthEnd: clampDayNumber(src.monthEnd, DEFAULT_PERIOD_SETTINGS.monthEnd),
      yearStart: yStart,
      yearEnd: yEnd
    };
  }

  function sanitizeCategory(cat, list) {
    return typeof cat === "string" && list.indexOf(cat) !== -1 ? cat : list[0];
  }

  function sanitizeRecurrenceMode(mode) {
    return RECURRENCE_CYCLE.indexOf(mode) !== -1 ? mode : "once";
  }

  function formatRecurrenceLabel(mode) {
    var m = sanitizeRecurrenceMode(mode);
    if (m === "months") return "Months";
    if (m === "lifetime") return "Lifetime";
    return "Once";
  }

  function getDefaultRecurrenceValue(mode) {
    var m = sanitizeRecurrenceMode(mode);
    if (m === "once") return "1";
    if (m === "lifetime") return "-";
    return "";
  }

  function syncRecurrenceVisibilityForType(typeVal) {
    var isExpense = typeVal === "expense";
    var btn = document.getElementById("recurrence-switch-btn");
    var valInp = document.getElementById("recurrence-value");

    if (btn) {
      btn.hidden = !isExpense;
      btn.style.display = isExpense ? "inline-flex" : "none";
    }
    if (valInp) {
      valInp.hidden = !isExpense;
      valInp.style.display = isExpense ? "inline-flex" : "none";
    }

    if (!isExpense) {
      applyRecurrenceUI("once", "1", true);
    }
  }

  function applyRecurrenceUI(mode, customValue, resetOnModeChange) {
    var m = sanitizeRecurrenceMode(mode);
    var btn = document.getElementById("recurrence-switch-btn");
    var hid = document.getElementById("recurrence-mode");
    var valInp = document.getElementById("recurrence-value");

    if (hid) hid.value = m;
    if (btn) {
      btn.textContent = formatRecurrenceLabel(m);
      btn.className = "type-switch-btn mode-" + m;
    }

    if (valInp) {
      if (m === "once") {
        valInp.value = "1";
        valInp.readOnly = true;
        valInp.disabled = true;
        valInp.placeholder = "";
      } else if (m === "lifetime") {
        valInp.value = "-";
        valInp.readOnly = true;
        valInp.disabled = true;
        valInp.placeholder = "";
      } else {
        valInp.disabled = false;
        valInp.readOnly = false;
        valInp.placeholder = "";
        if (resetOnModeChange) {
          valInp.value = "";
        } else if (typeof customValue === "string") {
          valInp.value = customValue === " - " ? "-" : customValue;
        }
      }
    }
  }

  function loadAccountPreferences(acct) {
    var fallbackDevice = "galaxy-a56";
    var fallbackDark = false;
    var fallbackPeriod = "month";
    var fallbackExpCat = EXPENSE_CATEGORIES[0];
    var fallbackIncCat = INCOME_CATEGORIES[0];
    var fallbackSettings = sanitizePeriodSettings(DEFAULT_PERIOD_SETTINGS);

    try {
      var raw = JSON.parse(localStorage.getItem(getAccountPrefsKey(acct)) || "{}");
      var dev = DEVICES[raw.device] ? raw.device : fallbackDevice;
      var dark = Boolean(raw.darkMode);
      var per = PERIODS.indexOf(raw.activePeriod) !== -1 ? raw.activePeriod : fallbackPeriod;
      var expCat = sanitizeCategory(raw.lastCategoryExpense, EXPENSE_CATEGORIES);
      var incCat = sanitizeCategory(raw.lastCategoryIncome, INCOME_CATEGORIES);
      var settings = sanitizePeriodSettings(raw.periodSettings);
      return {
        device: dev,
        darkMode: dark,
        activePeriod: per,
        lastCategoryExpense: expCat,
        lastCategoryIncome: incCat,
        periodSettings: settings
      };
    } catch (e) {
      return {
        device: fallbackDevice,
        darkMode: fallbackDark,
        activePeriod: fallbackPeriod,
        lastCategoryExpense: fallbackExpCat,
        lastCategoryIncome: fallbackIncCat,
        periodSettings: fallbackSettings
      };
    }
  }

  function saveAccountPreferences() {
    try {
      localStorage.setItem(getAccountPrefsKey(activeAccount), JSON.stringify({
        device: activeDevice,
        darkMode: darkMode,
        activePeriod: activePeriod,
        lastCategoryExpense: lastCategoryExpense,
        lastCategoryIncome: lastCategoryIncome,
        periodSettings: periodSettings
      }));
    } catch (e) {}
    if (!isSyncingFromCloud) {
      setPendingSyncFlags(activeAccount, { profileDirty: true });
    }
    syncProfileToSupabase(activeAccount);
  }

  function loadTransactions(acct) {
    try {
      var parsed = JSON.parse(localStorage.getItem(getAccountStorageKey(acct)) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveTransactions() {
    try { localStorage.setItem(getAccountStorageKey(activeAccount), JSON.stringify(transactions)); } catch (e) {}
    if (!isSyncingFromCloud) {
      setPendingSyncFlags(activeAccount, { txDirty: true });
    }
    syncTransactionsToSupabase(activeAccount, transactions);
  }

  function formatTxSummary(tx) {
    if (!tx) return "";
    if (tx.type === "expense") {
      return "Expense: " + (tx.category || "") + " (" + (tx.source || "") + ") - " + formatMoney(tx.amount || 0);
    }
    if (tx.type === "transfer") {
      return "Transfer: " + (tx.category || "") + " -> " + (tx.destination || "") + " - " + formatMoney(tx.amount || 0);
    }
    return "Income: " + (tx.category || "Others") + (tx.remarks ? " (" + tx.remarks + ")" : "") + " - " + formatMoney(tx.amount || 0);
  }

  function logHistorySave(acct, tx) {
    if (isSyncingFromCloud || !tx) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var tables = getAccountTableNames(targetAcct);
    var entry = {
      id: "hist-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tx_type: String(tx.type || "unknown"),
      tx_id: String(tx.id || ""),
      summary: formatTxSummary(tx),
      data: tx,
      created_at: new Date().toISOString()
    };
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      queueLogEntry(targetAcct, "history", entry);
      return;
    }
    sbClient.from(tables.history).upsert(entry, { onConflict: "id" }).then(function (res) {
      if (res.error) {
        queueLogEntry(targetAcct, "history", entry);
        console.warn("Supabase history error (queued for sync):", res.error.message);
      }
    });
  }

  function logEditChange(acct, target, txId, changesObj) {
    if (isSyncingFromCloud) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var tables = getAccountTableNames(targetAcct);
    var entry = {
      id: "edit-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      target: String(target || "config"),
      tx_id: String(txId || ""),
      changes: changesObj || {},
      created_at: new Date().toISOString()
    };
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      queueLogEntry(targetAcct, "edits", entry);
      return;
    }
    sbClient.from(tables.edit).upsert(entry, { onConflict: "id" }).then(function (res) {
      if (res.error) {
        queueLogEntry(targetAcct, "edits", entry);
        console.warn("Supabase edit log error (queued for sync):", res.error.message);
      }
    });
  }

  function logDeletedItem(acct, txType, txId, deletedObj) {
    if (isSyncingFromCloud) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var tables = getAccountTableNames(targetAcct);
    var entry = {
      id: "del-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      tx_type: String(txType || "item"),
      tx_id: String(txId || ""),
      deleted_item: deletedObj || {},
      deleted_at: new Date().toISOString()
    };
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      queueLogEntry(targetAcct, "deletes", entry);
      return;
    }
    sbClient.from(tables.del).upsert(entry, { onConflict: "id" }).then(function (res) {
      if (res.error) {
        queueLogEntry(targetAcct, "deletes", entry);
        console.warn("Supabase delete log error (queued for sync):", res.error.message);
      }
    });
  }

  async function syncProfileToSupabase(acct) {
    if (isSyncingFromCloud) return true;
    var targetAcct = normalizeAccount(acct || activeAccount);
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      setPendingSyncFlags(targetAcct, { profileDirty: true });
      return false;
    }

    var tables = getAccountTableNames(targetAcct);
    var prefsObj = targetAcct === activeAccount ? {
      device: activeDevice,
      darkMode: darkMode,
      activePeriod: activePeriod,
      periodSettings: periodSettings
    } : loadAccountPreferences(targetAcct);

    var mbState = loadMaribankInterestState(targetAcct);

    var res = await sbClient.from(tables.profile).upsert({
      account: targetAcct,
      device: prefsObj.device,
      dark_mode: prefsObj.darkMode,
      active_period: prefsObj.activePeriod,
      week_start: prefsObj.periodSettings.weekStart,
      week_end: prefsObj.periodSettings.weekEnd,
      semi_start: prefsObj.periodSettings.semiStart,
      semi_end: prefsObj.periodSettings.semiEnd,
      month_start: prefsObj.periodSettings.monthStart,
      month_end: prefsObj.periodSettings.monthEnd,
      year_start: prefsObj.periodSettings.yearStart,
      year_end: prefsObj.periodSettings.yearEnd,
      maribank_interest: mbState,
      updated_at: new Date().toISOString()
    }, { onConflict: "account" });

    if (res.error) {
      setPendingSyncFlags(targetAcct, { profileDirty: true });
      console.warn("Supabase profile sync error (kept dirty for retry):", res.error.message);
      return false;
    }

    setPendingSyncFlags(targetAcct, { profileDirty: false });
    return true;
  }

  async function replaceTableRows(tableName, rows) {
    if (!sbClient) return false;
    var delRes = await sbClient.from(tableName).delete().neq("id", "");
    if (delRes.error) {
      console.warn("Supabase delete error (" + tableName + "):", delRes.error.message);
      return false;
    }
    if (!rows.length) return true;
    var upRes = await sbClient.from(tableName).upsert(rows, { onConflict: "id" });
    if (upRes.error) {
      console.warn("Supabase upsert error (" + tableName + "):", upRes.error.message);
      return false;
    }
    return true;
  }

  async function syncTransactionsToSupabase(acct, txList) {
    if (isSyncingFromCloud) return true;
    var targetAcct = normalizeAccount(acct || activeAccount);
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      setPendingSyncFlags(targetAcct, { txDirty: true });
      return false;
    }

    var list = Array.isArray(txList) ? txList : loadTransactions(targetAcct);
    var tables = getAccountTableNames(targetAcct);

    var expenseRows = [];
    var transferRows = [];
    var incomeRows = [];

    list.forEach(function (tx) {
      var amt = Number(tx.amount) || 0;
      var dtStr = String(tx.date || "");
      var catStr = String(tx.category || "");
      var remStr = String(tx.remarks || "");
      var srcStr = String(tx.source || "");
      var dstStr = String(tx.destination || "");

      if (tx.type === "expense") {
        var recMode = sanitizeRecurrenceMode(tx.recurrenceMode);
        var recVal = recMode === "months" ? String(tx.recurrenceValue || "") : getDefaultRecurrenceValue(recMode);
        expenseRows.push({
          id: tx.id,
          category: catStr,
          source: srcStr,
          amount: amt,
          due_date: dtStr,
          recurrence_mode: recMode,
          recurrence_value: recVal
        });
      } else if (tx.type === "transfer") {
        transferRows.push({
          id: tx.id,
          source: catStr,
          destination: dstStr,
          amount: amt,
          date: dtStr
        });
      } else if (tx.type === "income") {
        incomeRows.push({
          id: tx.id,
          category: sanitizeCategory(catStr, INCOME_CATEGORIES),
          remarks: remStr,
          amount: amt,
          date: dtStr
        });
      }
    });

    var results = await Promise.all([
      replaceTableRows(tables.expenses, expenseRows),
      replaceTableRows(tables.transfers, transferRows),
      replaceTableRows(tables.income, incomeRows)
    ]);

    var allOk = results.every(Boolean);
    if (!allOk) {
      setPendingSyncFlags(targetAcct, { txDirty: true });
      return false;
    }

    setPendingSyncFlags(targetAcct, { txDirty: false });
    return true;
  }

  async function flushPendingLogs(acct) {
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var tables = getAccountTableNames(targetAcct);
    var logs = loadPendingLogs(targetAcct);

    if (logs.history.length) {
      var hRes = await sbClient.from(tables.history).upsert(logs.history, { onConflict: "id" });
      if (!hRes.error) logs.history = [];
    }
    if (logs.edits.length) {
      var eRes = await sbClient.from(tables.edit).upsert(logs.edits, { onConflict: "id" });
      if (!eRes.error) logs.edits = [];
    }
    if (logs.deletes.length) {
      var dRes = await sbClient.from(tables.del).upsert(logs.deletes, { onConflict: "id" });
      if (!dRes.error) logs.deletes = [];
    }

    savePendingLogs(targetAcct, logs);
  }

  async function flushPendingSyncForAccount(acct) {
    if (isFlushingPendingSync) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var flags = loadPendingSyncFlags(targetAcct);

    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return;
    }

    isFlushingPendingSync = true;
    try {
      if (flags.profileDirty) {
        await syncProfileToSupabase(targetAcct);
      }
      if (flags.txDirty) {
        var localTx = loadTransactions(targetAcct);
        await syncTransactionsToSupabase(targetAcct, localTx);
      }
      await flushPendingLogs(targetAcct);
    } finally {
      isFlushingPendingSync = false;
    }
  }

  async function syncAllAccountsWhenOnline() {
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    for (var i = 0; i < ACCOUNTS.length; i++) {
      await flushPendingSyncForAccount(ACCOUNTS[i]);
    }
    pullAccountFromSupabase(activeAccount);
  }

  function pullAccountFromSupabase(acct) {
    if (!sbClient || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    var targetAcct = normalizeAccount(acct || activeAccount);
    var tables = getAccountTableNames(targetAcct);
    var flags = loadPendingSyncFlags(targetAcct);

    if (flags.profileDirty || flags.txDirty) {
      flushPendingSyncForAccount(targetAcct).then(function () {
        var stillDirty = loadPendingSyncFlags(targetAcct);
        if (!stillDirty.profileDirty && !stillDirty.txDirty) {
          pullAccountFromSupabase(targetAcct);
        }
      });
      return;
    }

    Promise.all([
      sbClient.from(tables.profile).select("*").eq("account", targetAcct).maybeSingle(),
      sbClient.from(tables.expenses).select("*"),
      sbClient.from(tables.transfers).select("*"),
      sbClient.from(tables.income).select("*")
    ]).then(function (results) {
      var profRes = results[0];
      var expRes = results[1];
      var trnRes = results[2];
      var incRes = results[3];

      var hasError = [profRes, expRes, trnRes, incRes].some(function (r) { return r && r.error; });
      if (hasError) {
        console.warn("Supabase pull warning:", [profRes, expRes, trnRes, incRes].map(function (r) {
          return r && r.error ? r.error.message : null;
        }).filter(Boolean).join("; "));
        return;
      }

      var mergedTx = [];
      if (expRes && Array.isArray(expRes.data)) {
        expRes.data.forEach(function (r) {
          var rMode = sanitizeRecurrenceMode(r.recurrence_mode);
          mergedTx.push({
            id: r.id,
            type: "expense",
            category: r.category || "",
            remarks: "",
            source: r.source || "",
            destination: "",
            amount: Number(r.amount) || 0,
            date: r.due_date || "",
            recurrenceMode: rMode,
            recurrenceValue: rMode === "months" ? String(r.recurrence_value || "") : getDefaultRecurrenceValue(rMode)
          });
        });
      }
      if (trnRes && Array.isArray(trnRes.data)) {
        trnRes.data.forEach(function (r) {
          mergedTx.push({
            id: r.id,
            type: "transfer",
            category: r.source || "",
            remarks: "",
            source: r.source || "",
            destination: r.destination || "",
            amount: Number(r.amount) || 0,
            date: r.date || "",
            recurrenceMode: "once",
            recurrenceValue: "1"
          });
        });
      }
      if (incRes && Array.isArray(incRes.data)) {
        incRes.data.forEach(function (r) {
          mergedTx.push({
            id: r.id,
            type: "income",
            category: sanitizeCategory(r.category, INCOME_CATEGORIES),
            remarks: r.remarks || "",
            source: "",
            destination: "",
            amount: Number(r.amount) || 0,
            date: r.date || "",
            recurrenceMode: "once",
            recurrenceValue: "1"
          });
        });
      }

      var profRow = profRes && profRes.data ? profRes.data : null;
      var localTx = loadTransactions(targetAcct);

      if (!profRow && mergedTx.length === 0 && localTx.length > 0) {
        syncProfileToSupabase(targetAcct);
        syncTransactionsToSupabase(targetAcct, localTx);
        return;
      }

      var latestFlags = loadPendingSyncFlags(targetAcct);
      if (latestFlags.profileDirty || latestFlags.txDirty) {
        return;
      }

      isSyncingFromCloud = true;
      try {
        if (profRow) {
          var prevPrefs = loadAccountPreferences(targetAcct);
          var nextPrefPayload = {
            device: profRow.device || "galaxy-a56",
            darkMode: Boolean(profRow.dark_mode),
            activePeriod: profRow.active_period || "month",
            lastCategoryExpense: prevPrefs.lastCategoryExpense,
            lastCategoryIncome: prevPrefs.lastCategoryIncome,
            periodSettings: sanitizePeriodSettings({
              weekStart: profRow.week_start,
              weekEnd: profRow.week_end,
              semiStart: profRow.semi_start,
              semiEnd: profRow.semi_end,
              monthStart: profRow.month_start,
              monthEnd: profRow.month_end,
              yearStart: profRow.year_start,
              yearEnd: profRow.year_end
            })
          };
          localStorage.setItem(getAccountPrefsKey(targetAcct), JSON.stringify(nextPrefPayload));

          if (profRow.maribank_interest && typeof profRow.maribank_interest === "object") {
            localStorage.setItem(getMaribankInterestStateKey(targetAcct), JSON.stringify(profRow.maribank_interest));
          }
        }

        localStorage.setItem(getAccountStorageKey(targetAcct), JSON.stringify(sortLatestFirst(mergedTx)));

        if (targetAcct === activeAccount) {
          var loadedPrefs = loadAccountPreferences(targetAcct);
          activeDevice = loadedPrefs.device;
          darkMode = loadedPrefs.darkMode;
          activePeriod = loadedPrefs.activePeriod;
          lastCategoryExpense = loadedPrefs.lastCategoryExpense;
          lastCategoryIncome = loadedPrefs.lastCategoryIncome;
          periodSettings = loadedPrefs.periodSettings;
          transactions = loadTransactions(targetAcct);
          applyMaribankDailyInterest();

          applyDeviceDimensions(activeDevice);
          applyTheme(darkMode);
          syncActivePeriodTabs();
          syncAccountSwitchButton();
          syncPeriodSettingsUI();
          render();
        }
      } finally {
        isSyncingFromCloud = false;
      }
    });
  }

  function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function startOfDay(y, m, d) {
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  function endOfDay(y, m, d) {
    return new Date(y, m, d, 23, 59, 59, 999);
  }

  function getCalendarWeeksForMonth(year, monthIndex) {
    var daysCount = getDaysInMonth(year, monthIndex);
    var weeks = [];
    var day = 1;
    var wIdx = 0;

    while (day <= daysCount) {
      var dObj = new Date(year, monthIndex, day);
      var dow = dObj.getDay();
      var daysUntilSat = 6 - dow;
      var weekStartDay = day;
      var weekEndDay = Math.min(daysCount, day + daysUntilSat);

      weeks.push({
        index: wIdx,
        start: startOfDay(year, monthIndex, weekStartDay),
        end: endOfDay(year, monthIndex, weekEndDay)
      });

      wIdx += 1;
      day = weekEndDay + 1;
    }

    return weeks;
  }

  function getCalendarWeekIndexInMonth(dt) {
    var weeks = getCalendarWeeksForMonth(dt.getFullYear(), dt.getMonth());
    for (var i = 0; i < weeks.length; i++) {
      if (dt >= weeks[i].start && dt <= weeks[i].end) {
        return i;
      }
    }
    return 0;
  }

  function getInitialHalfIndex(dt, settings) {
    var day = dt.getDate();
    if (day >= settings.semiStart && day <= settings.semiEnd) {
      return 0;
    }
    return 1;
  }

  function clampWeekIndexToCurrentMonth() {
    var weeks = getCalendarWeeksForMonth(navYear, navMonth);
    if (navWeekIndex < 0) navWeekIndex = 0;
    if (navWeekIndex >= weeks.length) navWeekIndex = weeks.length - 1;
  }

  function getOrdinalLabel(idxZeroBased) {
    var safeIdx = Math.max(0, Math.min(ORDINAL_NAMES.length - 1, idxZeroBased));
    return ORDINAL_NAMES[safeIdx] + " Week";
  }

  function getHalfLabel(halfIdx) {
    return halfIdx === 1 ? "2nd Half" : "1st Half";
  }

  function syncContextBar() {
    var bar = document.getElementById("tx-context-bar");
    if (!bar) return;
    clampWeekIndexToCurrentMonth();
    var weekEl = document.getElementById("tx-ctx-week");
    var halfEl = document.getElementById("tx-ctx-half");
    var monthEl = document.getElementById("tx-ctx-month");
    var yearEl = document.getElementById("tx-ctx-year");

    if (weekEl) weekEl.textContent = getOrdinalLabel(navWeekIndex);
    if (halfEl) halfEl.textContent = getHalfLabel(navHalf);
    if (monthEl) monthEl.textContent = MONTH_NAMES[navMonth] || "November";
    if (yearEl) yearEl.textContent = String(navYear);
  }

  function jumpToToday() {
    var today = new Date();
    navYear = today.getFullYear();
    navMonth = today.getMonth();
    navWeekIndex = getCalendarWeekIndexInMonth(today);
    navHalf = getInitialHalfIndex(today, periodSettings);
    syncContextBar();
    render();
  }

  function syncActivePeriodTabs() {
    document.querySelectorAll(".period-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-period") === activePeriod);
    });
    document.querySelectorAll(".period-split").forEach(function (sp) {
      sp.classList.toggle("active", sp.getAttribute("data-period") === activePeriod);
    });
    syncContextBar();
  }

  function applyDeviceDimensions(deviceKey) {
    var key = DEVICES[deviceKey] ? deviceKey : "galaxy-a56";
    var dims = DEVICES[key];
    activeDevice = key;
    document.documentElement.style.setProperty("--phone-width", dims.width);
    document.documentElement.style.setProperty("--phone-height", dims.height);
    var widthSel = document.getElementById("frame-width-select");
    if (widthSel) widthSel.value = key;
  }

  function applyTheme(isDark) {
    darkMode = Boolean(isDark);
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    var btn = document.getElementById("theme-toggle-btn");
    var moonIcon = document.getElementById("theme-icon-moon");
    var sunIcon = document.getElementById("theme-icon-sun");
    if (btn) btn.setAttribute("aria-pressed", darkMode ? "true" : "false");
    if (moonIcon) moonIcon.hidden = darkMode;
    if (sunIcon) sunIcon.hidden = !darkMode;
  }

  function formatMoney(val) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(val);
  }

  function parseDateValue(dateStr) {
    if (!dateStr) return null;
    var parts = String(dateStr).split("T")[0].split("-");
    if (parts.length === 3) {
      var dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(dt.getTime())) return dt;
    }
    var fb = new Date(dateStr);
    return isNaN(fb.getTime()) ? null : fb;
  }

  function toIsoDateLocal(dt) {
    var y = dt.getFullYear();
    var m = String(dt.getMonth() + 1).padStart(2, "0");
    var d = String(dt.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function getTodayDateOnly() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function getMaribankBalanceUpTo(txList, cutoffDate) {
    var bal = 0;
    txList.forEach(function (tx) {
      var dt = parseDateValue(tx.date);
      if (!dt) return;
      var txDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      if (txDay > cutoffDate) return;
      var amt = Number(tx.amount) || 0;

      if (tx.type === "transfer") {
        if (tx.category === "Maribank") bal -= amt;
        if (tx.destination === "Maribank") bal += amt;
        return;
      }

      if (tx.type === "expense") {
        if (tx.source === "Maribank") bal -= amt;
        return;
      }

      if (tx.type === "income" && tx.category === "Maribank") {
        bal += amt;
      }
    });
    return Math.max(0, bal);
  }

  function calculateNetDailyMaribankInterest(balance) {
    if (balance <= 0) return 0;
    var basePart = Math.min(balance, MARIBANK_TIER_LIMIT);
    var excessPart = Math.max(0, balance - MARIBANK_TIER_LIMIT);
    var grossDaily =
      (basePart * MARIBANK_BASE_RATE) / MARIBANK_DAYS_IN_YEAR +
      (excessPart * MARIBANK_EXCESS_RATE) / MARIBANK_DAYS_IN_YEAR;
    return grossDaily * (1 - MARIBANK_TAX_RATE);
  }

  function loadMaribankInterestState(acct) {
    var todayIso = toIsoDateLocal(getTodayDateOnly());
    try {
      var raw = JSON.parse(localStorage.getItem(getMaribankInterestStateKey(acct)) || "{}");
      return {
        lastProcessedDate: typeof raw.lastProcessedDate === "string" && raw.lastProcessedDate ? raw.lastProcessedDate : todayIso,
        pendingInterest: typeof raw.pendingInterest === "number" && !isNaN(raw.pendingInterest) ? Math.max(0, raw.pendingInterest) : 0
      };
    } catch (e) {
      return {
        lastProcessedDate: todayIso,
        pendingInterest: 0
      };
    }
  }

  function saveMaribankInterestState(acct, state) {
    try {
      localStorage.setItem(getMaribankInterestStateKey(acct), JSON.stringify({
        lastProcessedDate: state.lastProcessedDate,
        pendingInterest: state.pendingInterest
      }));
    } catch (e) {}
    if (!isSyncingFromCloud) {
      setPendingSyncFlags(acct, { profileDirty: true });
    }
    syncProfileToSupabase(acct);
  }

  function applyMaribankDailyInterest() {
    var today = getTodayDateOnly();
    var todayIso = toIsoDateLocal(today);
    var state = loadMaribankInterestState(activeAccount);
    var lastDt = parseDateValue(state.lastProcessedDate);

    if (!lastDt) {
      state.lastProcessedDate = todayIso;
      saveMaribankInterestState(activeAccount, state);
      return;
    }

    var cursor = new Date(lastDt.getFullYear(), lastDt.getMonth(), lastDt.getDate());
    if (cursor >= today) {
      return;
    }

    var pending = state.pendingInterest;
    var addedTx = false;

    while (cursor < today) {
      var dayEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      var balOnDay = getMaribankBalanceUpTo(transactions, dayEnd);
      pending += calculateNetDailyMaribankInterest(balOnDay);

      var nextDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      var creditableCents = Math.floor(pending * 100);
      if (creditableCents >= 1) {
        var creditedAmount = creditableCents / 100;
        pending = Math.max(0, pending - creditedAmount);
        var intTx = {
          id: "mb-int-" + toIsoDateLocal(nextDay) + "-" + Math.random().toString(36).slice(2, 6),
          type: "income",
          remarks: "Interest (3.25% p.a. - 20% tax)",
          amount: creditedAmount,
          category: "Maribank",
          date: toIsoDateLocal(nextDay),
          recurrenceMode: "once",
          recurrenceValue: "1"
        };
        transactions.unshift(intTx);
        logHistorySave(activeAccount, intTx);
        addedTx = true;
      }

      cursor = nextDay;
    }

    state.lastProcessedDate = todayIso;
    state.pendingInterest = pending;
    saveMaribankInterestState(activeAccount, state);

    if (addedTx) {
      saveTransactions();
    }
  }

  function sortLatestFirst(list) {
    return list.slice().sort(function (a, b) {
      var da = parseDateValue(a.date);
      var db = parseDateValue(b.date);
      var diff = (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      return diff !== 0 ? diff : String(b.id || "").localeCompare(String(a.id || ""));
    });
  }

  function formatReadableDate(dateStr) {
    var d = parseDateValue(dateStr);
    return d ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : dateStr;
  }

  function syncDateDisplay() {
    var input = document.getElementById("date");
    var display = document.getElementById("date-display");
    if (input && display) display.textContent = formatReadableDate(input.value);
  }

  function syncDateLabelForType(typeVal) {
    var lbl = document.getElementById("date-label");
    var btn = document.getElementById("date-picker-btn");
    var isExp = typeVal === "expense";
    if (lbl) lbl.textContent = isExp ? "Due Date" : "Date";
    if (btn) btn.setAttribute("aria-label", isExp ? "Pick due date" : "Pick date");
  }

  function formatAmountInputValue(rawVal) {
    var cleaned = String(rawVal || "").replace(/[^0-9.]/g, "");
    if (!cleaned) return "";
    var parts = cleaned.split(".");
    var intPart = parts[0].replace(/^0+(?=\d)/, "");
    var hasDot = parts.length > 1;
    var decPart = hasDot ? parts.slice(1).join("").slice(0, 2) : "";
    var fmtInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : (hasDot || decPart ? "0" : "");
    if (!fmtInt && !hasDot) return "";
    return hasDot ? fmtInt + "." + decPart : fmtInt;
  }

  function formatExactAmountForInput(numVal) {
    var n = Number(numVal) || 0;
    var fixed = n.toFixed(2);
    var parts = fixed.split(".");
    var fmtInt = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts[1] === "00" ? fmtInt : fmtInt + "." + parts[1];
  }

  function parseFormattedAmount(val) {
    var num = parseFloat(String(val || "").replace(/,/g, ""));
    return isNaN(num) ? NaN : num;
  }

  function getCategoryBreakdownTotals(ignoreTxId) {
    var spentTotals = {};
    var totalTotals = {};
    INCOME_CATEGORIES.forEach(function (cat) {
      spentTotals[cat] = 0;
      totalTotals[cat] = 0;
    });

    transactions.forEach(function (tx) {
      if (ignoreTxId && tx.id === ignoreTxId) return;
      var amt = Number(tx.amount) || 0;

      if (tx.type === "income") {
        var incCat = INCOME_CATEGORIES.indexOf(tx.category) !== -1 ? tx.category : "Others";
        totalTotals[incCat] += amt;
        return;
      }

      if (tx.type === "expense") {
        var expSrc = INCOME_CATEGORIES.indexOf(tx.source) !== -1 ? tx.source : null;
        if (expSrc) {
          spentTotals[expSrc] += amt;
        }
        return;
      }

      if (tx.type === "transfer") {
        var srcCat = INCOME_CATEGORIES.indexOf(tx.category) !== -1 ? tx.category : null;
        var dstCat = INCOME_CATEGORIES.indexOf(tx.destination) !== -1 ? tx.destination : null;

        if (srcCat) {
          var available = Math.max(0, totalTotals[srcCat] - spentTotals[srcCat]);
          var deductedFromTotal = Math.min(amt, available);
          totalTotals[srcCat] = Math.max(0, totalTotals[srcCat] - deductedFromTotal);
          var leftover = amt - deductedFromTotal;
          if (leftover > 0) {
            spentTotals[srcCat] += leftover;
          }
        }

        if (dstCat) {
          totalTotals[dstCat] += amt;
        }
      }
    });

    return {
      spentTotals: spentTotals,
      totalTotals: totalTotals
    };
  }

  function getSourceAvailableBalance(sourceCat, ignoreTxId) {
    var totals = getCategoryBreakdownTotals(ignoreTxId);
    var spentVal = totals.spentTotals[sourceCat] || 0;
    var totalVal = totals.totalTotals[sourceCat] || 0;
    return Math.max(0, totalVal - spentVal);
  }

  function autoFillTransferAmountForSource(sourceCat) {
    var amtInput = document.getElementById("amount");
    if (!amtInput) return;
    var bal = getSourceAvailableBalance(sourceCat, editingTxId);
    amtInput.value = formatExactAmountForInput(bal);
  }

  function getSelectedWeekRange() {
    clampWeekIndexToCurrentMonth();
    var weeks = getCalendarWeeksForMonth(navYear, navMonth);
    var w = weeks[navWeekIndex] || weeks[0];
    return { start: w.start, end: w.end };
  }

  function getSelectedSemiRange() {
    var daysInMonth = getDaysInMonth(navYear, navMonth);
    var h1StartDay = Math.min(periodSettings.semiStart, daysInMonth);
    var h1EndDay = Math.min(Math.max(periodSettings.semiStart, periodSettings.semiEnd), daysInMonth);

    if (navHalf === 0) {
      return {
        start: startOfDay(navYear, navMonth, h1StartDay),
        end: endOfDay(navYear, navMonth, h1EndDay)
      };
    }

    var nextMonth = navMonth + 1;
    var nextYear = navYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    var daysNextMonth = getDaysInMonth(nextYear, nextMonth);
    var h2EndDay = periodSettings.semiStart > 1
      ? Math.min(periodSettings.semiStart - 1, daysNextMonth)
      : daysNextMonth;

    if (periodSettings.semiEnd < daysInMonth) {
      return {
        start: startOfDay(navYear, navMonth, periodSettings.semiEnd + 1),
        end: endOfDay(nextYear, nextMonth, h2EndDay)
      };
    }

    return {
      start: startOfDay(nextYear, nextMonth, 1),
      end: endOfDay(nextYear, nextMonth, h2EndDay)
    };
  }

  function getSelectedMonthRange() {
    var daysThisMonth = getDaysInMonth(navYear, navMonth);
    var sDay = Math.min(periodSettings.monthStart, daysThisMonth);
    var eDay = periodSettings.monthEnd;

    if (eDay < sDay) {
      var nextMonth = navMonth + 1;
      var nextYear = navYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      var daysNextMonth = getDaysInMonth(nextYear, nextMonth);
      return {
        start: startOfDay(navYear, navMonth, sDay),
        end: endOfDay(nextYear, nextMonth, Math.min(eDay, daysNextMonth))
      };
    }

    return {
      start: startOfDay(navYear, navMonth, sDay),
      end: endOfDay(navYear, navMonth, Math.min(eDay, daysThisMonth))
    };
  }

  function getSelectedYearRange() {
    var startM = periodSettings.yearStart;
    var startY = navYear;
    var startDt = startOfDay(startY, startM, 1);

    var endM = (startM + 11) % 12;
    var endY = startM === 0 ? startY : startY + 1;
    var endLastDay = getDaysInMonth(endY, endM);
    var endDt = endOfDay(endY, endM, endLastDay);

    return { start: startDt, end: endDt };
  }

  function getActivePeriodRange(period) {
    if (period === "week") return getSelectedWeekRange();
    if (period === "semi") return getSelectedSemiRange();
    if (period === "month") return getSelectedMonthRange();
    if (period === "year") return getSelectedYearRange();
    return null;
  }

  function isWithinPeriod(dateStr, period) {
    var dt = parseDateValue(dateStr);
    if (!dt) return true;
    var range = getActivePeriodRange(period);
    if (!range) return true;
    return dt >= range.start && dt <= range.end;
  }

  function syncAccountSwitchButton() {
    var btn = document.getElementById("account-switch-btn");
    if (!btn) return;
    btn.textContent = activeAccount;
    btn.className = "account-switch-btn " + (activeAccount === "Ellie" ? "is-ellie" : "is-doom");
  }

  function syncPeriodSettingsUI() {
    var wStartSel = document.getElementById("week-start-select");
    var wEndSel = document.getElementById("week-end-select");
    var semiStartInp = document.getElementById("semi-start-input");
    var semiEndInp = document.getElementById("semi-end-input");
    var monthStartInp = document.getElementById("month-start-input");
    var monthEndInp = document.getElementById("month-end-input");
    var yearStartSel = document.getElementById("year-start-select");
    var yearEndSel = document.getElementById("year-end-select");

    if (wStartSel) wStartSel.value = String(periodSettings.weekStart);
    if (wEndSel) wEndSel.value = String(periodSettings.weekEnd);
    if (semiStartInp) semiStartInp.value = String(periodSettings.semiStart);
    if (semiEndInp) semiEndInp.value = String(periodSettings.semiEnd);
    if (monthStartInp) monthStartInp.value = String(periodSettings.monthStart);
    if (monthEndInp) monthEndInp.value = String(periodSettings.monthEnd);
    if (yearStartSel) yearStartSel.value = String(periodSettings.yearStart);
    if (yearEndSel) yearEndSel.value = String(periodSettings.yearEnd);
  }

  function applyAccountState(acct) {
    activeAccount = normalizeAccount(acct);
    saveActiveAccount(activeAccount);
    var nextPrefs = loadAccountPreferences(activeAccount);
    activeDevice = nextPrefs.device;
    darkMode = nextPrefs.darkMode;
    activePeriod = nextPrefs.activePeriod;
    lastCategoryExpense = nextPrefs.lastCategoryExpense;
    lastCategoryIncome = nextPrefs.lastCategoryIncome;
    periodSettings = nextPrefs.periodSettings;
    transactions = loadTransactions(activeAccount);

    var nowReset = new Date();
    navYear = nowReset.getFullYear();
    navMonth = nowReset.getMonth();
    navHalf = getInitialHalfIndex(nowReset, periodSettings);
    navWeekIndex = getCalendarWeekIndexInMonth(nowReset);

    applyDeviceDimensions(activeDevice);
    applyTheme(darkMode);
    syncActivePeriodTabs();
    syncAccountSwitchButton();
    syncPeriodSettingsUI();
    closeClearConfirmModal();
    closeSheet();
    render();
    pullAccountFromSupabase(activeAccount);
  }

  function switchAccount() {
    resetOpenSwipe(null);
    var nextAcct = activeAccount === "Doom" ? "Ellie" : "Doom";
    applyAccountState(nextAcct);
  }

  function populateDestinationDropdown(sourceCat, selectedDest) {
    var destSel = document.getElementById("destination");
    if (!destSel) return;
    var candidates = INCOME_CATEGORIES.filter(function (c) { return c !== sourceCat; });
    if (!candidates.length) candidates = INCOME_CATEGORIES.slice();

    destSel.innerHTML = "";
    candidates.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      destSel.appendChild(opt);
    });

    var targetDest = selectedDest && candidates.indexOf(selectedDest) !== -1 ? selectedDest : candidates[0];
    destSel.value = targetDest;
  }

  function populateExpenseSourceDropdown(selectedSource) {
    var destSel = document.getElementById("destination");
    if (!destSel) return;
    destSel.innerHTML = "";
    INCOME_CATEGORIES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      destSel.appendChild(opt);
    });
    destSel.value = sanitizeCategory(selectedSource || lastCategoryIncome, INCOME_CATEGORIES);
  }

  function syncFormFieldsForType(typeVal, selectedCategory, selectedSecondField, preserveAmount) {
    var isTransfer = typeVal === "transfer";
    var isExpense = typeVal === "expense";
    var isIncome = typeVal === "income";

    var catLabel = document.getElementById("category-label");
    var remLabel = document.getElementById("remarks-label");
    var remInp = document.getElementById("remarks");
    var destSel = document.getElementById("destination");

    var useSecondDropdown = isTransfer || isExpense;

    if (catLabel) {
      catLabel.textContent = isTransfer ? "Source" : (isIncome ? "Type" : "Category");
    }
    if (remLabel) {
      remLabel.textContent = isTransfer ? "Destination" : (isExpense ? "Source" : "Remarks");
      remLabel.setAttribute("for", useSecondDropdown ? "destination" : "remarks");
    }

    if (remInp) remInp.hidden = useSecondDropdown;
    if (destSel) {
      destSel.hidden = !useSecondDropdown;
      destSel.required = useSecondDropdown;
    }

    var sel = document.getElementById("category");
    if (sel) {
      var list = isIncome ? INCOME_CATEGORIES : (isTransfer ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
      var fallbackCat = isIncome ? lastCategoryIncome : (isTransfer ? lastCategoryIncome : lastCategoryExpense);
      var targetCat = selectedCategory && list.indexOf(selectedCategory) !== -1 ? selectedCategory : fallbackCat;

      sel.innerHTML = "";
      list.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
      });
      sel.value = sanitizeCategory(targetCat, list);

      if (isTransfer) {
        populateDestinationDropdown(sel.value, selectedSecondField);
        if (!preserveAmount) {
          autoFillTransferAmountForSource(sel.value);
        }
      } else if (isExpense) {
        populateExpenseSourceDropdown(selectedSecondField);
      }
    }

    syncDateLabelForType(typeVal);
    syncRecurrenceVisibilityForType(typeVal);
  }

  function syncTypeSwitchButton() {
    var btn = document.getElementById("tx-type-switch");
    if (!btn) return;
    btn.className = "type-switch-btn mode-" + txFilterType;
    if (txFilterType === "income") btn.textContent = "Income";
    else if (txFilterType === "all") btn.textContent = "All";
    else btn.textContent = "Expense";
  }

  function resetOpenSwipe(exceptCard) {
    if (openSwipeCard && openSwipeCard !== exceptCard) {
      openSwipeCard.classList.remove("swiping");
      openSwipeCard.style.transform = "translateX(0px)";
      openSwipeCard.dataset.offset = "0";
      if (openSwipeCard.parentElement) {
        openSwipeCard.parentElement.classList.remove("swipe-open", "swipe-open-left", "swipe-open-right");
      }
      openSwipeCard = null;
      openSwipeDir = 0;
    }
  }

  function setCardSwipeOffset(card, offsetPx) {
    var clamped = Math.max(-SWIPE_REVEAL_PX, Math.min(SWIPE_REVEAL_PX, offsetPx));
    card.style.transform = "translateX(" + clamped + "px)";
    card.dataset.offset = String(clamped);
    if (card.parentElement) {
      card.parentElement.classList.toggle("swipe-open-left", clamped > 0);
      card.parentElement.classList.toggle("swipe-open-right", clamped < 0);
      card.parentElement.classList.toggle("swipe-open", clamped < 0);
    }
    if (clamped < 0) {
      openSwipeCard = card;
      openSwipeDir = -1;
    } else if (clamped > 0) {
      openSwipeCard = card;
      openSwipeDir = 1;
    } else if (openSwipeCard === card) {
      openSwipeCard = null;
      openSwipeDir = 0;
    }
  }

  function createEditIconSvg() {
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.1");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    var p1 = document.createElementNS(svgNS, "path");
    p1.setAttribute("d", "M12 20h9");
    var p2 = document.createElementNS(svgNS, "path");
    p2.setAttribute("d", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z");

    svg.appendChild(p1);
    svg.appendChild(p2);
    return svg;
  }

  function createTrashIconSvg() {
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.1");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    var p1 = document.createElementNS(svgNS, "polyline");
    p1.setAttribute("points", "3 6 5 6 21 6");
    var p2 = document.createElementNS(svgNS, "path");
    p2.setAttribute("d", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6");
    var p3 = document.createElementNS(svgNS, "path");
    p3.setAttribute("d", "M10 11v6");
    var p4 = document.createElementNS(svgNS, "path");
    p4.setAttribute("d", "M14 11v6");
    var p5 = document.createElementNS(svgNS, "path");
    p5.setAttribute("d", "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2");

    svg.appendChild(p1);
    svg.appendChild(p2);
    svg.appendChild(p3);
    svg.appendChild(p4);
    svg.appendChild(p5);
    return svg;
  }

  function attachSwipeHandlers(card) {
    var startX = 0;
    var startY = 0;
    var baseOffset = 0;
    var isDragging = false;
    var movedHorizontally = false;
    var suppressNextClick = false;

    card.dataset.offset = "0";

    function beginDrag(clientX, clientY) {
      resetOpenSwipe(card);
      startX = clientX;
      startY = clientY;
      baseOffset = parseFloat(card.dataset.offset || "0") || 0;
      isDragging = true;
      movedHorizontally = false;
      card.classList.add("swiping");
    }

    function moveDrag(clientX, clientY, cancelableEvent) {
      if (!isDragging) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      if (!movedHorizontally && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        movedHorizontally = true;
      }
      if (movedHorizontally) {
        if (cancelableEvent && cancelableEvent.cancelable) cancelableEvent.preventDefault();
        setCardSwipeOffset(card, baseOffset + dx);
      }
    }

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove("swiping");
      if (movedHorizontally) {
        suppressNextClick = true;
        setTimeout(function () { suppressNextClick = false; }, 0);
      }
      var current = parseFloat(card.dataset.offset || "0") || 0;
      if (current <= -SWIPE_REVEAL_PX * 0.4) {
        setCardSwipeOffset(card, -SWIPE_REVEAL_PX);
      } else if (current >= SWIPE_REVEAL_PX * 0.4) {
        setCardSwipeOffset(card, SWIPE_REVEAL_PX);
      } else {
        setCardSwipeOffset(card, 0);
      }
    }

    card.addEventListener("touchstart", function (e) {
      if (!e.touches || e.touches.length !== 1) return;
      beginDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    card.addEventListener("touchmove", function (e) {
      if (!isDragging || !e.touches || e.touches.length !== 1) return;
      moveDrag(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    card.addEventListener("touchend", endDrag);
    card.addEventListener("touchcancel", endDrag);

    card.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      beginDrag(e.clientX, e.clientY);

      function onWindowMouseMove(moveEvt) {
        moveDrag(moveEvt.clientX, moveEvt.clientY, moveEvt);
      }

      function onWindowMouseUp() {
        window.removeEventListener("mousemove", onWindowMouseMove);
        window.removeEventListener("mouseup", onWindowMouseUp);
        endDrag();
      }

      window.addEventListener("mousemove", onWindowMouseMove);
      window.addEventListener("mouseup", onWindowMouseUp);
    });

    card.addEventListener("click", function () {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      var current = parseFloat(card.dataset.offset || "0") || 0;
      if (current !== 0) {
        setCardSwipeOffset(card, 0);
      } else {
        resetOpenSwipe(null);
      }
    });
  }

  function setSegmentedType(typeVal, isEditing) {
    var t = typeVal === "income" ? "income" : (typeVal === "transfer" ? "transfer" : "expense");
    var hid = document.getElementById("type");
    if (hid) hid.value = t;
    document.querySelectorAll(".seg-btn").forEach(function (b) {
      var btnType = b.getAttribute("data-type");
      var isActive = btnType === t;
      b.classList.toggle("active", isActive);
      b.disabled = Boolean(isEditing && !isActive);
      b.setAttribute("aria-disabled", b.disabled ? "true" : "false");
    });
    return t;
  }

  function closeClearConfirmModal() {
    var backdrop = document.getElementById("clear-confirm-backdrop");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.style.display = "none";
    }
  }

  function openClearConfirmModal() {
    if (!transactions.length) return;
    var descEl = document.getElementById("clear-confirm-desc");
    var backdrop = document.getElementById("clear-confirm-backdrop");
    if (descEl) {
      descEl.textContent = "This will permanently delete all transactions for " + activeAccount + ".";
    }
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.style.display = "flex";
    }
  }

  function closeSheet() {
    editingTxId = null;
    setSegmentedType(document.getElementById("type") ? document.getElementById("type").value : "expense", false);
    var b = document.getElementById("sheet-backdrop");
    if (b) { b.hidden = true; b.style.display = "none"; }
  }

  function openSheet(existingTx) {
    resetOpenSwipe(null);

    var titleEl = document.getElementById("sheet-title");
    var remEl = document.getElementById("remarks");
    var amtInput = document.getElementById("amount");
    var dateInput = document.getElementById("date");

    if (existingTx && existingTx.id) {
      editingTxId = existingTx.id;
      if (titleEl) titleEl.textContent = "Edit Transaction";
      var txType = setSegmentedType(existingTx.type, true);
      var secondVal = txType === "transfer" ? existingTx.destination : existingTx.source;
      syncFormFieldsForType(txType, existingTx.category, secondVal, true);
      if (remEl) remEl.value = txType === "income" ? (existingTx.remarks || "") : "";
      if (amtInput) amtInput.value = formatAmountInputValue(String(existingTx.amount || ""));
      if (dateInput) {
        dateInput.value = existingTx.date || "";
        syncDateDisplay();
      }
      if (txType === "expense") {
        var exRecMode = sanitizeRecurrenceMode(existingTx.recurrenceMode);
        var exRecVal = exRecMode === "months"
          ? String(existingTx.recurrenceValue || "")
          : getDefaultRecurrenceValue(exRecMode);
        applyRecurrenceUI(exRecMode, exRecVal, false);
      } else {
        applyRecurrenceUI("once", "1", true);
      }
    } else {
      editingTxId = null;
      if (titleEl) titleEl.textContent = "New Transaction";
      var t = document.getElementById("type");
      var curType = setSegmentedType(t ? t.value : "expense", false);
      syncFormFieldsForType(curType, null, null, false);
      if (remEl) remEl.value = "";
      if (curType !== "transfer" && amtInput) amtInput.value = "";
      setDefaultDate();
      applyRecurrenceUI("once", "1", true);
    }

    var b = document.getElementById("sheet-backdrop");
    if (b) { b.hidden = false; b.style.display = "flex"; }
  }

  function showView(tabName) {
    var prevTab = activeTab;
    resetOpenSwipe(null);
    activeTab = tabName;
    ["transactions", "dashboard", "profile"].forEach(function (name) {
      var el = document.getElementById("view-" + name);
      if (el) el.hidden = tabName !== name;
    });

    var isProfile = tabName === "profile";
    var themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.hidden = !isProfile;
      themeBtn.style.display = isProfile ? "inline-flex" : "none";
    }

    var addBtn = document.getElementById("open-sheet-btn");
    if (addBtn) {
      var isTx = tabName === "transactions";
      addBtn.hidden = !isTx;
      addBtn.style.display = isTx ? "inline-flex" : "none";
    }
    if (prevTab !== tabName && tabName !== "transactions") closeSheet();

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });

    var title = document.getElementById("page-title");
    if (title) {
      title.textContent = tabName === "transactions" ? "Transactions" : (isProfile ? "Profile" : "Dashboard");
    }
  }

  function setDefaultDate() {
    var input = document.getElementById("date");
    if (!input) return;
    var now = new Date();
    input.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    syncDateDisplay();
  }

  function deleteTransaction(id) {
    openSwipeCard = null;
    openSwipeDir = 0;
    var removedTx = null;
    transactions = transactions.filter(function (tx) {
      if (tx.id === id) {
        removedTx = tx;
        return false;
      }
      return true;
    });
    if (removedTx) {
      logDeletedItem(activeAccount, removedTx.type, removedTx.id, removedTx);
    }
    saveTransactions();
    render();
  }

  function createTransactionElement(tx) {
    var li = document.createElement("li");
    li.className = "tx-swipe-wrap";

    var editAction = document.createElement("button");
    editAction.type = "button";
    editAction.className = "tx-edit-action";
    editAction.setAttribute("aria-label", "Edit transaction");
    editAction.appendChild(createEditIconSvg());
    editAction.onclick = function (e) {
      e.stopPropagation();
      openSheet(tx);
    };

    var delAction = document.createElement("button");
    delAction.type = "button";
    delAction.className = "tx-delete-action";
    delAction.setAttribute("aria-label", "Delete transaction");
    delAction.appendChild(createTrashIconSvg());
    delAction.onclick = function (e) {
      e.stopPropagation();
      deleteTransaction(tx.id);
    };

    var card = document.createElement("div");
    card.className = "tx-item";

    var info = document.createElement("div");
    info.className = "tx-info";

    var isTransfer = tx.type === "transfer";
    var isExpense = tx.type === "expense";
    var titleEl = document.createElement("span");
    titleEl.className = "tx-title";

    if (isTransfer) {
      titleEl.textContent = tx.category;
      var destSpan = document.createElement("span");
      destSpan.className = "tx-remarks";
      destSpan.textContent = " → " + (tx.destination || "");
      titleEl.appendChild(destSpan);
    } else if (isExpense) {
      titleEl.textContent = tx.category;
      if (tx.source) {
        var srcSpan = document.createElement("span");
        srcSpan.className = "tx-remarks";
        srcSpan.textContent = " · " + tx.source;
        titleEl.appendChild(srcSpan);
      }
    } else {
      titleEl.textContent = tx.category || "Others";
      if (tx.remarks) {
        var remSpan = document.createElement("span");
        remSpan.className = "tx-remarks";
        remSpan.textContent = " · " + tx.remarks;
        titleEl.appendChild(remSpan);
      }
    }

    var dateEl = document.createElement("span");
    dateEl.className = "tx-date";
    var recBadge = "";
    if (isExpense) {
      var recMode = sanitizeRecurrenceMode(tx.recurrenceMode);
      if (recMode === "months") {
        recBadge = " · Months" + (tx.recurrenceValue ? " (" + tx.recurrenceValue + ")" : "");
      } else if (recMode === "lifetime") {
        recBadge = " · Lifetime (-)";
      }
    }
    dateEl.textContent = (tx.type === "expense" ? "Due: " : "") + formatReadableDate(tx.date) + recBadge;

    info.appendChild(titleEl);
    info.appendChild(dateEl);

    var right = document.createElement("div");
    right.className = "tx-right";

    var amtEl = document.createElement("span");
    amtEl.className = "tx-amount " + (isTransfer ? "transfer" : tx.type);
    if (isTransfer) {
      amtEl.style.color = "var(--blue)";
      amtEl.textContent = formatMoney(tx.amount);
    } else {
      amtEl.textContent = (tx.type === "income" ? "+ " : "- ") + formatMoney(tx.amount);
    }

    right.appendChild(amtEl);
    card.appendChild(info);
    card.appendChild(right);

    attachSwipeHandlers(card);

    li.appendChild(editAction);
    li.appendChild(delAction);
    li.appendChild(card);
    return li;
  }

  function buildSeriesBuckets(period) {
    var buckets = [];

    if (period === "week") {
      var wk = getSelectedWeekRange();
      var cursor = new Date(wk.start.getFullYear(), wk.start.getMonth(), wk.start.getDate());
      while (cursor <= wk.end) {
        (function (d) {
          buckets.push({
            label: d.toLocaleDateString("en-US", { weekday: "short" }),
            income: 0,
            expense: 0,
            match: function (dt) {
              return dt && dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth() && dt.getDate() === d.getDate();
            }
          });
        })(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === "semi") {
      var semi = getSelectedSemiRange();
      var startDayObj = new Date(semi.start.getFullYear(), semi.start.getMonth(), semi.start.getDate(), 0, 0, 0, 0);
      var endDayObj = new Date(semi.end.getFullYear(), semi.end.getMonth(), semi.end.getDate(), 0, 0, 0, 0);

      var totalDays = Math.max(
        1,
        Math.round((endDayObj.getTime() - startDayObj.getTime()) / 86400000) + 1
      );

      var markerOffsets = [];
      for (var offset = 0; offset < totalDays; offset++) {
        var isFirst = offset === 0;
        var isLast = offset === totalDays - 1;
        var isEveryFive = offset > 0 && offset % 5 === 0;
        if (isFirst || isLast || (isEveryFive && totalDays - 1 - offset > 1)) {
          markerOffsets.push(offset);
        }
      }

      for (var mIdx = 0; mIdx < markerOffsets.length; mIdx++) {
        (function (idx) {
          var fromOffset = markerOffsets[idx];
          var toOffsetExclusive = idx < markerOffsets.length - 1 ? markerOffsets[idx + 1] : totalDays;

          var bStart = new Date(
            startDayObj.getFullYear(),
            startDayObj.getMonth(),
            startDayObj.getDate() + fromOffset,
            0, 0, 0, 0
          );
          var bEnd = new Date(
            startDayObj.getFullYear(),
            startDayObj.getMonth(),
            startDayObj.getDate() + toOffsetExclusive,
            0, 0, 0, -1
          );

          buckets.push({
            label: String(bStart.getDate()),
            income: 0,
            expense: 0,
            match: function (dt) {
              return dt && dt >= bStart && dt <= bEnd;
            }
          });
        })(mIdx);
      }
    } else if (period === "year") {
      var yrRange = getSelectedYearRange();
      var startY = yrRange.start.getFullYear();
      var startM = yrRange.start.getMonth();
      var qLabels = ["Q1", "Q2", "Q3", "Q4"];
      for (var qIdx = 0; qIdx < 4; qIdx++) {
        (function (qIndex) {
          var qStart = new Date(startY, startM + qIndex * 3, 1, 0, 0, 0, 0);
          var qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0, 23, 59, 59, 999);
          buckets.push({
            label: qLabels[qIndex],
            income: 0,
            expense: 0,
            match: function (dt) {
              return dt && dt >= qStart && dt <= qEnd;
            }
          });
        })(qIdx);
      }
    } else {
      var daysInMonth = getDaysInMonth(navYear, navMonth);
      var weekRanges = [
        { start: 1, end: 5, label: "W1" },
        { start: 6, end: 10, label: "W2" },
        { start: 11, end: 15, label: "W3" },
        { start: 16, end: 20, label: "W4" },
        { start: 21, end: 25, label: "W5" },
        { start: 26, end: daysInMonth, label: "W6" }
      ];
      weekRanges.forEach(function (r) {
        buckets.push({
          label: r.label,
          income: 0,
          expense: 0,
          match: function (dt) {
            return dt && dt.getFullYear() === navYear && dt.getMonth() === navMonth && dt.getDate() >= r.start && dt.getDate() <= r.end;
          }
        });
      });
    }

    transactions.forEach(function (tx) {
      var dt = parseDateValue(tx.date);
      if (!dt) return;
      for (var b = 0; b < buckets.length; b++) {
        if (buckets[b].match(dt)) {
          if (tx.type === "income") buckets[b].income += Number(tx.amount) || 0;
          else if (tx.type === "expense") buckets[b].expense += Number(tx.amount) || 0;
          break;
        }
      }
    });

    return buckets;
  }

  function renderGraphAnalysis() {
    var svgNS = "http://www.w3.org/2000/svg";
    var plotLeft = 32;
    var plotRight = 302;
    var plotTop = 16;
    var plotBottom = 110;
    var plotHeight = plotBottom - plotTop;

    var buckets = buildSeriesBuckets(activePeriod);
    var maxVal = 0;
    buckets.forEach(function (b) {
      if (b.income > maxVal) maxVal = b.income;
      if (b.expense > maxVal) maxVal = b.expense;
    });

    var incPoints = [];
    var expPoints = [];
    var count = buckets.length;
    var stepX = count > 1 ? (plotRight - plotLeft) / (count - 1) : 0;

    var dotsInc = document.getElementById("dots-income");
    var dotsExp = document.getElementById("dots-expense");
    var xLabels = document.getElementById("chart-x-labels");
    if (dotsInc) dotsInc.innerHTML = "";
    if (dotsExp) dotsExp.innerHTML = "";
    if (xLabels) xLabels.innerHTML = "";

    buckets.forEach(function (b, idx) {
      var x = count > 1 ? plotLeft + idx * stepX : (plotLeft + plotRight) / 2;
      var incRatio = maxVal > 0 ? b.income / maxVal : 0;
      var expRatio = maxVal > 0 ? b.expense / maxVal : 0;
      var yInc = plotBottom - incRatio * plotHeight;
      var yExp = plotBottom - expRatio * plotHeight;

      incPoints.push(x.toFixed(1) + "," + yInc.toFixed(1));
      expPoints.push(x.toFixed(1) + "," + yExp.toFixed(1));

      if (dotsInc) {
        var cInc = document.createElementNS(svgNS, "circle");
        cInc.setAttribute("cx", x.toFixed(1));
        cInc.setAttribute("cy", yInc.toFixed(1));
        cInc.setAttribute("r", "3");
        cInc.setAttribute("fill", "#16a34a");
        dotsInc.appendChild(cInc);
      }

      if (dotsExp) {
        var cExp = document.createElementNS(svgNS, "circle");
        cExp.setAttribute("cx", x.toFixed(1));
        cExp.setAttribute("cy", yExp.toFixed(1));
        cExp.setAttribute("r", "3");
        cExp.setAttribute("fill", "#e11d48");
        dotsExp.appendChild(cExp);
      }

      if (xLabels) {
        var lbl = document.createElementNS(svgNS, "text");
        lbl.setAttribute("x", x.toFixed(1));
        lbl.setAttribute("y", "135");
        lbl.setAttribute("text-anchor", "middle");
        lbl.setAttribute("font-size", "9");
        lbl.setAttribute("font-weight", "600");
        lbl.setAttribute("fill", "#94a3b8");
        lbl.textContent = b.label;
        xLabels.appendChild(lbl);
      }
    });

    var lineInc = document.getElementById("line-income");
    var lineExp = document.getElementById("line-expense");
    if (lineInc) lineInc.setAttribute("points", incPoints.join(" "));
    if (lineExp) lineExp.setAttribute("points", expPoints.join(" "));
  }

  function renderIncomeProgress() {
    var listEl = document.getElementById("income-progress-list");
    if (!listEl) return;

    var totals = getCategoryBreakdownTotals(null);
    var spentTotals = totals.spentTotals;
    var totalTotals = totals.totalTotals;

    listEl.innerHTML = "";
    INCOME_CATEGORIES.forEach(function (cat) {
      var spentVal = spentTotals[cat] || 0;
      var totalVal = totalTotals[cat] || 0;
      var hasActivity = spentVal !== 0 || totalVal !== 0;
      var isInsufficient = spentVal > totalVal;
      var toneClass = isInsufficient ? "is-insufficient" : "is-healthy";

      var li = document.createElement("li");
      li.className = "income-progress-row" + (hasActivity ? "" : " is-muted");

      var nameSpan = document.createElement("span");
      nameSpan.className = "income-progress-cat";
      nameSpan.textContent = cat.toUpperCase();

      var valsDiv = document.createElement("div");
      valsDiv.className = "income-progress-vals " + toneClass;

      var curSpan = document.createElement("span");
      curSpan.className = "income-val-current";
      curSpan.textContent = formatMoney(spentVal);

      var slashSpan = document.createElement("span");
      slashSpan.className = "income-val-slash";
      slashSpan.textContent = "/";

      var totSpan = document.createElement("span");
      totSpan.className = "income-val-total";
      totSpan.textContent = formatMoney(totalVal);

      valsDiv.appendChild(curSpan);
      valsDiv.appendChild(slashSpan);
      valsDiv.appendChild(totSpan);

      li.appendChild(nameSpan);
      li.appendChild(valsDiv);
      listEl.appendChild(li);
    });
  }

  function renderDashboard() {
    var income = 0, expenses = 0;
    transactions.forEach(function (tx) {
      if (!isWithinPeriod(tx.date, activePeriod)) return;
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expenses += tx.amount;
    });

    var balance = income - expenses;
    var savedPct = income > 0 ? Math.max(0, Math.min(100, Math.round((balance / income) * 100))) : 0;

    var incEl = document.getElementById("income-amount");
    var expEl = document.getElementById("expense-amount");
    var balEl = document.getElementById("balance-amount");
    var fillEl = document.getElementById("savings-bar-fill");
    var barEl = document.getElementById("savings-progressbar");

    if (incEl) incEl.textContent = formatMoney(income);
    if (expEl) expEl.textContent = formatMoney(expenses);
    if (balEl) balEl.textContent = formatMoney(balance);
    if (fillEl) fillEl.style.width = savedPct + "%";
    if (barEl) barEl.setAttribute("aria-valuenow", String(savedPct));

    renderGraphAnalysis();
    renderIncomeProgress();
  }

  function renderTransactionsTab() {
    syncContextBar();
    openSwipeCard = null;
    openSwipeDir = 0;
    var filtered = transactions.filter(function (tx) {
      if (!isWithinPeriod(tx.date, activePeriod)) return false;
      if (txFilterType === "all") return true;
      return tx.type === txFilterType;
    });
    if (txFilterType === "all") filtered = sortLatestFirst(filtered);

    var listEl = document.getElementById("transaction-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    filtered.forEach(function (tx) { listEl.appendChild(createTransactionElement(tx)); });
  }

  function render() {
    renderDashboard();
    renderTransactionsTab();
  }

  function selectPeriod(periodKey) {
    if (PERIODS.indexOf(periodKey) === -1) return;
    var prevPeriod = activePeriod;
    activePeriod = periodKey;
    saveAccountPreferences();
    if (prevPeriod !== periodKey) {
      logEditChange(activeAccount, "profile_period", "", { active_period: { from: prevPeriod, to: periodKey } });
    }
    syncActivePeriodTabs();
    render();
  }

  function stepMonth(delta) {
    var totalMonths = navYear * 12 + navMonth + delta;
    navYear = Math.floor(totalMonths / 12);
    navMonth = ((totalMonths % 12) + 12) % 12;
    clampWeekIndexToCurrentMonth();
  }

  function wireSplitPeriodTab(splitId, prevBtnId, nextBtnId, periodKey, onStep) {
    var splitEl = document.getElementById(splitId);
    var prevBtn = document.getElementById(prevBtnId);
    var nextBtn = document.getElementById(nextBtnId);

    if (splitEl) {
      splitEl.onclick = function () {
        if (activePeriod !== periodKey) {
          selectPeriod(periodKey);
        }
      };
    }

    if (prevBtn) {
      prevBtn.onclick = function (e) {
        e.stopPropagation();
        if (activePeriod !== periodKey) {
          selectPeriod(periodKey);
          return;
        }
        onStep(-1);
        selectPeriod(periodKey);
      };
    }

    if (nextBtn) {
      nextBtn.onclick = function (e) {
        e.stopPropagation();
        if (activePeriod !== periodKey) {
          selectPeriod(periodKey);
          return;
        }
        onStep(1);
        selectPeriod(periodKey);
      };
    }
  }

  function bindEvents() {
    window.addEventListener("online", function () {
      syncAllAccountsWhenOnline();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && navigator.onLine !== false) {
        syncAllAccountsWhenOnline();
      }
    });

    var acctBtn = document.getElementById("account-switch-btn");
    if (acctBtn) acctBtn.onclick = switchAccount;

    var themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.onclick = function () {
        var nextDark = !darkMode;
        applyTheme(nextDark);
        saveAccountPreferences();
        logEditChange(activeAccount, "profile_theme", "", { dark_mode: nextDark });
      };
    }

    var todayBtn = document.getElementById("tx-today-btn");
    if (todayBtn) {
      todayBtn.onclick = function () {
        jumpToToday();
      };
    }

    var openBtn = document.getElementById("open-sheet-btn");
    if (openBtn) {
      openBtn.onclick = function () {
        openSheet(null);
      };
    }

    var closeBtn = document.getElementById("close-sheet-btn");
    if (closeBtn) {
      closeBtn.onclick = function () {
        closeSheet();
      };
    }

    var backdrop = document.getElementById("sheet-backdrop");
    if (backdrop) {
      backdrop.onclick = function (e) {
        if (e.target === backdrop) closeSheet();
      };
    }

    document.addEventListener("touchstart", function (e) {
      if (!openSwipeCard) return;
      if (
        !openSwipeCard.contains(e.target) &&
        !(e.target.closest && (e.target.closest(".tx-delete-action") || e.target.closest(".tx-edit-action")))
      ) {
        resetOpenSwipe(null);
      }
    }, { passive: true });

    document.addEventListener("mousedown", function (e) {
      if (!openSwipeCard) return;
      if (
        !openSwipeCard.contains(e.target) &&
        !(e.target.closest && (e.target.closest(".tx-delete-action") || e.target.closest(".tx-edit-action")))
      ) {
        resetOpenSwipe(null);
      }
    });

    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.onclick = function () { showView(this.getAttribute("data-tab")); };
    });

    wireSplitPeriodTab("period-week-tab", "week-prev-btn", "week-next-btn", "week", function (delta) {
      var weeks = getCalendarWeeksForMonth(navYear, navMonth);
      var maxIdx = Math.max(0, weeks.length - 1);
      navWeekIndex = Math.max(0, Math.min(maxIdx, navWeekIndex + delta));
    });

    var semiBtn = document.querySelector('.period-btn[data-period="semi"]');
    if (semiBtn) {
      semiBtn.onclick = function () {
        if (activePeriod === "semi") {
          navHalf = navHalf === 0 ? 1 : 0;
        }
        selectPeriod("semi");
      };
    }

    wireSplitPeriodTab("period-month-tab", "month-prev-btn", "month-next-btn", "month", function (delta) {
      stepMonth(delta);
    });

    wireSplitPeriodTab("period-year-tab", "year-prev-btn", "year-next-btn", "year", function (delta) {
      navYear += delta;
      clampWeekIndexToCurrentMonth();
    });

    var switchBtn = document.getElementById("tx-type-switch");
    if (switchBtn) {
      switchBtn.onclick = function () {
        var idx = FILTER_CYCLE.indexOf(txFilterType);
        txFilterType = FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length];
        syncTypeSwitchButton();
        renderTransactionsTab();
      };
    }

    var recBtn = document.getElementById("recurrence-switch-btn");
    if (recBtn) {
      recBtn.onclick = function () {
        var curType = ((document.getElementById("type") || {}).value) || "expense";
        if (curType !== "expense") return;
        var curMode = sanitizeRecurrenceMode((document.getElementById("recurrence-mode") || {}).value);
        var nextIdx = (RECURRENCE_CYCLE.indexOf(curMode) + 1) % RECURRENCE_CYCLE.length;
        var nextMode = RECURRENCE_CYCLE[nextIdx];
        applyRecurrenceUI(nextMode, getDefaultRecurrenceValue(nextMode), true);
      };
    }

    var recValInp = document.getElementById("recurrence-value");
    if (recValInp) {
      recValInp.oninput = function () {
        var curMode = sanitizeRecurrenceMode((document.getElementById("recurrence-mode") || {}).value);
        if (curMode === "once") {
          this.value = "1";
        } else if (curMode === "lifetime") {
          this.value = "-";
        } else {
          this.value = String(this.value || "").replace(/[^0-9]/g, "");
        }
      };
    }

    var catSel = document.getElementById("category");
    if (catSel) {
      catSel.onchange = function () {
        var curType = ((document.getElementById("type") || {}).value) || "expense";
        if (curType === "income") {
          lastCategoryIncome = sanitizeCategory(this.value, INCOME_CATEGORIES);
          saveAccountPreferences();
        } else if (curType === "expense") {
          lastCategoryExpense = sanitizeCategory(this.value, EXPENSE_CATEGORIES);
          saveAccountPreferences();
        } else if (curType === "transfer") {
          var destSel = document.getElementById("destination");
          populateDestinationDropdown(this.value, destSel ? destSel.value : null);
          autoFillTransferAmountForSource(this.value);
        }
      };
    }

    var destSel = document.getElementById("destination");
    if (destSel) {
      destSel.onchange = function () {
        var curType = ((document.getElementById("type") || {}).value) || "expense";
        if (curType === "expense") {
          lastCategoryIncome = sanitizeCategory(this.value, INCOME_CATEGORIES);
          saveAccountPreferences();
        }
      };
    }

    document.querySelectorAll(".seg-btn").forEach(function (btn) {
      btn.onclick = function () {
        if (this.disabled || editingTxId) return;
        var t = this.getAttribute("data-type");
        var hid = document.getElementById("type");
        if (hid) hid.value = t;
        document.querySelectorAll(".seg-btn").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        syncFormFieldsForType(t, null, null, false);
        if (t !== "transfer") {
          var amtInput = document.getElementById("amount");
          if (amtInput) amtInput.value = "";
        }
      };
    });

    var amtEl = document.getElementById("amount");
    if (amtEl) amtEl.oninput = function () { this.value = formatAmountInputValue(this.value); };

    var dateInput = document.getElementById("date");
    var dateBtn = document.getElementById("date-picker-btn");
    if (dateInput) dateInput.onchange = syncDateDisplay;
    if (dateBtn && dateInput) {
      dateBtn.onclick = function () {
        if (typeof dateInput.showPicker === "function") dateInput.showPicker();
        else { dateInput.focus(); dateInput.click(); }
      };
    }

    var form = document.getElementById("transaction-form");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var t = (document.getElementById("type") || {}).value || "expense";
        var remEl = document.getElementById("remarks");
        var secondSel = document.getElementById("destination");
        var amtInput = document.getElementById("amount");
        var recModeInp = document.getElementById("recurrence-mode");
        var recValInpForm = document.getElementById("recurrence-value");

        var cat = ((document.getElementById("category") || {}).value) || (t === "income" ? INCOME_CATEGORIES[0] : "Others");
        var secondVal = secondSel ? secondSel.value : "";
        var dt = ((document.getElementById("date") || {}).value) || "";
        var amt = amtInput ? parseFormattedAmount(amtInput.value) : NaN;
        if (isNaN(amt) || amt <= 0 || !dt) return;
        if (t === "transfer" && (!secondVal || secondVal === cat)) return;

        var recMode = t === "expense"
          ? sanitizeRecurrenceMode(recModeInp ? recModeInp.value : "once")
          : "once";
        var recVal = t === "expense"
          ? (recMode === "months"
            ? String(recValInpForm ? recValInpForm.value.trim() : "")
            : getDefaultRecurrenceValue(recMode))
          : "1";

        if (t === "expense") {
          lastCategoryExpense = sanitizeCategory(cat, EXPENSE_CATEGORIES);
          if (secondVal) {
            lastCategoryIncome = sanitizeCategory(secondVal, INCOME_CATEGORIES);
          }
        } else if (t === "income") {
          lastCategoryIncome = sanitizeCategory(cat, INCOME_CATEGORIES);
        }
        saveAccountPreferences();

        var txPayload = {
          type: t,
          remarks: t === "income" ? (remEl ? remEl.value.trim() : "") : "",
          source: t === "expense" ? sanitizeCategory(secondVal, INCOME_CATEGORIES) : "",
          destination: t === "transfer" ? sanitizeCategory(secondVal, INCOME_CATEGORIES) : "",
          amount: amt,
          category: t === "income" ? sanitizeCategory(cat, INCOME_CATEGORIES) : cat,
          date: dt,
          recurrenceMode: recMode,
          recurrenceValue: recVal
        };

        var previousTx = null;

        if (editingTxId) {
          transactions = transactions.map(function (tx) {
            if (tx.id !== editingTxId) return tx;
            previousTx = tx;
            txPayload.id = tx.id;
            return txPayload;
          });
          logEditChange(activeAccount, "transaction_" + txPayload.type, txPayload.id, {
            before: previousTx,
            after: txPayload
          });
        } else {
          txPayload.id = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 7);
          transactions.unshift(txPayload);
          logHistorySave(activeAccount, txPayload);
        }

        if (txFilterType !== "all" && t !== "transfer") {
          txFilterType = t;
          syncTypeSwitchButton();
        }

        saveTransactions();
        render();
        if (remEl) remEl.value = "";
        if (amtInput) amtInput.value = "";
        applyRecurrenceUI("once", "1", true);
        closeSheet();
        showView("transactions");
      };
    }

    var widthSel = document.getElementById("frame-width-select");
    if (widthSel) {
      widthSel.onchange = function () {
        var prevDev = activeDevice;
        applyDeviceDimensions(this.value);
        saveAccountPreferences();
        logEditChange(activeAccount, "profile_device", "", { device: { from: prevDev, to: activeDevice } });
      };
    }

    var wStartSel = document.getElementById("week-start-select");
    var wEndSel = document.getElementById("week-end-select");
    if (wStartSel) {
      wStartSel.onchange = function () {
        var s = parseInt(this.value, 10);
        if (isNaN(s) || s < 0 || s > 6) s = 0;
        periodSettings.weekStart = s;
        periodSettings.weekEnd = (s + 6) % 7;
        saveAccountPreferences();
        syncPeriodSettingsUI();
        logEditChange(activeAccount, "profile_week", "", { weekStart: periodSettings.weekStart, weekEnd: periodSettings.weekEnd });
        render();
      };
    }
    if (wEndSel) {
      wEndSel.onchange = function () {
        var eDay = parseInt(this.value, 10);
        if (isNaN(eDay) || eDay < 0 || eDay > 6) eDay = 6;
        periodSettings.weekEnd = eDay;
        periodSettings.weekStart = (eDay + 1) % 7;
        saveAccountPreferences();
        syncPeriodSettingsUI();
        logEditChange(activeAccount, "profile_week", "", { weekStart: periodSettings.weekStart, weekEnd: periodSettings.weekEnd });
        render();
      };
    }

    var yStartSel = document.getElementById("year-start-select");
    var yEndSel = document.getElementById("year-end-select");
    if (yStartSel) {
      yStartSel.onchange = function () {
        var mStart = clampMonthIndex(this.value, 0);
        periodSettings.yearStart = mStart;
        periodSettings.yearEnd = (mStart + 11) % 12;
        saveAccountPreferences();
        syncPeriodSettingsUI();
        logEditChange(activeAccount, "profile_year", "", { yearStart: periodSettings.yearStart, yearEnd: periodSettings.yearEnd });
        render();
      };
    }
    if (yEndSel) {
      yEndSel.onchange = function () {
        var mEnd = clampMonthIndex(this.value, 11);
        periodSettings.yearEnd = mEnd;
        periodSettings.yearStart = (mEnd + 1) % 12;
        saveAccountPreferences();
        syncPeriodSettingsUI();
        logEditChange(activeAccount, "profile_year", "", { yearStart: periodSettings.yearStart, yearEnd: periodSettings.yearEnd });
        render();
      };
    }

    function bindDayRangeInputs(startId, endId, startKey, endKey, configTarget) {
      var sInp = document.getElementById(startId);
      var eInp = document.getElementById(endId);
      if (sInp) {
        sInp.onchange = function () {
          periodSettings[startKey] = clampDayNumber(this.value, DEFAULT_PERIOD_SETTINGS[startKey]);
          saveAccountPreferences();
          syncPeriodSettingsUI();
          logEditChange(activeAccount, configTarget, "", {
            [startKey]: periodSettings[startKey],
            [endKey]: periodSettings[endKey]
          });
          render();
        };
      }
      if (eInp) {
        eInp.onchange = function () {
          periodSettings[endKey] = clampDayNumber(this.value, DEFAULT_PERIOD_SETTINGS[endKey]);
          saveAccountPreferences();
          syncPeriodSettingsUI();
          logEditChange(activeAccount, configTarget, "", {
            [startKey]: periodSettings[startKey],
            [endKey]: periodSettings[endKey]
          });
          render();
        };
      }
    }

    bindDayRangeInputs("semi-start-input", "semi-end-input", "semiStart", "semiEnd", "profile_semi");
    bindDayRangeInputs("month-start-input", "month-end-input", "monthStart", "monthEnd", "profile_month");

    var clearAllBtn = document.getElementById("clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.onclick = openClearConfirmModal;
    }

    var clearCancelBtn = document.getElementById("clear-cancel-btn");
    if (clearCancelBtn) {
      clearCancelBtn.onclick = closeClearConfirmModal;
    }

    var clearConfirmBackdrop = document.getElementById("clear-confirm-backdrop");
    if (clearConfirmBackdrop) {
      clearConfirmBackdrop.onclick = function (e) {
        if (e.target === clearConfirmBackdrop) closeClearConfirmModal();
      };
    }

    var clearConfirmBtn = document.getElementById("clear-confirm-btn");
    if (clearConfirmBtn) {
      clearConfirmBtn.onclick = function () {
        transactions.forEach(function (tx) {
          logDeletedItem(activeAccount, tx.type, tx.id, tx);
        });
        transactions = [];
        saveTransactions();
        closeClearConfirmModal();
        render();
      };
    }
  }

  applyMaribankDailyInterest();
  applyDeviceDimensions(activeDevice);
  applyTheme(darkMode);
  syncActivePeriodTabs();
  syncAccountSwitchButton();
  syncPeriodSettingsUI();
  syncTypeSwitchButton();
  applyRecurrenceUI("once", "1", true);
  setDefaultDate();
  bindEvents();
  showView("dashboard");
  render();
  syncAllAccountsWhenOnline();
})();