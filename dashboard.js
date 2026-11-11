document.addEventListener('DOMContentLoaded', () => {
    // Disable autocomplete globally on all input elements for extra safety against past browser history suggestions
    document.querySelectorAll('input').forEach(input => {
        input.setAttribute('autocomplete', 'off');
    });

    let supabaseClient = null;
    try {
        if (window.supabase) {
            const SUPABASE_URL = 'https://ajyhxlvqjkgovcrfsnig.supabase.co';
            const SUPABASE_KEY = 'sb_publishable_wa_eoq6Z21iTyijZgWALkg_6DXwPCWw';
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
    } catch (e) {
        console.error('Supabase initialization error:', e);
    }

    let currentAccount = localStorage.getItem('et_current_account') || 'Krazy Doom';
    
    // Helper to switch between separate account table prefixes ('doom' or 'ellie')
    function getTablePrefix() {
        return currentAccount === 'Krazy Doom' ? 'doom' : 'ellie';
    }

    let cachedTransactions = [];
    let cachedBreakdowns = [];
    let cachedBills = [];
    let cachedDailyPaid = [];

    const currentAccountTitle = document.getElementById('currentAccountTitle');
    const profileAccountName = document.getElementById('profileAccountName');
    const switchAccountBtn = document.getElementById('switchAccountBtn');

    const transactionList = document.getElementById('transactionList');
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpense');
    const itemCountEl = document.getElementById('itemCount');

    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    const cycleStartDate = document.getElementById('cycleStartDate');
    const cycleEndDate = document.getElementById('cycleEndDate');
    const paycheckTypeDropdown = document.getElementById('paycheckTypeDropdown');
    const breakdownListContainer = document.getElementById('breakdownListContainer');
    const homeIncomeAnalyticsList = document.getElementById('homeIncomeAnalyticsList');

    const breakdownModal = document.getElementById('breakdownModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveBreakdownBtn = document.getElementById('saveBreakdownBtn');
    const enableInterestCheck = document.getElementById('enableInterestCheck');
    const conditionalInterestFields = document.getElementById('conditionalInterestFields');

    const deleteBreakdownModal = document.getElementById('deleteBreakdownModal');
    const openDeleteModalBtn = document.getElementById('openDeleteModalBtn');
    const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    const confirmDeleteBreakdownBtn = document.getElementById('confirmDeleteBreakdownBtn');
    const deleteBreakdownSelect = document.getElementById('deleteBreakdownSelect');

    const btnChoiceBills = document.getElementById('btnChoiceBills');
    const btnChoiceToBePaid = document.getElementById('btnChoiceToBePaid');
    const btnChoiceDaily = document.getElementById('btnChoiceDaily');
    const btnChoiceIncome = document.getElementById('btnChoiceIncome');
    const toggleEditBillsBtn = document.getElementById('toggleEditBillsBtn');
    let isEditMode = false;
    let editingBillIndex = null;
    let editingDailyIndex = null;

    const billFormModal = document.getElementById('billFormModal');
    const closeBillFormModalBtn = document.getElementById('closeBillFormModalBtn');
    const billFormTitle = document.getElementById('billFormTitle');
    const billTypeInput = document.getElementById('billTypeInput');
    const billTypeSelect = document.getElementById('billTypeSelect');
    const billAmountInput = document.getElementById('billAmountInput');
    const billDueDateInput = document.getElementById('billDueDateInput');
    const dailyDeductWrapper = document.getElementById('dailyDeductWrapper');
    const selectDailyDeductBreakdown = document.getElementById('selectDailyDeductBreakdown');
    const saveBillBtn = document.getElementById('saveBillBtn');
    const cancelBillBtn = document.getElementById('cancelBillBtn');
    let currentBillMode = 'bill';

    const freqRadios = document.querySelectorAll('input[name="billFrequency"]');
    const monthlyDurationWrapper = document.getElementById('monthlyDurationWrapper');
    const billTotalMonthsInput = document.getElementById('billTotalMonthsInput');

    const toBePaidModal = document.getElementById('toBePaidModal');
    const closeToBePaidModalBtn = document.getElementById('closeToBePaidModalBtn');
    const selectEncodedBill = document.getElementById('selectEncodedBill');
    const paidAmountDisplay = document.getElementById('paidAmountDisplay');
    const paidDueDateDisplay = document.getElementById('paidDueDateDisplay');
    const selectDeductBreakdown = document.getElementById('selectDeductBreakdown');
    const confirmPaidBtn = document.getElementById('confirmPaidBtn');
    const cancelPaidBtn = document.getElementById('cancelPaidBtn');

    const incomeEntryModal = document.getElementById('incomeEntryModal');
    const closeIncomeModalBtn = document.getElementById('closeIncomeModalBtn');
    const selectIncomeBreakdownType = document.getElementById('selectIncomeBreakdownType');
    const incomeEntryAmount = document.getElementById('incomeEntryAmount');
    const incomeEntryDate = document.getElementById('incomeEntryDate');
    const saveIncomeEntryBtn = document.getElementById('saveIncomeEntryBtn');
    const cancelIncomeEntryBtn = document.getElementById('cancelIncomeEntryBtn');

    const upcomingBillsList = document.getElementById('upcomingBillsList');
    const dailyPaidList = document.getElementById('dailyPaidList');

    function formatCurrency(num) {
        const val = num || 0;
        return '₱' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatInputAmount(value) {
        if (!value && value !== 0) return '';
        const cleanVal = value.toString().replace(/[^\d.]/g, '');
        const parts = cleanVal.split('.');
        let integerPart = parts[0];
        if (integerPart) {
            integerPart = parseInt(integerPart, 10).toLocaleString('en-US');
        }
        let decimalPart = '';
        if (parts.length > 1) {
            decimalPart = '.' + parts[1].slice(0, 2);
        } else if (cleanVal.endsWith('.')) {
            decimalPart = '.';
        }
        return integerPart + decimalPart;
    }

    function parseInputAmount(value) {
        if (!value) return 0;
        return parseFloat(value.toString().replace(/,/g, '')) || 0;
    }

    const amountInputs = [billAmountInput, incomeEntryAmount];
    amountInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('focus', () => { input.value = input.value.replace(/,/g, ''); });
        input.addEventListener('input', () => {
            const cursorPosition = input.selectionStart;
            const oldLength = input.value.length;
            input.value = formatInputAmount(input.value);
            const diff = input.value.length - oldLength;
            try { input.setSelectionRange(Math.max(0, cursorPosition + diff), Math.max(0, cursorPosition + diff)); } catch (err) {}
        });
        input.addEventListener('blur', () => {
            const val = parseInputAmount(input.value);
            if (val > 0) {
                const parts = input.value.split('.');
                const decimals = parts.length > 1 ? '.' + parts[1].padEnd(2, '0').slice(0, 2) : '.00';
                input.value = parseInt(parts[0].replace(/,/g, ''), 10).toLocaleString('en-US') + decimals;
            }
        });
    });

    function getStorageKey(key) {
        return `et_${currentAccount}_${key}`;
    }

    // --- SUPABASE DATA FETCHERS (Using Separate Account Tables) ---
    async function fetchAllAccountDataFromSupabase() {
        if (!supabaseClient) return;
        const prefix = getTablePrefix();

        const [breakdownsRes, billsRes, dailyRes, transRes] = await Promise.all([
            supabaseClient.from(`${prefix}_breakdowns`).select('*'),
            supabaseClient.from(`${prefix}_bills`).select('*'),
            supabaseClient.from(`${prefix}_daily_paid`).select('*'),
            supabaseClient.from(`${prefix}_transactions`).select('*')
        ]);

        cachedBreakdowns = (breakdownsRes.data || []).map(b => ({
            id: b.id,
            breakdownType: b.breakdown_type,
            hasInterest: b.has_interest,
            interestRate: b.interest_rate,
            paDays: b.pa_days,
            whtaxPercent: b.whtax_percent
        }));

        cachedBills = (billsRes.data || []).map(b => ({
            id: b.id,
            type: b.type,
            amount: b.amount,
            dueDate: b.due_date,
            frequency: b.frequency,
            totalMonths: b.total_months,
            currentMonth: b.current_month
        }));

        cachedDailyPaid = (dailyRes.data || []).map(d => ({
            id: d.id,
            type: d.type,
            amount: d.amount,
            deductFrom: d.deduct_from,
            date: d.date,
            frequency: d.frequency,
            totalMonths: d.total_months,
            currentMonth: d.current_month
        }));

        cachedTransactions = transRes.data || [];
    }

    function getBreakdowns() { return cachedBreakdowns; }
    function getBills() { return cachedBills; }
    function getDailyPaid() { return cachedDailyPaid; }
    function fetchSupabaseTransactions() { return cachedTransactions; }

    // --- INTEREST & WHTAX CALCULATION HELPER ---
    function calculateInterestAndTax(currentBalance, breakdownConfig) {
        if (!breakdownConfig || !breakdownConfig.hasInterest) {
            return currentBalance;
        }
        const rate = parseFloat(breakdownConfig.interestRate) || 0;
        const days = parseFloat(breakdownConfig.paDays) || 365;
        const whtax = parseFloat(breakdownConfig.whtaxPercent) || 0;

        let dailyInterest = (currentBalance * (rate / 100)) / days;

        if (currentBalance >= 100000.00 && whtax > 0) {
            const taxAmount = dailyInterest * (whtax / 100);
            dailyInterest -= taxAmount;
        }

        return currentBalance + dailyInterest;
    }

    async function loadAccountData() {
        if (currentAccountTitle) currentAccountTitle.textContent = currentAccount;
        if (profileAccountName) profileAccountName.textContent = currentAccount;

        const savedActivePaycheck = localStorage.getItem(getStorageKey('active_paycheck')) || '1st Paycheck';
        if (paycheckTypeDropdown) paycheckTypeDropdown.value = savedActivePaycheck;

        loadDateRangeForPaycheck(savedActivePaycheck);

        await fetchAllAccountDataFromSupabase();

        renderBreakdowns();
        renderBillsAndDaily();
        updateUI();
    }

    function loadDateRangeForPaycheck(paycheckName) {
        const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};
        
        if (paycheckName === 'Monthly Paycheck') {
            const range1 = ranges['1st Paycheck'] || { start: '2026-11-06', end: '2026-11-20' };
            const range2 = ranges['2nd Paycheck'] || { start: '2026-11-21', end: '2026-12-05' };
            if (cycleStartDate) { cycleStartDate.value = range1.start; cycleStartDate.disabled = true; }
            if (cycleEndDate) { cycleEndDate.value = range2.end; cycleEndDate.disabled = true; }
            return;
        }

        if (cycleStartDate) cycleStartDate.disabled = false;
        if (cycleEndDate) cycleEndDate.disabled = false;

        if (ranges[paycheckName]) {
            if (cycleStartDate) cycleStartDate.value = ranges[paycheckName].start;
            if (cycleEndDate) cycleEndDate.value = ranges[paycheckName].end;
        } else {
            if (paycheckName === '1st Paycheck') {
                if (cycleStartDate) cycleStartDate.value = '2026-11-06';
                if (cycleEndDate) cycleEndDate.value = '2026-11-20';
            } else if (paycheckName === '2nd Paycheck') {
                if (cycleStartDate) cycleStartDate.value = '2026-11-21';
                if (cycleEndDate) cycleEndDate.value = '2026-12-05';
            }
            saveCurrentDateRange();
        }
    }

    function saveCurrentDateRange() {
        if (!paycheckTypeDropdown || !cycleStartDate || !cycleEndDate) return;
        const activePaycheck = paycheckTypeDropdown.value;
        if (activePaycheck === 'Monthly Paycheck') return;

        const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};
        ranges[activePaycheck] = {
            start: cycleStartDate.value,
            end: cycleEndDate.value
        };
        localStorage.setItem(getStorageKey('paycheck_ranges'), JSON.stringify(ranges));
        updateUI();
    }

    if (paycheckTypeDropdown) {
        paycheckTypeDropdown.addEventListener('change', async () => {
            const selected = paycheckTypeDropdown.value;
            localStorage.setItem(getStorageKey('active_paycheck'), selected);
            loadDateRangeForPaycheck(selected);
            
            renderBreakdowns();
            renderBillsAndDaily();
            updateUI();

            await fetchAllAccountDataFromSupabase();
            renderBreakdowns();
            renderBillsAndDaily();
            updateUI();
        });
    }

    function formatDateToHuman(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function renderBreakdowns() {
        if (!breakdownListContainer) return;
        const breakdowns = getBreakdowns();
        const transactions = fetchSupabaseTransactions();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
        breakdownListContainer.innerHTML = '';

        if (breakdowns.length === 0) {
            breakdownListContainer.innerHTML = `<div class="empty-state">No income breakdowns added yet. Tap '+' to add one.</div>`;
            return;
        }

        breakdowns.forEach((b) => {
            let relevantTransactions = transactions.filter(t => t.type === 'income' && t.breakdown_type === b.breakdownType);
            if (activePaycheck !== 'Monthly Paycheck') {
                relevantTransactions = relevantTransactions.filter(t => t.paycheck_type === activePaycheck);
            }

            let totalForType = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
            totalForType = calculateInterestAndTax(totalForType, b);

            const item = document.createElement('div');
            item.className = 'breakdown-item-card';
            item.innerHTML = `
                <div class="breakdown-info">
                    <span class="breakdown-title">${b.breakdownType}</span>
                </div>
                <span class="trans-amount income">${formatCurrency(totalForType)}</span>
            `;
            breakdownListContainer.appendChild(item);
        });
    }

    function renderHomeIncomeAnalytics(filteredTransactions) {
        if (!homeIncomeAnalyticsList) return;
        const breakdowns = getBreakdowns();
        homeIncomeAnalyticsList.innerHTML = '';

        if (breakdowns.length === 0) {
            homeIncomeAnalyticsList.innerHTML = `<div class="empty-state">No income breakdowns configured.</div>`;
            return;
        }

        breakdowns.forEach(b => {
            let totalIncomeForType = filteredTransactions
                .filter(t => t.type === 'income' && t.breakdown_type === b.breakdownType)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            totalIncomeForType = calculateInterestAndTax(totalIncomeForType, b);

            const totalExpenseForType = filteredTransactions
                .filter(t => t.type === 'expense' && t.breakdown_type === b.breakdownType)
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const balance = totalIncomeForType - totalExpenseForType;
            const colorClass = balance > 0 ? 'text-green' : 'text-red';

            const item = document.createElement('div');
            item.className = 'income-progress-row';
            item.innerHTML = `
                <span class="income-progress-title">${b.breakdownType}</span>
                <div class="income-progress-amounts ${colorClass}">
                    <span class="amount-val exp-val">${formatCurrency(totalExpenseForType)}</span>
                    <span class="slash-separator">/</span>
                    <span class="amount-val inc-val">${formatCurrency(totalIncomeForType)}</span>
                </div>
            `;
            homeIncomeAnalyticsList.appendChild(item);
        });
    }

    function renderBillsAndDaily() {
        const bills = getBills();
        const daily = getDailyPaid();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
        const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};

        let filteredBills = bills;

        // Strictly filter upcoming bills by active paycheck date range
        if (activePaycheck !== 'Monthly Paycheck' && ranges[activePaycheck]) {
            const range = ranges[activePaycheck];
            const startDate = new Date(range.start + 'T00:00:00');
            const endDate = new Date(range.end + 'T23:59:59');

            filteredBills = bills.filter(b => {
                if (!b.dueDate) return true;
                const dueDateObj = new Date(b.dueDate + 'T00:00:00');
                return dueDateObj >= startDate && dueDateObj <= endDate;
            });
        }

        if (upcomingBillsList) {
            upcomingBillsList.innerHTML = '';
            if (filteredBills.length === 0) {
                upcomingBillsList.innerHTML = `<div class="empty-state">No upcoming bills for ${activePaycheck}.</div>`;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                filteredBills.forEach((b) => {
                    const index = bills.findIndex(item => item.id === b.id);
                    const dueDateObj = new Date(b.dueDate);
                    dueDateObj.setHours(0, 0, 0, 0);

                    const diffTime = dueDateObj - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let colorClass = 'bill-blue';
                    if (diffDays <= 7) colorClass = 'bill-red';

                    const item = document.createElement('div');
                    item.className = `bill-item ${colorClass}`;
                    if (isEditMode) {
                        item.style.cursor = 'pointer';
                        item.title = 'Click to edit this bill';
                        item.addEventListener('click', () => { openEditBillModal(index); });
                    }

                    item.innerHTML = `
                        <div class="bill-info">
                            <span class="trans-title">${b.type}</span>
                            <span class="trans-sub">Due: ${formatDateToHuman(b.dueDate)}</span>
                        </div>
                        <span class="trans-amount ${colorClass}-amount">${formatCurrency(parseFloat(b.amount))}</span>
                    `;
                    upcomingBillsList.appendChild(item);
                });
            }
        }

        if (dailyPaidList) {
            dailyPaidList.innerHTML = '';
            if (daily.length === 0) {
                dailyPaidList.innerHTML = `<div class="empty-state">No paid bills yet.</div>`;
            } else {
                daily.forEach((d, index) => {
                    const item = document.createElement('div');
                    item.className = 'bill-item bill-green';
                    if (isEditMode) {
                        item.style.cursor = 'pointer';
                        item.title = 'Click to edit this daily record';
                        item.addEventListener('click', () => { openEditDailyModal(index); });
                    }
                    
                    let subDetails = `${d.deductFrom || 'Daily Cash'} | ${formatDateToHuman(d.date)}`;
                    if (d.frequency === 'monthly' && d.totalMonths) {
                        subDetails += ` | ${d.currentMonth || 1} of ${d.totalMonths}`;
                    }

                    item.innerHTML = `
                        <div class="bill-info">
                            <span class="trans-title">${d.type}</span>
                            <span class="trans-sub">${subDetails}</span>
                        </div>
                        <span class="trans-amount income">${formatCurrency(parseFloat(d.amount))}</span>
                    `;
                    dailyPaidList.appendChild(item);
                });
            }
        }
    }

    if (toggleEditBillsBtn) {
        toggleEditBillsBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            toggleEditBillsBtn.classList.toggle('active-edit-mode', isEditMode);
            renderBillsAndDaily();
        });
    }

    function openEditBillModal(index) {
        const bills = getBills();
        const bill = bills[index];
        if (!bill) return;

        editingBillIndex = index;
        editingDailyIndex = null;
        currentBillMode = 'bill';
        if (billFormTitle) billFormTitle.textContent = 'Edit Bill';
        if (dailyDeductWrapper) dailyDeductWrapper.classList.add('hidden');

        if (billTypeInput) billTypeInput.classList.add('hidden');
        if (billTypeSelect) {
            billTypeSelect.classList.remove('hidden');
            billTypeSelect.innerHTML = '';
            bills.forEach((b, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = b.type;
                if (idx === index) opt.selected = true;
                billTypeSelect.appendChild(opt);
            });
        }

        if (billAmountInput) billAmountInput.value = formatInputAmount(bill.amount);
        if (billDueDateInput) billDueDateInput.value = bill.dueDate;

        document.querySelectorAll('input[name="billFrequency"]').forEach(r => {
            r.checked = (r.value === bill.frequency);
        });

        if (monthlyDurationWrapper) {
            if (bill.frequency === 'monthly') {
                monthlyDurationWrapper.classList.remove('hidden');
                if (billTotalMonthsInput) billTotalMonthsInput.value = bill.totalMonths || '';
            } else {
                monthlyDurationWrapper.classList.add('hidden');
                if (billTotalMonthsInput) billTotalMonthsInput.value = '';
            }
        }

        if (billFormModal) billFormModal.classList.add('active');
    }

    function openEditDailyModal(index) {
        const daily = getDailyPaid();
        const record = daily[index];
        if (!record) return;

        editingDailyIndex = index;
        editingBillIndex = null;
        currentBillMode = 'daily';
        if (billFormTitle) billFormTitle.textContent = 'Edit Daily Expense';
        if (dailyDeductWrapper) dailyDeductWrapper.classList.remove('hidden');

        const breakdowns = getBreakdowns();
        if (selectDailyDeductBreakdown) {
            selectDailyDeductBreakdown.innerHTML = '';
            if (breakdowns.length === 0) {
                selectDailyDeductBreakdown.innerHTML = `<option value="Daily Cash">Daily Cash (No Breakdowns)</option>`;
            } else {
                breakdowns.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.breakdownType;
                    opt.textContent = b.breakdownType;
                    if (b.breakdownType === record.deductFrom) opt.selected = true;
                    selectDailyDeductBreakdown.appendChild(opt);
                });
            }
        }

        if (billTypeInput) billTypeInput.classList.add('hidden');
        if (billTypeSelect) {
            billTypeSelect.classList.remove('hidden');
            billTypeSelect.innerHTML = '';
            daily.forEach((d, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = d.type;
                if (idx === index) opt.selected = true;
                billTypeSelect.appendChild(opt);
            });
        }

        if (billAmountInput) billAmountInput.value = formatInputAmount(record.amount);
        if (billDueDateInput) billDueDateInput.value = record.date;

        document.querySelectorAll('input[name="billFrequency"]').forEach(r => {
            r.checked = (r.value === (record.frequency || 'once'));
        });

        if (monthlyDurationWrapper) {
            if (record.frequency === 'monthly') {
                monthlyDurationWrapper.classList.remove('hidden');
                if (billTotalMonthsInput) billTotalMonthsInput.value = record.totalMonths || '';
            } else {
                monthlyDurationWrapper.classList.add('hidden');
                if (billTotalMonthsInput) billTotalMonthsInput.value = '';
            }
        }

        if (billFormModal) billFormModal.classList.add('active');
    }

    if (billTypeSelect) {
        billTypeSelect.addEventListener('change', () => {
            const selectedIdx = parseInt(billTypeSelect.value);
            if (currentBillMode === 'bill') {
                const bills = getBills();
                if (!isNaN(selectedIdx) && bills[selectedIdx]) {
                    editingBillIndex = selectedIdx;
                    const b = bills[selectedIdx];
                    if (billAmountInput) billAmountInput.value = formatInputAmount(b.amount);
                    if (billDueDateInput) billDueDateInput.value = b.dueDate;

                    document.querySelectorAll('input[name="billFrequency"]').forEach(r => {
                        r.checked = (r.value === b.frequency);
                    });

                    if (monthlyDurationWrapper) {
                        if (b.frequency === 'monthly') {
                            monthlyDurationWrapper.classList.remove('hidden');
                            if (billTotalMonthsInput) billTotalMonthsInput.value = b.totalMonths || '';
                        } else {
                            monthlyDurationWrapper.classList.add('hidden');
                            if (billTotalMonthsInput) billTotalMonthsInput.value = '';
                        }
                    }
                }
            } else {
                const daily = getDailyPaid();
                if (!isNaN(selectedIdx) && daily[selectedIdx]) {
                    editingDailyIndex = selectedIdx;
                    const r = daily[selectedIdx];
                    if (billAmountInput) billAmountInput.value = formatInputAmount(r.amount);
                    if (billDueDateInput) billDueDateInput.value = r.date;
                    if (selectDailyDeductBreakdown && r.deductFrom) {
                        selectDailyDeductBreakdown.value = r.deductFrom;
                    }

                    document.querySelectorAll('input[name="billFrequency"]').forEach(rRadio => {
                        rRadio.checked = (rRadio.value === (r.frequency || 'once'));
                    });

                    if (monthlyDurationWrapper) {
                        if (r.frequency === 'monthly') {
                            monthlyDurationWrapper.classList.remove('hidden');
                            if (billTotalMonthsInput) billTotalMonthsInput.value = r.totalMonths || '';
                        } else {
                            monthlyDurationWrapper.classList.add('hidden');
                            if (billTotalMonthsInput) billTotalMonthsInput.value = '';
                        }
                    }
                }
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            const targetTab = document.getElementById(targetId);
            if (targetTab) targetTab.classList.add('active');
        });
    });

    if (switchAccountBtn) {
        switchAccountBtn.addEventListener('click', async () => {
            currentAccount = currentAccount === 'Krazy Doom' ? 'Krazy Ellie' : 'Krazy Doom';
            localStorage.setItem('et_current_account', currentAccount);
            await loadAccountData();
        });
    }

    if (openModalBtn && breakdownModal) {
        openModalBtn.addEventListener('click', () => {
            const breakdownTypeInput = document.getElementById('breakdownType');
            if (breakdownTypeInput) breakdownTypeInput.value = '';
            if (enableInterestCheck) enableInterestCheck.checked = false;
            if (conditionalInterestFields) conditionalInterestFields.classList.add('hidden');
            const interestRateEl = document.getElementById('interestRate');
            const paDaysEl = document.getElementById('paDays');
            const whtaxPercentEl = document.getElementById('whtaxPercent');
            if (interestRateEl) interestRateEl.value = '';
            if (paDaysEl) paDaysEl.value = '';
            if (whtaxPercentEl) whtaxPercentEl.value = '';
            breakdownModal.classList.add('active');
        });
    }

    if (closeModalBtn && breakdownModal) {
        closeModalBtn.addEventListener('click', () => {
            breakdownModal.classList.remove('active');
        });
    }

    if (enableInterestCheck && conditionalInterestFields) {
        enableInterestCheck.addEventListener('change', () => {
            conditionalInterestFields.classList.toggle('hidden', !enableInterestCheck.checked);
        });
    }

    // --- SAVE BREAKDOWN ---
    if (saveBreakdownBtn) {
        saveBreakdownBtn.addEventListener('click', async () => {
            const breakdownTypeInput = document.getElementById('breakdownType');
            const breakdownType = breakdownTypeInput ? breakdownTypeInput.value.trim() : '';
            const hasInterest = enableInterestCheck ? enableInterestCheck.checked : false;
            const interestRate = document.getElementById('interestRate')?.value || '0';
            const paDays = document.getElementById('paDays')?.value || '365';
            const whtaxPercent = document.getElementById('whtaxPercent')?.value || '0';
            const prefix = getTablePrefix();

            if (!breakdownType) {
                alert('Please enter a type name.');
                return;
            }

            if (supabaseClient) {
                const { error } = await supabaseClient.from(`${prefix}_breakdowns`).insert([{
                    breakdown_type: breakdownType,
                    has_interest: hasInterest,
                    interest_rate: interestRate,
                    pa_days: paDays,
                    whtax_percent: whtaxPercent
                }]);
                if (error) { alert('Error saving breakdown: ' + error.message); return; }
            }

            await fetchAllAccountDataFromSupabase();
            renderBreakdowns();
            breakdownModal.classList.remove('active');
        });
    }

    if (openDeleteModalBtn && deleteBreakdownModal) {
        openDeleteModalBtn.addEventListener('click', () => {
            const breakdowns = getBreakdowns();
            if (deleteBreakdownSelect) {
                deleteBreakdownSelect.innerHTML = '';
                if (breakdowns.length === 0) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = 'No breakdowns to delete';
                    deleteBreakdownSelect.appendChild(opt);
                } else {
                    breakdowns.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.breakdownType;
                        opt.textContent = b.breakdownType;
                        deleteBreakdownSelect.appendChild(opt);
                    });
                }
            }
            deleteBreakdownModal.classList.add('active');
        });
    }

    if (closeDeleteModalBtn && deleteBreakdownModal) {
        closeDeleteModalBtn.addEventListener('click', () => {
            deleteBreakdownModal.classList.remove('active');
        });
    }

    if (confirmDeleteBreakdownBtn) {
        confirmDeleteBreakdownBtn.addEventListener('click', async () => {
            const selectedType = deleteBreakdownSelect ? deleteBreakdownSelect.value : '';
            const prefix = getTablePrefix();
            if (!selectedType) return;

            if (supabaseClient) {
                const { error } = await supabaseClient
                    .from(`${prefix}_breakdowns`)
                    .delete()
                    .eq('breakdown_type', selectedType);

                if (error) { alert('Error deleting breakdown: ' + error.message); return; }
            }

            await fetchAllAccountDataFromSupabase();
            renderBreakdowns();
            if (deleteBreakdownModal) deleteBreakdownModal.classList.remove('active');
        });
    }

    freqRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (monthlyDurationWrapper) {
                monthlyDurationWrapper.classList.toggle('hidden', !(radio.value === 'monthly' && radio.checked));
            }
        });
    });

    if (btnChoiceBills) {
        btnChoiceBills.addEventListener('click', () => {
            currentBillMode = 'bill';
            editingBillIndex = null;
            editingDailyIndex = null;
            if (billFormTitle) billFormTitle.textContent = isEditMode ? 'Edit Bill' : 'Add Bill';
            if (dailyDeductWrapper) dailyDeductWrapper.classList.add('hidden');

            if (isEditMode) {
                const bills = getBills();
                if (bills.length > 0) {
                    if (billTypeInput) billTypeInput.classList.add('hidden');
                    if (billTypeSelect) {
                        billTypeSelect.classList.remove('hidden');
                        billTypeSelect.innerHTML = '';
                        bills.forEach((b, idx) => {
                            const opt = document.createElement('option');
                            opt.value = idx;
                            opt.textContent = b.type;
                            billTypeSelect.appendChild(opt);
                        });
                    }
                    openEditBillModal(0);
                    return;
                }
            }

            if (billTypeInput) billTypeInput.classList.remove('hidden');
            if (billTypeSelect) billTypeSelect.classList.add('hidden');

            if (billTypeInput) billTypeInput.value = '';
            if (billAmountInput) billAmountInput.value = '';
            if (billDueDateInput) billDueDateInput.value = new Date().toISOString().split('T')[0];
            
            const onceRadio = document.querySelector('input[name="billFrequency"][value="once"]');
            if (onceRadio) onceRadio.checked = true;
            if (monthlyDurationWrapper) monthlyDurationWrapper.classList.add('hidden');
            if (billTotalMonthsInput) billTotalMonthsInput.value = '';

            if (billFormModal) billFormModal.classList.add('active');
        });
    }

    if (btnChoiceDaily) {
        btnChoiceDaily.addEventListener('click', () => {
            currentBillMode = 'daily';
            editingBillIndex = null;
            editingDailyIndex = null;
            if (billFormTitle) billFormTitle.textContent = isEditMode ? 'Edit Daily Expense' : 'Add Daily Expense';
            if (dailyDeductWrapper) dailyDeductWrapper.classList.remove('hidden');

            const breakdowns = getBreakdowns();
            if (selectDailyDeductBreakdown) {
                selectDailyDeductBreakdown.innerHTML = '';
                if (breakdowns.length === 0) {
                    selectDailyDeductBreakdown.innerHTML = `<option value="Daily Cash">Daily Cash (No Breakdowns)</option>`;
                } else {
                    breakdowns.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.breakdownType;
                        opt.textContent = b.breakdownType;
                        selectDailyDeductBreakdown.appendChild(opt);
                    });
                }
            }

            if (isEditMode) {
                const daily = getDailyPaid();
                if (daily.length > 0) {
                    if (billTypeInput) billTypeInput.classList.add('hidden');
                    if (billTypeSelect) {
                        billTypeSelect.classList.remove('hidden');
                        billTypeSelect.innerHTML = '';
                        daily.forEach((d, idx) => {
                            const opt = document.createElement('option');
                            opt.value = idx;
                            opt.textContent = d.type;
                            billTypeSelect.appendChild(opt);
                        });
                    }
                    openEditDailyModal(0);
                    return;
                }
            }

            if (billTypeInput) billTypeInput.classList.remove('hidden');
            if (billTypeSelect) billTypeSelect.classList.add('hidden');

            if (billTypeInput) billTypeInput.value = '';
            if (billAmountInput) billAmountInput.value = '';
            if (billDueDateInput) billDueDateInput.value = new Date().toISOString().split('T')[0];
            
            const onceRadio = document.querySelector('input[name="billFrequency"][value="once"]');
            if (onceRadio) onceRadio.checked = true;
            if (monthlyDurationWrapper) monthlyDurationWrapper.classList.add('hidden');
            if (billTotalMonthsInput) billTotalMonthsInput.value = '';

            if (billFormModal) billFormModal.classList.add('active');
        });
    }

    if (closeBillFormModalBtn || cancelBillBtn) {
        const closeBillModal = () => { if (billFormModal) billFormModal.classList.remove('active'); };
        if (closeBillFormModalBtn) closeBillFormModalBtn.addEventListener('click', closeBillModal);
        if (cancelBillBtn) cancelBillBtn.addEventListener('click', closeBillModal);
    }

    if (saveBillBtn) {
        saveBillBtn.addEventListener('click', async () => {
            const amount = parseInputAmount(billAmountInput ? billAmountInput.value : 0);
            const dueDate = billDueDateInput ? billDueDateInput.value : new Date().toISOString().split('T')[0];
            const checkedFreq = document.querySelector('input[name="billFrequency"]:checked');
            const frequency = checkedFreq ? checkedFreq.value : 'once';
            const totalMonths = frequency === 'monthly' ? parseInt(billTotalMonthsInput ? billTotalMonthsInput.value : 1) || 1 : null;
            const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
            const prefix = getTablePrefix();

            if (currentBillMode === 'bill') {
                const bills = getBills();
                let type = '';
                if (billTypeSelect && !billTypeSelect.classList.contains('hidden')) {
                    const selectedIdx = parseInt(billTypeSelect.value);
                    if (!isNaN(selectedIdx)) editingBillIndex = selectedIdx;
                    type = bills[editingBillIndex] ? bills[editingBillIndex].type : '';
                } else {
                    type = billTypeInput ? billTypeInput.value.trim() : '';
                }

                if (!type || isNaN(amount) || amount <= 0) {
                    alert('Please enter a valid type and amount.');
                    return;
                }

                if (supabaseClient) {
                    if (editingBillIndex !== null && bills[editingBillIndex]?.id) {
                        const { error } = await supabaseClient.from(`${prefix}_bills`).update({
                            type, amount, due_date: dueDate, frequency, total_months: totalMonths
                        }).eq('id', bills[editingBillIndex].id);
                        if (error) { alert('Error updating bill: ' + error.message); return; }
                    } else {
                        const { error } = await supabaseClient.from(`${prefix}_bills`).insert([{
                            type, amount, due_date: dueDate, frequency, total_months: totalMonths, current_month: 1
                        }]);
                        if (error) { alert('Error saving bill: ' + error.message); return; }
                    }
                }
            } else {
                const daily = getDailyPaid();
                let type = '';
                const deductFrom = selectDailyDeductBreakdown ? selectDailyDeductBreakdown.value : 'Daily Cash';

                if (billTypeSelect && !billTypeSelect.classList.contains('hidden')) {
                    const selectedIdx = parseInt(billTypeSelect.value);
                    if (!isNaN(selectedIdx)) editingDailyIndex = selectedIdx;
                    type = daily[editingDailyIndex] ? daily[editingDailyIndex].type : '';
                } else {
                    type = billTypeInput ? billTypeInput.value.trim() : '';
                }

                if (!type || isNaN(amount) || amount <= 0) {
                    alert('Please enter a valid type and amount.');
                    return;
                }

                if (supabaseClient) {
                    if (editingDailyIndex !== null && daily[editingDailyIndex]?.id) {
                        const { error } = await supabaseClient.from(`${prefix}_daily_paid`).update({
                            type, amount, deduct_from: deductFrom, date: dueDate, frequency, total_months: totalMonths
                        }).eq('id', daily[editingDailyIndex].id);
                        if (error) { alert('Error updating daily expense: ' + error.message); return; }
                    } else {
                        const { error: dailyError } = await supabaseClient.from(`${prefix}_daily_paid`).insert([{
                            type, amount, deduct_from: deductFrom, date: dueDate, frequency, total_months: totalMonths, current_month: 1
                        }]);
                        if (dailyError) { alert('Error saving daily expense: ' + dailyError.message); return; }

                        const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                            description: type,
                            amount: amount,
                            type: 'expense',
                            category: 'Utilities',
                            full_date: dueDate,
                            breakdown_type: deductFrom,
                            date_label: new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            paycheck_type: activePaycheck
                        }]);
                        if (transError) { alert('Error saving transaction history: ' + transError.message); return; }
                    }
                }
            }

            editingBillIndex = null;
            editingDailyIndex = null;
            if (billFormModal) billFormModal.classList.remove('active');
            await fetchAllAccountDataFromSupabase();
            renderBillsAndDaily();
            updateUI();
        });
    }

    if (btnChoiceToBePaid) {
        btnChoiceToBePaid.addEventListener('click', () => {
            const bills = getBills();
            const breakdowns = getBreakdowns();

            if (selectEncodedBill) {
                selectEncodedBill.innerHTML = '';
                if (bills.length === 0) {
                    selectEncodedBill.innerHTML = `<option value="">No bills available</option>`;
                    if (paidAmountDisplay) paidAmountDisplay.value = '';
                    if (paidDueDateDisplay) paidDueDateDisplay.value = '';
                } else {
                    bills.forEach((b, idx) => {
                        const opt = document.createElement('option');
                        opt.value = idx;
                        opt.textContent = `${b.type} (${formatCurrency(parseFloat(b.amount))})`;
                        selectEncodedBill.appendChild(opt);
                    });
                    updateBillDetailsPreview();
                }
            }

            if (selectDeductBreakdown) {
                selectDeductBreakdown.innerHTML = '';
                if (breakdowns.length === 0) {
                    selectDeductBreakdown.innerHTML = `<option value="">No Income Breakdowns available</option>`;
                } else {
                    breakdowns.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.breakdownType;
                        opt.textContent = b.breakdownType;
                        selectDeductBreakdown.appendChild(opt);
                    });
                }
            }

            if (toBePaidModal) toBePaidModal.classList.add('active');
        });
    }

    if (selectEncodedBill) {
        selectEncodedBill.addEventListener('change', updateBillDetailsPreview);
    }

    function updateBillDetailsPreview() {
        const bills = getBills();
        const idx = selectEncodedBill ? selectEncodedBill.value : '';
        if (bills[idx]) {
            const b = bills[idx];
            if (paidAmountDisplay) paidAmountDisplay.value = formatInputAmount(b.amount);
            if (paidDueDateDisplay) paidDueDateDisplay.value = b.dueDate;
        } else {
            if (paidAmountDisplay) paidAmountDisplay.value = '';
            if (paidDueDateDisplay) paidDueDateDisplay.value = '';
        }
    }

    if (closeToBePaidModalBtn || cancelPaidBtn) {
        const closeToBePaid = () => { if (toBePaidModal) toBePaidModal.classList.remove('active'); };
        if (closeToBePaidModalBtn) closeToBePaidModalBtn.addEventListener('click', closeToBePaid);
        if (cancelPaidBtn) cancelPaidBtn.addEventListener('click', closeToBePaid);
    }

    if (confirmPaidBtn) {
        confirmPaidBtn.addEventListener('click', async () => {
            const bills = getBills();
            const idx = selectEncodedBill ? selectEncodedBill.value : '';
            const deductFrom = selectDeductBreakdown ? selectDeductBreakdown.value : '';
            const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
            const prefix = getTablePrefix();

            if (idx === '' || !bills[idx]) {
                alert('Please select a valid bill.');
                return;
            }

            const paidBill = bills[idx];
            let currentMonth = paidBill.currentMonth || 1;
            const totalMonths = paidBill.totalMonths || 1;

            if (supabaseClient) {
                const { error: dailyError } = await supabaseClient.from(`${prefix}_daily_paid`).insert([{
                    type: paidBill.type,
                    amount: paidBill.amount,
                    deduct_from: deductFrom,
                    date: paidBill.dueDate,
                    frequency: paidBill.frequency,
                    total_months: totalMonths,
                    current_month: currentMonth
                }]);
                if (dailyError) { alert('Error saving paid bill: ' + dailyError.message); return; }

                const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                    description: paidBill.type,
                    amount: parseFloat(paidBill.amount),
                    type: 'expense',
                    category: 'Utilities',
                    full_date: paidBill.dueDate,
                    breakdown_type: deductFrom,
                    date_label: new Date(paidBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    paycheck_type: activePaycheck
                }]);
                if (transError) { alert('Error saving transaction history: ' + transError.message); return; }

                if (paidBill.frequency === 'monthly' && currentMonth < totalMonths) {
                    let nextDate = new Date(paidBill.dueDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    await supabaseClient.from(`${prefix}_bills`).update({
                        current_month: currentMonth + 1,
                        due_date: nextDate.toISOString().split('T')[0]
                    }).eq('id', paidBill.id);
                } else if (paidBill.frequency === 'permanent') {
                    let nextDate = new Date(paidBill.dueDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    await supabaseClient.from(`${prefix}_bills`).update({
                        due_date: nextDate.toISOString().split('T')[0]
                    }).eq('id', paidBill.id);
                } else {
                    if (paidBill.id) {
                        await supabaseClient.from(`${prefix}_bills`).delete().eq('id', paidBill.id);
                    }
                }
            }

            if (toBePaidModal) toBePaidModal.classList.remove('active');
            await fetchAllAccountDataFromSupabase();
            renderBillsAndDaily();
            updateUI();
        });
    }

    if (btnChoiceIncome) {
        btnChoiceIncome.addEventListener('click', () => {
            const breakdowns = getBreakdowns();

            if (selectIncomeBreakdownType) {
                selectIncomeBreakdownType.innerHTML = '';
                if (breakdowns.length === 0) {
                    selectIncomeBreakdownType.innerHTML = `<option value="">No Income Breakdowns available</option>`;
                } else {
                    breakdowns.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.breakdownType;
                        opt.textContent = b.breakdownType;
                        selectIncomeBreakdownType.appendChild(opt);
                    });
                }
            }

            if (incomeEntryAmount) incomeEntryAmount.value = '';
            if (incomeEntryDate) incomeEntryDate.value = new Date().toISOString().split('T')[0];
            if (incomeEntryModal) incomeEntryModal.classList.add('active');
        });
    }

    if (closeIncomeModalBtn || cancelIncomeEntryBtn) {
        const closeIncModal = () => { if (incomeEntryModal) incomeEntryModal.classList.remove('active'); };
        if (closeIncomeModalBtn) closeIncomeModalBtn.addEventListener('click', closeIncModal);
        if (cancelIncomeEntryBtn) cancelIncomeEntryBtn.addEventListener('click', closeIncModal);
    }

    // --- SAVE INCOME ENTRY ---
    if (saveIncomeEntryBtn) {
        saveIncomeEntryBtn.addEventListener('click', async () => {
            const breakdownType = selectIncomeBreakdownType ? selectIncomeBreakdownType.value : '';
            const amount = parseInputAmount(incomeEntryAmount ? incomeEntryAmount.value : 0);
            const entryDate = incomeEntryDate ? incomeEntryDate.value : new Date().toISOString().split('T')[0];
            const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
            const prefix = getTablePrefix();

            if (!breakdownType || isNaN(amount) || amount <= 0) {
                alert('Please select a type and enter a valid amount.');
                return;
            }

            if (supabaseClient) {
                const { error: incError } = await supabaseClient.from(`${prefix}_income`).insert([{
                    breakdown_type: breakdownType,
                    amount: amount,
                    date: entryDate
                }]);
                if (incError) { alert('Error saving income: ' + incError.message); return; }

                const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                    description: `Income: ${breakdownType}`,
                    amount: amount,
                    type: 'income',
                    category: 'Salary',
                    full_date: entryDate,
                    breakdown_type: breakdownType,
                    date_label: new Date(entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    paycheck_type: activePaycheck
                }]);
                if (transError) { alert('Error saving income transaction: ' + transError.message); return; }
            }

            if (incomeEntryModal) incomeEntryModal.classList.remove('active');
            await fetchAllAccountDataFromSupabase();
            renderBreakdowns();
            updateUI();
        });
    }

    const editBtn = document.querySelector('.edit-paycheck-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            const row = e.target.closest('.settings-horizontal-row');
            if (!row) return;
            const startDate = row.querySelector('#cycleStartDate');
            const endDate = row.querySelector('#cycleEndDate');
            const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';

            if (activePaycheck === 'Monthly Paycheck') {
                alert('Monthly Paycheck dates are automatically calculated from the 1st and 2nd Paycheck ranges.');
                return;
            }

            if (startDate && endDate) {
                const isLocked = startDate.disabled;
                startDate.disabled = !isLocked;
                endDate.disabled = !isLocked;
                editBtn.textContent = isLocked ? '✓' : '✎';
                if (!startDate.disabled) startDate.focus();
            }
        });
    }

    if (cycleStartDate && cycleEndDate) {
        cycleStartDate.addEventListener('change', saveCurrentDateRange);
        cycleEndDate.addEventListener('change', saveCurrentDateRange);
    }

    window.deleteTransaction = async function(id) {
        if (!supabaseClient) return;
        const prefix = getTablePrefix();
        const { error } = await supabaseClient
            .from(`${prefix}_transactions`)
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error deleting transaction: ' + error.message);
            return;
        }
        await fetchAllAccountDataFromSupabase();
        updateUI();
    };

    function updateUI() {
        const transactions = fetchSupabaseTransactions();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';

        let filteredTransactions = [];

        if (activePaycheck === 'Monthly Paycheck') {
            filteredTransactions = transactions;
        } else {
            filteredTransactions = transactions.filter(t => t.paycheck_type === activePaycheck);
        }

        const income = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const expense = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const balance = income - expense;

        if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(balance);
        if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
        if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(expense);
        if (itemCountEl) itemCountEl.textContent = `${filteredTransactions.length} items`;

        renderBreakdowns();
        renderHomeIncomeAnalytics(filteredTransactions);

        if (transactionList) {
            transactionList.innerHTML = '';

            if (filteredTransactions.length === 0) {
                transactionList.innerHTML = `<li class="empty-state">No transactions recorded for ${activePaycheck}.</li>`;
                return;
            }

            filteredTransactions.forEach(t => {
                const li = document.createElement('li');
                li.className = `transaction-item ${t.type}`;
                
                const isIncome = t.type === 'income';
                const sign = isIncome ? '+' : '-';

                li.innerHTML = `
                    <div class="trans-info">
                        <span class="trans-title">${t.description}</span>
                        <span class="trans-sub">${t.category} • ${t.date_label || t.full_date}</span>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amount ${t.type}">${sign}${formatCurrency(t.amount)}</span>
                        <button class="delete-btn" onclick="deleteTransaction('${t.id}')">✕</button>
                    </div>
                `;
                transactionList.appendChild(li);
            });
        }
    }

    loadAccountData();
});