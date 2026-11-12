document.addEventListener('DOMContentLoaded', () => {
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
    
    function getTablePrefix() {
        return currentAccount === 'Krazy Doom' ? 'doom' : 'ellie';
    }

    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Normalizes various device date inputs (like DD/MM/YYYY or standard inputs) into strict YYYY-MM-DD ISO format
    function normalizeDateToISO(dateStr) {
        if (!dateStr) return getTodayDateString();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        const parts = dateStr.split(/[\/\.-]/);
        if (parts.length === 3 && parts[2].length === 4) {
            const year = parts[2];
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    }

    let cachedTransactions = [];
    let cachedBreakdowns = [];
    let cachedBills = [];
    let cachedDailyPaid = [];
    let expensePieChartInstance = null;

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

    let incomeTransferWrapper = document.getElementById('incomeTransferWrapper');
    if (incomeEntryModal && !incomeTransferWrapper) {
        try {
            const modalCard = incomeEntryModal.querySelector('.modal-card') || incomeEntryModal;
            incomeTransferWrapper = document.createElement('div');
            incomeTransferWrapper.id = 'incomeTransferWrapper';
            incomeTransferWrapper.className = 'form-group';
            incomeTransferWrapper.style.marginTop = '8px';
            incomeTransferWrapper.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <input type="checkbox" id="enableIncomeTransfer" style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;">
                    <label for="enableIncomeTransfer" style="font-size: 11px; font-weight: 700; color: var(--text-primary); cursor: pointer;">Transfer Money</label>
                </div>
                <div id="incomeTransferFieldsContainer" style="display: none; flex-direction: column; gap: 4px;">
                    <label style="font-size: 10px; font-weight: 700; color: var(--text-muted);">Income Destination</label>
                    <input type="text" id="incomeTransferDestinationDisplay" readonly class="line-input-field" style="width: 100%; border: 1.5px solid var(--border-light); border-radius: 8px; padding: 6px; background: #f1f5f9; font-weight: 600; color: var(--text-primary);" />
                </div>
            `;
            if (saveIncomeEntryBtn && saveIncomeEntryBtn.parentNode) {
                saveIncomeEntryBtn.parentNode.parentNode.insertBefore(incomeTransferWrapper, saveIncomeEntryBtn.parentNode);
            } else {
                modalCard.appendChild(incomeTransferWrapper);
            }
        } catch (e) {
            console.error('Income transfer wrapper injection error:', e);
        }
    }

    const enableIncomeTransfer = document.getElementById('enableIncomeTransfer');
    const incomeTransferFieldsContainer = document.getElementById('incomeTransferFieldsContainer');
    const incomeTransferDestinationDisplay = document.getElementById('incomeTransferDestinationDisplay');
    const typeLabelEl = selectIncomeBreakdownType ? selectIncomeBreakdownType.closest('.form-group')?.querySelector('label') : null;

    function populateIncomeDropdowns() {
        const breakdowns = getBreakdowns();
        const bills = getBills();
        const isTransfer = enableIncomeTransfer && enableIncomeTransfer.checked;

        if (selectIncomeBreakdownType) {
            selectIncomeBreakdownType.innerHTML = '';
            if (isTransfer) {
                if (typeLabelEl) typeLabelEl.textContent = 'TYPE';
                const matchingBills = bills.filter(b => b.type && /\bto\b/i.test(b.type));
                
                if (matchingBills.length === 0) {
                    selectIncomeBreakdownType.innerHTML = `<option value="">No bills with 'to' found</option>`;
                } else {
                    matchingBills.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.type;
                        opt.textContent = b.type;
                        selectIncomeBreakdownType.appendChild(opt);
                    });
                }
            } else {
                if (typeLabelEl) typeLabelEl.textContent = 'TYPE';
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
        }
        updateTransferDestinationSync();
    }

    function updateTransferDestinationSync() {
        const isTransfer = enableIncomeTransfer && enableIncomeTransfer.checked;
        if (!isTransfer || !selectIncomeBreakdownType || !incomeTransferDestinationDisplay) return;

        const selectedVal = selectIncomeBreakdownType.value;
        const parts = selectedVal.split(/\s+to\s+/i);
        if (parts.length > 1) {
            const destPart = parts[parts.length - 1].trim();
            incomeTransferDestinationDisplay.value = destPart;
        } else {
            incomeTransferDestinationDisplay.value = '';
        }

        const bills = getBills();
        const matchedBill = bills.find(b => b.type === selectedVal);
        if (matchedBill && incomeEntryAmount) {
            incomeEntryAmount.value = formatInputAmount(matchedBill.amount);
        }
    }

    if (enableIncomeTransfer) {
        enableIncomeTransfer.addEventListener('change', () => {
            const isTransfer = enableIncomeTransfer.checked;
            if (incomeTransferFieldsContainer) {
                incomeTransferFieldsContainer.style.display = isTransfer ? 'flex' : 'none';
            }
            populateIncomeDropdowns();
        });
    }

    if (selectIncomeBreakdownType) {
        selectIncomeBreakdownType.addEventListener('change', () => {
            const isTransfer = enableIncomeTransfer && enableIncomeTransfer.checked;
            if (isTransfer) {
                updateTransferDestinationSync();
            }
        });
    }

    const upcomingBillsList = document.getElementById('upcomingBillsList');

    let insufficientModal = document.getElementById('insufficientBalanceModal');
    if (!insufficientModal) {
        insufficientModal = document.createElement('div');
        insufficientModal.id = 'insufficientBalanceModal';
        insufficientModal.className = 'modal-overlay';
        insufficientModal.innerHTML = `
            <div class="error-modal-card">
                <div class="error-modal-icon">!</div>
                <div class="error-modal-title">Insufficient Balance</div>
                <div class="error-modal-desc" id="insufficientModalDesc">You do not have enough balance for this transaction.</div>
                <button type="button" class="error-modal-btn" id="closeInsufficientModalBtn">Okay</button>
            </div>
        `;
        document.body.appendChild(insufficientModal);
    }

    const insufficientModalDesc = document.getElementById('insufficientModalDesc');
    const closeInsufficientModalBtn = document.getElementById('closeInsufficientModalBtn');

    function showInsufficientModal(message) {
        if (insufficientModalDesc) insufficientModalDesc.textContent = message;
        insufficientModal.classList.add('active');
    }

    if (closeInsufficientModalBtn) {
        closeInsufficientModalBtn.addEventListener('click', () => {
            insufficientModal.classList.remove('active');
        });
    }

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
            dueDate: normalizeDateToISO(b.due_date),
            frequency: b.frequency,
            totalMonths: b.total_months,
            currentMonth: b.current_month
        }));

        cachedDailyPaid = (dailyRes.data || []).map(d => ({
            id: d.id,
            type: d.type,
            amount: d.amount,
            deductFrom: d.deduct_from,
            date: normalizeDateToISO(d.date),
            frequency: d.frequency,
            totalMonths: d.total_months,
            currentMonth: d.currentMonth
        }));

        cachedTransactions = (transRes.data || []).map(t => ({
            ...t,
            full_date: normalizeDateToISO(t.full_date)
        }));
    }

    function getBreakdowns() { return cachedBreakdowns; }
    function getBills() { return cachedBills; }
    function fetchSupabaseTransactions() { return cachedTransactions; }

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

    async function processPaycheckRollover(targetPaycheck) {
        if (targetPaycheck !== '2nd Paycheck' || !supabaseClient) return;
        const prefix = getTablePrefix();
        const breakdowns = getBreakdowns();
        const transactions = fetchSupabaseTransactions();

        for (const b of breakdowns) {
            const relTrans1st = transactions.filter(t => 
                t.breakdown_type && 
                t.breakdown_type.trim().toLowerCase() === b.breakdownType.trim().toLowerCase() &&
                t.paycheck_type === '1st Paycheck'
            );

            const inc1st = relTrans1st.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const finalInc1st = calculateInterestAndTax(inc1st, b);
            const exp1st = relTrans1st.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            const remainingBalance = Number((finalInc1st - exp1st).toFixed(2));

            const existingRolloverTx = transactions.find(t =>
                t.paycheck_type === '2nd Paycheck' &&
                t.category === 'Rollover' &&
                t.breakdown_type.trim().toLowerCase() === b.breakdownType.trim().toLowerCase()
            );

            const rolloverDate = cycleStartDate ? normalizeDateToISO(cycleStartDate.value) : getTodayDateString();

            if (remainingBalance > 0) {
                if (existingRolloverTx) {
                    if (Number(existingRolloverTx.amount) !== remainingBalance) {
                        await supabaseClient.from(`${prefix}_transactions`).update({
                            amount: remainingBalance
                        }).eq('id', existingRolloverTx.id);
                    }
                } else {
                    await supabaseClient.from(`${prefix}_income`).insert([{
                        breakdown_type: b.breakdownType,
                        amount: remainingBalance,
                        date: rolloverDate
                    }]);

                    await supabaseClient.from(`${prefix}_transactions`).insert([{
                        description: `Rollover from 1st Paycheck`,
                        amount: remainingBalance,
                        type: 'income',
                        category: 'Rollover',
                        full_date: rolloverDate,
                        breakdown_type: b.breakdownType,
                        date_label: formatDateToFullHuman(rolloverDate),
                        paycheck_type: targetPaycheck
                    }]);
                }
            } else if (existingRolloverTx) {
                await supabaseClient.from(`${prefix}_transactions`).delete().eq('id', existingRolloverTx.id);
            }
        }

        await fetchAllAccountDataFromSupabase();
    }

    async function loadAccountData() {
        if (currentAccountTitle) currentAccountTitle.textContent = currentAccount;
        if (profileAccountName) profileAccountName.textContent = currentAccount;

        const savedActivePaycheck = localStorage.getItem(getStorageKey('active_paycheck')) || '1st Paycheck';
        if (paycheckTypeDropdown) paycheckTypeDropdown.value = savedActivePaycheck;

        loadDateRangeForPaycheck(savedActivePaycheck);

        await fetchAllAccountDataFromSupabase();

        if (savedActivePaycheck === '2nd Paycheck') {
            await processPaycheckRollover('2nd Paycheck');
        }

        renderBreakdowns();
        renderBillsAndDaily();
        updateUI();
    }

    function loadDateRangeForPaycheck(paycheckName) {
        const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};
        
        if (paycheckName === 'Monthly Paycheck') {
            const range1 = ranges['1st Paycheck'] || { start: '2026-11-06', end: '2026-11-20' };
            const range2 = ranges['2nd Paycheck'] || { start: '2026-11-21', end: '2026-12-05' };
            if (cycleStartDate) { cycleStartDate.value = normalizeDateToISO(range1.start); cycleStartDate.disabled = true; }
            if (cycleEndDate) { cycleEndDate.value = normalizeDateToISO(range2.end); cycleEndDate.disabled = true; }
            return;
        }

        if (cycleStartDate) cycleStartDate.disabled = false;
        if (cycleEndDate) cycleEndDate.disabled = false;

        if (ranges[paycheckName]) {
            if (cycleStartDate) cycleStartDate.value = normalizeDateToISO(ranges[paycheckName].start);
            if (cycleEndDate) cycleEndDate.value = normalizeDateToISO(ranges[paycheckName].end);
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
            start: normalizeDateToISO(cycleStartDate.value),
            end: normalizeDateToISO(cycleEndDate.value)
        };
        localStorage.setItem(getStorageKey('paycheck_ranges'), JSON.stringify(ranges));
        updateUI();
    }

    if (paycheckTypeDropdown) {
        paycheckTypeDropdown.addEventListener('change', async () => {
            const selected = paycheckTypeDropdown.value;
            localStorage.setItem(getStorageKey('active_paycheck'), selected);
            loadDateRangeForPaycheck(selected);
            
            if (selected === '2nd Paycheck') {
                await processPaycheckRollover('2nd Paycheck');
            }

            await fetchAllAccountDataFromSupabase();
            renderBreakdowns();
            renderBillsAndDaily();
            updateUI();
        });
    }

    function formatDateToFullHuman(dateString) {
        if (!dateString) return '';
        const isoDate = normalizeDateToISO(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', options);
    }

    function getFilteredTransactionsForView() {
        const transactions = fetchSupabaseTransactions();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';

        if (activePaycheck === 'Monthly Paycheck') {
            return transactions.filter(t => t.category !== 'Rollover');
        } else {
            return transactions.filter(t => t.paycheck_type === activePaycheck);
        }
    }

    function renderBreakdowns() {
        if (!breakdownListContainer) return;
        const breakdowns = getBreakdowns();
        const filteredTransactions = getFilteredTransactionsForView();
        breakdownListContainer.innerHTML = '';

        if (breakdowns.length === 0) {
            breakdownListContainer.innerHTML = `<div class="empty-state">No income breakdowns added yet. Tap '+' to add one.</div>`;
            return;
        }

        breakdowns.forEach((b) => {
            let relevantTransactions = filteredTransactions.filter(t => 
                t.type === 'income' && 
                t.breakdown_type && 
                b.breakdownType && 
                t.breakdown_type.trim().toLowerCase() === b.breakdownType.trim().toLowerCase()
            );

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

    function renderBillsAndDaily() {
        const bills = getBills();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
        const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};

        let filteredBills = bills;

        if (activePaycheck !== 'Monthly Paycheck' && ranges[activePaycheck]) {
            const range = ranges[activePaycheck];
            const startDate = new Date(normalizeDateToISO(range.start) + 'T00:00:00');
            const endDate = new Date(normalizeDateToISO(range.end) + 'T23:59:59');

            filteredBills = bills.filter(b => {
                if (!b.dueDate) return true;
                const dueDateObj = new Date(normalizeDateToISO(b.dueDate) + 'T00:00:00');
                return dueDateObj >= startDate && dueDateObj <= endDate;
            });
        }

        filteredBills.sort((a, b) => {
            const dateA = a.dueDate ? normalizeDateToISO(a.dueDate) : '9999-12-31';
            const dateB = b.dueDate ? normalizeDateToISO(b.dueDate) : '9999-12-31';
            return dateA.localeCompare(dateB);
        });

        if (upcomingBillsList) {
            upcomingBillsList.innerHTML = '';
            if (filteredBills.length === 0) {
                upcomingBillsList.innerHTML = `<div class="empty-state">No upcoming bills for ${activePaycheck}.</div>`;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                filteredBills.forEach((b) => {
                    const index = bills.findIndex(item => item.id === b.id);
                    const dueDateObj = new Date(normalizeDateToISO(b.dueDate) + 'T00:00:00');

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
                            <span class="trans-sub">Due: ${formatDateToFullHuman(b.dueDate)}</span>
                        </div>
                        <span class="trans-amount ${colorClass}-amount">${formatCurrency(parseFloat(b.amount))}</span>
                    `;
                    upcomingBillsList.appendChild(item);
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
        if (billDueDateInput) billDueDateInput.value = normalizeDateToISO(bill.dueDate);

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

    let isSubmittingBreakdown = false;
    if (saveBreakdownBtn) {
        saveBreakdownBtn.addEventListener('click', async () => {
            if (isSubmittingBreakdown) return;
            isSubmittingBreakdown = true;
            saveBreakdownBtn.disabled = true;
            saveBreakdownBtn.style.opacity = '0.6';

            try {
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
            } finally {
                isSubmittingBreakdown = false;
                saveBreakdownBtn.disabled = false;
                saveBreakdownBtn.style.opacity = '1';
            }
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
            if (billDueDateInput) billDueDateInput.value = getTodayDateString();
            
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
            if (billFormTitle) billFormTitle.textContent = 'Add Daily Expense';
            if (dailyDeductWrapper) dailyDeductWrapper.classList.remove('hidden');

            const breakdowns = getBreakdowns();

            if (selectDailyDeductBreakdown) {
                selectDailyDeductBreakdown.innerHTML = '';
                if (breakdowns.length === 0) {
                    selectDailyDeductBreakdown.innerHTML = `<option value="Daily Cash">Daily Cash</option>`;
                } else {
                    breakdowns.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.breakdownType;
                        opt.textContent = b.breakdownType;
                        selectDailyDeductBreakdown.appendChild(opt);
                    });
                }
            }

            if (billTypeInput) billTypeInput.classList.remove('hidden');
            if (billTypeSelect) billTypeSelect.classList.add('hidden');

            if (billTypeInput) billTypeInput.value = '';
            if (billAmountInput) billAmountInput.value = '';
            if (billDueDateInput) billDueDateInput.value = getTodayDateString();
            
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

    let isSubmittingBill = false;
    if (saveBillBtn) {
        saveBillBtn.addEventListener('click', async () => {
            if (isSubmittingBill) return;
            isSubmittingBill = true;
            saveBillBtn.disabled = true;
            saveBillBtn.style.opacity = '0.6';

            try {
                const amount = parseInputAmount(billAmountInput ? billAmountInput.value : 0);
                const dueDate = normalizeDateToISO(billDueDateInput ? billDueDateInput.value : getTodayDateString());
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
                    const type = billTypeInput ? billTypeInput.value.trim() : '';
                    const deductFrom = selectDailyDeductBreakdown ? selectDailyDeductBreakdown.value : 'Daily Cash';

                    if (!type || isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid type and amount.');
                        return;
                    }

                    const breakdowns = getBreakdowns();
                    const transactions = fetchSupabaseTransactions();
                    const targetBreakdown = breakdowns.find(b => b.breakdownType.trim().toLowerCase() === deductFrom.trim().toLowerCase());
                    if (targetBreakdown) {
                        let relTrans = transactions.filter(t => t.breakdown_type && t.breakdown_type.trim().toLowerCase() === deductFrom.trim().toLowerCase());
                        if (activePaycheck !== 'Monthly Paycheck') {
                            relTrans = relTrans.filter(t => t.paycheck_type === activePaycheck);
                        }
                        const incTotal = relTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
                        const finalInc = calculateInterestAndTax(incTotal, targetBreakdown);
                        const expTotal = relTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
                        const currentBalance = Number((finalInc - expTotal).toFixed(2));
                        const parsedAmount = Number(amount.toFixed(2));

                        if (parsedAmount > currentBalance) {
                            showInsufficientModal(`Available balance for ${deductFrom} is ${formatCurrency(currentBalance)}, but this expense requires ${formatCurrency(amount)}.`);
                            return;
                        }
                    }

                    if (supabaseClient) {
                        const { error: dailyError } = await supabaseClient.from(`${prefix}_daily_paid`).insert([{
                            type, amount, deduct_from: deductFrom, date: dueDate, frequency, total_months: totalMonths, current_month: 1
                        }]);
                        if (dailyError) { alert('Error saving daily expense: ' + dailyError.message); return; }

                        const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                            description: type,
                            amount: amount,
                            type: 'expense',
                            category: type,
                            full_date: dueDate,
                            breakdown_type: deductFrom,
                            date_label: formatDateToFullHuman(dueDate),
                            paycheck_type: activePaycheck
                        }]);
                        if (transError) { alert('Error saving transaction history: ' + transError.message); return; }
                    }
                }

                editingBillIndex = null;
                if (billFormModal) billFormModal.classList.remove('active');
                await fetchAllAccountDataFromSupabase();
                renderBillsAndDaily();
                updateUI();
            } finally {
                isSubmittingBill = false;
                saveBillBtn.disabled = false;
                saveBillBtn.style.opacity = '1';
            }
        });
    }

    if (btnChoiceToBePaid) {
        btnChoiceToBePaid.addEventListener('click', async () => {
            const bills = getBills();
            const breakdowns = getBreakdowns();
            const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
            const ranges = JSON.parse(localStorage.getItem(getStorageKey('paycheck_ranges'))) || {};

            let filteredBills = bills;
            if (activePaycheck !== 'Monthly Paycheck' && ranges[activePaycheck]) {
                const range = ranges[activePaycheck];
                const startDate = new Date(normalizeDateToISO(range.start) + 'T00:00:00');
                const endDate = new Date(normalizeDateToISO(range.end) + 'T23:59:59');

                filteredBills = bills.filter(b => {
                    if (!b.dueDate) return true;
                    const dueDateObj = new Date(normalizeDateToISO(b.dueDate) + 'T00:00:00');
                    return dueDateObj >= startDate && dueDateObj <= endDate;
                });
            }

            filteredBills.sort((a, b) => {
                const dateA = a.dueDate ? normalizeDateToISO(a.dueDate) : '9999-12-31';
                const dateB = b.dueDate ? normalizeDateToISO(b.dueDate) : '9999-12-31';
                return dateA.localeCompare(dateB);
            });

            if (selectEncodedBill) {
                selectEncodedBill.innerHTML = '';
                if (filteredBills.length === 0) {
                    selectEncodedBill.innerHTML = `<option value="">No bills available for ${activePaycheck}</option>`;
                    if (paidAmountDisplay) paidAmountDisplay.value = '';
                    if (paidDueDateDisplay) paidDueDateDisplay.value = '';
                } else {
                    filteredBills.forEach((b) => {
                        const originalIndex = bills.findIndex(item => item.id === b.id);
                        const opt = document.createElement('option');
                        opt.value = originalIndex;
                        opt.textContent = b.type;
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
                
                if (supabaseClient) {
                    const prefix = getTablePrefix();
                    const { data } = await supabaseClient
                        .from(`${prefix}_settings`)
                        .select('value')
                        .eq('key', 'last_deduct_breakdown')
                        .maybeSingle();

                    if (data && data.value) {
                        let optionExists = Array.from(selectDeductBreakdown.options).some(opt => opt.value === data.value);
                        if (optionExists) {
                            selectDeductBreakdown.value = data.value;
                        }
                    }
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
        if (idx !== '' && bills[idx]) {
            const b = bills[idx];
            if (paidAmountDisplay) paidAmountDisplay.value = formatInputAmount(b.amount);
            if (paidDueDateDisplay) paidDueDateDisplay.value = normalizeDateToISO(b.dueDate);
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

    let isSubmittingPaid = false;
    if (confirmPaidBtn) {
        confirmPaidBtn.addEventListener('click', async () => {
            if (isSubmittingPaid) return;
            isSubmittingPaid = true;
            confirmPaidBtn.disabled = true;
            confirmPaidBtn.style.opacity = '0.6';

            try {
                const bills = getBills();
                const idx = selectEncodedBill ? selectEncodedBill.value : '';
                const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
                const prefix = getTablePrefix();

                if (idx === '' || !bills[idx]) {
                    alert('Please select a valid bill.');
                    return;
                }

                const paidBill = bills[idx];
                const billAmount = Number(paidBill.amount);
                const executionDate = getTodayDateString();

                let deductFrom = selectDeductBreakdown ? selectDeductBreakdown.value : '';
                
                if (deductFrom && supabaseClient) {
                    await supabaseClient.from(`${prefix}_settings`).upsert({
                        key: 'last_deduct_breakdown',
                        value: deductFrom
                    }, { onConflict: 'key' });
                }

                const billTypeLower = (paidBill.type || '').toLowerCase();
                if (billTypeLower.includes(' to ')) {
                    const parts = paidBill.type.split(/\s+to\s+/i);
                    if (parts.length >= 2) {
                        const sourceCandidate = parts[0].trim().toLowerCase();
                        const breakdownsList = getBreakdowns();
                        const matchedBreakdown = breakdownsList.find(b => {
                            const bType = b.breakdownType.trim().toLowerCase();
                            return bType.includes(sourceCandidate);
                        });
                        deductFrom = matchedBreakdown ? matchedBreakdown.breakdownType : parts[0].trim();
                    }
                }

                const breakdowns = getBreakdowns();
                const transactions = fetchSupabaseTransactions();
                const targetBreakdown = breakdowns.find(b => b.breakdownType.trim().toLowerCase() === deductFrom.trim().toLowerCase());
                
                if (targetBreakdown) {
                    let relTrans = transactions.filter(t => t.breakdown_type && t.breakdown_type.trim().toLowerCase() === deductFrom.trim().toLowerCase());
                    if (activePaycheck !== 'Monthly Paycheck') {
                        relTrans = relTrans.filter(t => t.paycheck_type === activePaycheck);
                    }
                    const incTotal = relTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
                    const finalInc = calculateInterestAndTax(incTotal, targetBreakdown);
                    const expTotal = relTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
                    const currentBalance = Number((finalInc - expTotal).toFixed(2));
                    const parsedBillAmount = Number(billAmount.toFixed(2));

                    if (parsedBillAmount > currentBalance) {
                        showInsufficientModal(`Available balance for ${deductFrom} is ${formatCurrency(currentBalance)}, but this bill requires ${formatCurrency(billAmount)}.`);
                        return;
                    }
                }

                let currentMonth = paidBill.currentMonth || 1;
                const totalMonths = paidBill.totalMonths || 1;

                if (supabaseClient) {
                    const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                        description: paidBill.type,
                        amount: billAmount,
                        type: 'expense',
                        category: paidBill.type,
                        full_date: executionDate,
                        breakdown_type: deductFrom,
                        date_label: formatDateToFullHuman(executionDate),
                        paycheck_type: activePaycheck
                    }]);
                    if (transError) { alert('Error saving paid bill to history: ' + transError.message); return; }

                    if (paidBill.frequency === 'monthly' && currentMonth < totalMonths) {
                        let nextDate = new Date(normalizeDateToISO(paidBill.dueDate) + 'T00:00:00');
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        await supabaseClient.from(`${prefix}_bills`).update({
                            current_month: currentMonth + 1,
                            due_date: nextDate.toISOString().split('T')[0]
                        }).eq('id', paidBill.id);
                    } else if (paidBill.frequency === 'permanent') {
                        let nextDate = new Date(normalizeDateToISO(paidBill.dueDate) + 'T00:00:00');
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
            } finally {
                isSubmittingPaid = false;
                confirmPaidBtn.disabled = false;
                confirmPaidBtn.style.opacity = '1';
            }
        });
    }

    if (btnChoiceIncome) {
        btnChoiceIncome.addEventListener('click', () => {
            if (enableIncomeTransfer) enableIncomeTransfer.checked = false;
            if (incomeTransferFieldsContainer) incomeTransferFieldsContainer.style.display = 'none';
            if (typeLabelEl) typeLabelEl.textContent = 'TYPE';
            
            populateIncomeDropdowns();

            if (incomeEntryAmount) incomeEntryAmount.value = '';
            if (incomeEntryDate) incomeEntryDate.value = getTodayDateString();
            if (incomeEntryModal) incomeEntryModal.classList.add('active');
        });
    }

    if (closeIncomeModalBtn || cancelIncomeEntryBtn) {
        const closeIncModal = () => { if (incomeEntryModal) incomeEntryModal.classList.remove('active'); };
        if (closeIncomeModalBtn) closeIncomeModalBtn.addEventListener('click', closeIncModal);
        if (cancelIncomeEntryBtn) cancelIncomeEntryBtn.addEventListener('click', closeIncModal);
    }

    let isSubmittingIncome = false;
    if (saveIncomeEntryBtn) {
        saveIncomeEntryBtn.addEventListener('click', async () => {
            if (isSubmittingIncome) return;
            isSubmittingIncome = true;
            saveIncomeEntryBtn.disabled = true;
            saveIncomeEntryBtn.style.opacity = '0.6';

            try {
                const isTransfer = enableIncomeTransfer ? enableIncomeTransfer.checked : false;
                const selectedTypeValue = selectIncomeBreakdownType ? selectIncomeBreakdownType.value : '';
                const amount = parseInputAmount(incomeEntryAmount ? incomeEntryAmount.value : 0);
                const entryDate = normalizeDateToISO(incomeEntryDate ? incomeEntryDate.value : getTodayDateString());
                const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
                const prefix = getTablePrefix();

                if (isNaN(amount) || amount <= 0) {
                    alert('Please enter a valid amount.');
                    return;
                }

                if (!selectedTypeValue) {
                    alert('Please select a valid option.');
                    return;
                }

                if (supabaseClient) {
                    if (isTransfer) {
                        const parts = selectedTypeValue.split(/\s+to\s+/i);
                        const sourceCandidate = parts.length > 1 ? parts[0].trim().toLowerCase() : '';
                        const transferTarget = incomeTransferDestinationDisplay ? incomeTransferDestinationDisplay.value.trim() : (parts.length > 1 ? parts[parts.length - 1].trim() : selectedTypeValue);

                        const breakdownsList = getBreakdowns();
                        const matchedSourceBreakdown = breakdownsList.find(b => {
                            const bType = b.breakdownType.trim().toLowerCase();
                            return bType.includes(sourceCandidate);
                        });
                        const sourceBreakdown = matchedSourceBreakdown ? matchedSourceBreakdown.breakdownType : parts[0].trim();

                        if (!sourceBreakdown || !transferTarget) {
                            alert('Could not determine source and destination from the selected transfer bill name.');
                            return;
                        }

                        const { error: incError } = await supabaseClient.from(`${prefix}_income`).insert([{
                            breakdown_type: transferTarget,
                            amount: amount,
                            date: entryDate
                        }]);
                        if (incError) { alert('Error saving income transfer: ' + incError.message); return; }

                        const { error: transIncError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                            description: `Transfer from ${sourceBreakdown}`,
                            amount: amount,
                            type: 'income',
                            category: 'Transfer',
                            full_date: entryDate,
                            breakdown_type: transferTarget,
                            date_label: formatDateToFullHuman(entryDate),
                            paycheck_type: activePaycheck
                        }]);
                        if (transIncError) { alert('Error saving transfer income transaction: ' + transIncError.message); return; }

                        const { error: transExpError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                            description: selectedTypeValue,
                            amount: amount,
                            type: 'expense',
                            category: selectedTypeValue,
                            full_date: entryDate,
                            breakdown_type: sourceBreakdown,
                            date_label: formatDateToFullHuman(entryDate),
                            paycheck_type: activePaycheck
                        }]);
                        if (transExpError) { alert('Error saving transfer expense transaction: ' + transExpError.message); return; }

                        const bills = getBills();
                        const matchedBill = bills.find(b => b.type === selectedTypeValue);
                        if (matchedBill && matchedBill.id) {
                            await supabaseClient.from(`${prefix}_bills`).delete().eq('id', matchedBill.id);
                        }
                    } else {
                        const { error: incError } = await supabaseClient.from(`${prefix}_income`).insert([{
                            breakdown_type: selectedTypeValue,
                            amount: amount,
                            date: entryDate
                        }]);
                        if (incError) { alert('Error saving income: ' + incError.message); return; }

                        const { error: transError } = await supabaseClient.from(`${prefix}_transactions`).insert([{
                            description: selectedTypeValue,
                            amount: amount,
                            type: 'income',
                            category: 'Salary',
                            full_date: entryDate,
                            breakdown_type: selectedTypeValue,
                            date_label: formatDateToFullHuman(entryDate),
                            paycheck_type: activePaycheck
                        }]);
                        if (transError) { alert('Error saving income transaction: ' + transError.message); return; }
                    }
                }

                if (incomeEntryModal) incomeEntryModal.classList.remove('active');
                await fetchAllAccountDataFromSupabase();
                renderBreakdowns();
                renderBillsAndDaily();
                updateUI();
            } finally {
                isSubmittingIncome = false;
                saveIncomeEntryBtn.disabled = false;
                saveIncomeEntryBtn.style.opacity = '1';
            }
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

    function updateUI() {
        const filteredTransactions = getFilteredTransactionsForView();
        const activePaycheck = paycheckTypeDropdown ? paycheckTypeDropdown.value : '1st Paycheck';
        const breakdowns = getBreakdowns();

        let income = 0;
        if (breakdowns.length > 0) {
            breakdowns.forEach(b => {
                let relevantTransactions = filteredTransactions.filter(t => 
                    t.type === 'income' && 
                    t.breakdown_type && 
                    b.breakdownType && 
                    t.breakdown_type.trim().toLowerCase() === b.breakdownType.trim().toLowerCase()
                );
                let totalForType = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
                income += calculateInterestAndTax(totalForType, b);
            });
        } else {
            income = filteredTransactions
                .filter(t => t.type === 'income')
                .reduce((acc, t) => acc + Number(t.amount), 0);
        }

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
        renderExpensePieChart(filteredTransactions);

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

                let cleanDescription = t.description || '';
                cleanDescription = cleanDescription.replace(/^Income:\s*/i, '');
                cleanDescription = cleanDescription.replace(/^Bills is Paid:\s*/i, '');

                const deductFrom = t.breakdown_type || (isIncome ? 'Salary' : 'Daily Cash');
                const rawDate = t.full_date || getTodayDateString();
                const datePaid = formatDateToFullHuman(rawDate);
                const recurrence = t.recurrence_label || (isIncome ? 'Once' : 'Once');

                li.innerHTML = `
                    <div class="trans-info">
                        <span class="trans-title">${cleanDescription}</span>
                        <span class="trans-sub">${deductFrom} | ${datePaid} | ${recurrence}</span>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amount ${t.type}">${sign}${formatCurrency(t.amount)}</span>
                    </div>
                `;
                transactionList.appendChild(li);
            });
        }
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
                .filter(t => 
                    t.type === 'income' && 
                    t.breakdown_type && 
                    b.breakdownType && 
                    b.breakdownType.trim().toLowerCase() === t.breakdown_type.trim().toLowerCase()
                )
                .reduce((sum, t) => sum + Number(t.amount), 0);

            totalIncomeForType = calculateInterestAndTax(totalIncomeForType, b);

            const totalExpenseForType = filteredTransactions
                .filter(t => 
                    t.type === 'expense' && 
                    t.breakdown_type && 
                    b.breakdownType && 
                    b.breakdownType.trim().toLowerCase() === t.breakdown_type.trim().toLowerCase()
                )
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

    function renderExpensePieChart(filteredTransactions) {
        const canvas = document.getElementById('expensePieChart');
        if (!canvas) return;
        
        // Expanded to 250px height
        canvas.style.width = '100%';
        canvas.style.height = '250px';
        
        const ctx = canvas.getContext('2d');

        const expenseMap = {};
        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                let cat = t.category && t.category !== 'Utilities' && t.category !== 'Transfer' 
                    ? t.category 
                    : (t.description || 'Other Bill');
                
                cat = cat.replace(/^Transfer from\s*/i, '');
                
                expenseMap[cat] = (expenseMap[cat] === undefined ? 0 : expenseMap[cat]) + Number(t.amount);
            });

        const labels = Object.keys(expenseMap);
        const data = Object.values(expenseMap);

        if (expensePieChartInstance) {
            expensePieChartInstance.destroy();
            expensePieChartInstance = null;
        }

        const container = canvas.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.style.height = '250px';
        }

        if (labels.length === 0) {
            expensePieChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['No Bills Paid'],
                    datasets: [{ 
                        data: [1], 
                        backgroundColor: ['#1e293b'],
                        borderWidth: 1 
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false },
                        tooltip: { enabled: false }
                    } 
                }
            });
            return;
        }

        expensePieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return ` ${label}: ₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                }
            }
        });
    }

    loadAccountData();
});
