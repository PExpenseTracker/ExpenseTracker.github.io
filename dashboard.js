document.addEventListener('DOMContentLoaded', async () => {
    // Supabase Configuration
    const SUPABASE_URL = 'https://ajyhxlvqjkgovcrfsnig.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_wa_eoq6Z21iTyijZgWALkg_6DXwPCWw';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const navButtons = document.querySelectorAll('.nav-btn');
    const tabViews = document.querySelectorAll('.tab-view');
    const tabTitle = document.getElementById('tabTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountSwitchSelect = document.getElementById('accountSwitchSelect');
    const profileAccountName = document.getElementById('profileAccountName');

    const openFullscreenBtn = document.getElementById('openFullscreenBtn');
    const quickTransactionForm = document.getElementById('quickTransactionForm');
    const dailyTransactionForm = document.getElementById('dailyTransactionForm');

    const descInput = document.getElementById('desc');
    const toggleBillsBtn = document.getElementById('toggleBillsDropdownBtn');
    const quickBillsDropdown = document.getElementById('quickBillsDropdown');
    const quickDueDateInput = document.getElementById('quickDueDate');
    const totalAmountInput = document.getElementById('amount');

    const dailyTypeInput = document.getElementById('dailyType');

    const splitAmountCheck = document.getElementById('splitAmountCheck');
    const amount2Row = document.getElementById('amount2Row');
    const amount1Input = document.getElementById('amount1');
    const amount2Input = document.getElementById('amount2');

    const billForm = document.getElementById('billForm');
    const billNameInput = document.getElementById('billName');
    const billsList = document.getElementById('billsList');
    const billsFilterMonth = document.getElementById('billsFilterMonth');
    const billDueDateInput = document.getElementById('billDueDate');
    const monthlyCountRow = document.getElementById('monthlyCountRow');
    const recurrenceRadios = document.querySelectorAll('input[name="recurrenceType"]');
    const recurrenceMonthsInput = document.getElementById('recurrenceMonths');

    // In-App Custom Error Modal Elements (For Insufficient Funds Popup)
    const errorModal = document.getElementById('errorModal');
    const errorMessageText = document.getElementById('errorMessageText');
    const closeErrorModalBtn = document.getElementById('closeErrorModalBtn');

    function showAppError(message) {
        if (errorMessageText && errorModal) {
            errorMessageText.textContent = message;
            errorModal.style.display = 'flex';
            errorModal.classList.add('active');
            errorModal.style.zIndex = '99999';
        } else {
            alert(message);
        }
    }

    if (closeErrorModalBtn) {
        closeErrorModalBtn.addEventListener('click', () => {
            errorModal.style.display = 'none';
            errorModal.classList.remove('active');
        });
    }

    const billModalTitle = document.getElementById('billModalTitle');
    const toggleBillEditDropdownBtn = document.getElementById('toggleBillEditDropdownBtn');
    const billEditDropdown = document.getElementById('billEditDropdown');
    const saveBillBtn = document.getElementById('saveBillBtn');
    const recurrenceSectionWrapper = document.getElementById('recurrenceSectionWrapper');

    const toBePaidModalTitle = document.getElementById('toBePaidModalTitle');
    const payBillBtn = document.getElementById('payBillBtn');

    const dailyModalTitle = document.getElementById('dailyModalTitle');
    const saveDailyBtn = document.getElementById('saveDailyBtn');

    let isEditMode = false;
    let editingBillId = null;
    let editingTxId = null;
    let isSavingBill = false;
    let spendingChartInstance = null;

    // Multi-Account Isolation state
    let currentAccount = localStorage.getItem('activeAccount') || 'Krazy Doom';
    if (accountSwitchSelect) {
        accountSwitchSelect.value = currentAccount;
        if (profileAccountName) profileAccountName.textContent = currentAccount;
    }

    const historyList = document.querySelector('#viewHistory .item-list');

    const billEntryModal = document.getElementById('billEntryModal');
    const billTxModal = document.getElementById('billTxModal');
    const dailyTxModal = document.getElementById('dailyTxModal');

    const openBillEntryModalBtn = document.getElementById('openBillEntryModalBtn');
    const openBillTxModalBtn = document.getElementById('openBillTxModalBtn');
    const openDailyTxModalBtn = document.getElementById('openDailyTxModalBtn');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');

    const profileIncomeForm = document.getElementById('profileIncomeForm');
    const editIncomeBtn = document.getElementById('editIncomeBtn');
    const saveIncomeBtn = document.getElementById('saveIncomeBtn');
    const incomeMonthSelect = document.getElementById('incomeMonth');

    const salaryInput = document.getElementById('incomeSalary');
    const extraInput = document.getElementById('incomeExtra');
    const bonusInput = document.getElementById('incomeBonus');
    const othersInput = document.getElementById('incomeOthers');

    let bills = [];
    let transactions = [];
    let monthlyIncomes = {};
    let isEditingIncome = false;

    function getTodayLocalDateStr() {
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const todayDate = new Date();
    const currentMonth = todayDate.getMonth();

    if (incomeMonthSelect) incomeMonthSelect.value = currentMonth;
    if (billsFilterMonth) billsFilterMonth.value = currentMonth;

    function formatCurrency(amount) {
        const numeric = parseFloat(amount || 0);
        return numeric.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function parseCurrencyValue(val) {
        if (!val) return 0;
        const cleaned = val.toString().replace(/,/g, '');
        return parseFloat(cleaned) || 0;
    }

    function setupCurrencyFormatting(inputElement) {
        if (!inputElement) return;

        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1] && parts[1].length > 2) value = parts[0] + '.' + parts[1].substring(0, 2);

            if (parts[0]) {
                const formattedInteger = parseInt(parts[0], 10).toLocaleString('en-US');
                e.target.value = parts.length > 1 ? `${formattedInteger}.${parts[1]}` : formattedInteger;
            } else {
                e.target.value = value;
            }
        });

        inputElement.addEventListener('blur', (e) => {
            const rawVal = parseCurrencyValue(e.target.value);
            if (rawVal > 0) {
                e.target.value = formatCurrency(rawVal);
            } else {
                e.target.value = '';
            }
        });
    }

    setupCurrencyFormatting(amount1Input);
    setupCurrencyFormatting(document.getElementById('dailyAmount'));
    setupCurrencyFormatting(document.getElementById('billAmount'));
    setupCurrencyFormatting(salaryInput);
    setupCurrencyFormatting(extraInput);
    setupCurrencyFormatting(bonusInput);
    setupCurrencyFormatting(othersInput);

    openBillEntryModalBtn.addEventListener('click', () => {
        billForm.reset();
        if (billDueDateInput) billDueDateInput.value = getTodayLocalDateStr();

        if (isEditMode) {
            billModalTitle.textContent = 'Edit Bill';
            toggleBillEditDropdownBtn.style.display = 'block';
            billNameInput.readOnly = true;
            billNameInput.placeholder = 'Select bill from dropdown...';
            recurrenceSectionWrapper.style.display = 'flex';
            saveBillBtn.textContent = 'Update Bill';
            editingBillId = null;
        } else {
            billModalTitle.textContent = 'Bills';
            toggleBillEditDropdownBtn.style.display = 'none';
            billNameInput.readOnly = false;
            billNameInput.placeholder = '';
            recurrenceSectionWrapper.style.display = 'flex';
            saveBillBtn.textContent = 'Save Bill';
            editingBillId = null;
        }
        billEntryModal.classList.add('active');
    });

    openBillTxModalBtn.addEventListener('click', () => {
        quickTransactionForm.reset();
        if (quickDueDateInput) quickDueDateInput.value = getTodayLocalDateStr();

        if (isEditMode) {
            toBePaidModalTitle.textContent = 'Edit To Be Paid';
            payBillBtn.textContent = 'Update Transaction';
        } else {
            toBePaidModalTitle.textContent = 'To Be Paid';
            payBillBtn.textContent = 'Pay Bill';
        }
        billTxModal.classList.add('active');
    });

    openDailyTxModalBtn.addEventListener('click', () => {
        dailyTransactionForm.reset();
        if (isEditMode) {
            dailyModalTitle.textContent = 'Edit Daily Transaction';
            saveDailyBtn.textContent = 'Update Transaction';
        } else {
            dailyModalTitle.textContent = 'Daily';
            saveDailyBtn.textContent = 'Save Transaction';
        }
        dailyTxModal.classList.add('active');
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.app-modal').classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('app-modal')) {
            e.target.classList.remove('active');
        }
    });

    recurrenceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'monthly') {
                monthlyCountRow.classList.add('active');
            } else {
                monthlyCountRow.classList.remove('active');
            }
        });
    });

    if (amount1Input) {
        amount1Input.addEventListener('input', () => {
            const total = parseCurrencyValue(totalAmountInput.value);
            if (splitAmountCheck.checked) {
                const amt1 = parseCurrencyValue(amount1Input.value);
                const rem = Math.max(0, total - amt1);
                amount2Input.value = rem > 0 ? formatCurrency(rem) : '0.00';
            }
        });
    }

    if (splitAmountCheck) {
        splitAmountCheck.addEventListener('change', () => {
            const total = parseCurrencyValue(totalAmountInput.value);
            if (splitAmountCheck.checked) {
                amount2Row.classList.add('active');
                const amt1 = parseCurrencyValue(amount1Input.value) || total;
                amount1Input.value = amt1 > 0 ? formatCurrency(amt1) : '';
                const rem = Math.max(0, total - amt1);
                amount2Input.value = rem > 0 ? formatCurrency(rem) : '0.00';
            } else {
                amount2Row.classList.remove('active');
                amount1Input.value = total > 0 ? formatCurrency(total) : '';
                amount2Input.value = '';
            }
        });
    }

    if (toggleBillsBtn) {
        toggleBillsBtn.addEventListener('click', () => {
            const isHidden = quickBillsDropdown.style.display === 'none';
            if (isHidden) {
                populateQuickBillsDropdown();
                quickBillsDropdown.style.display = 'block';
            } else {
                quickBillsDropdown.style.display = 'none';
            }
        });
    }

    function populateQuickBillsDropdown() {
        quickBillsDropdown.innerHTML = '';
        const targetMonth = billsFilterMonth && billsFilterMonth.value !== 'all' ? parseInt(billsFilterMonth.value) : currentMonth;

        const listToFilter = isEditMode ? bills : bills.filter(b => !b.isPaid);
        const filtered = listToFilter.filter(b => {
            const billMonth = new Date(b.dueDate).getMonth();
            return billMonth === targetMonth;
        });

        if (filtered.length === 0) {
            quickBillsDropdown.innerHTML = '<div style="padding: 8px; font-size: 11px; color: var(--text-muted); text-align: center;">No unpaid bills for this month</div>';
            return;
        }

        filtered.forEach(b => {
            const item = document.createElement('div');
            item.className = 'combobox-item';
            item.innerHTML = `<strong>${b.name}</strong> - ₱${formatCurrency(b.amount)}`;

            item.addEventListener('click', () => {
                if (isEditMode) {
                    editingTxId = b.id;
                    toBePaidModalTitle.textContent = `Edit Transaction: ${b.name}`;
                    descInput.value = b.name;
                    totalAmountInput.value = formatCurrency(b.amount);
                    if (quickDueDateInput) quickDueDateInput.value = b.dueDate;
                    payBillBtn.textContent = 'Update Transaction';
                } else {
                    editingTxId = b.id;
                    descInput.value = b.name;
                    totalAmountInput.value = formatCurrency(b.amount);
                    amount1Input.value = formatCurrency(b.amount);
                    if (splitAmountCheck.checked) {
                        amount2Input.value = '0.00';
                    }
                    if (quickDueDateInput) quickDueDateInput.value = b.dueDate;
                }
                quickBillsDropdown.style.display = 'none';
            });

            quickBillsDropdown.appendChild(item);
        });
    }

    if (toggleBillEditDropdownBtn) {
        toggleBillEditDropdownBtn.addEventListener('click', () => {
            const isHidden = billEditDropdown.style.display === 'none';
            if (isHidden) {
                populateBillEditDropdown();
                billEditDropdown.style.display = 'block';
            } else {
                billEditDropdown.style.display = 'none';
            }
        });
    }

    function populateBillEditDropdown() {
        billEditDropdown.innerHTML = '';
        if (bills.length === 0) {
            billEditDropdown.innerHTML = '<div style="padding: 8px; font-size: 11px; color: var(--text-muted); text-align: center;">No bills available to edit</div>';
            return;
        }

        const uniqueBillTypes = [];
        const seenNames = new Set();
        bills.forEach(b => {
            if (!seenNames.has(b.name.toLowerCase())) {
                seenNames.add(b.name.toLowerCase());
                uniqueBillTypes.push(b);
            }
        });

        uniqueBillTypes.forEach(b => {
            const item = document.createElement('div');
            item.className = 'combobox-item';
            item.innerHTML = `<strong>${b.name}</strong> - ₱${formatCurrency(b.amount)}`;

            item.addEventListener('click', () => {
                editingBillId = b.id;
                billNameInput.value = b.name;
                document.getElementById('billAmount').value = formatCurrency(b.amount);
                billDueDateInput.value = b.dueDate;
                if (b.recurrence) {
                    const radio = document.querySelector(`input[name="recurrenceType"][value="${b.recurrence}"]`);
                    if (radio) radio.checked = true;
                }
                saveBillBtn.textContent = 'Update Bill';
                billEditDropdown.style.display = 'none';
            });

            billEditDropdown.appendChild(item);
        });
    }

    document.addEventListener('click', (e) => {
        if (toggleBillsBtn && !toggleBillsBtn.contains(e.target) && quickBillsDropdown && !quickBillsDropdown.contains(e.target)) {
            quickBillsDropdown.style.display = 'none';
        }
        if (toggleBillEditDropdownBtn && !toggleBillEditDropdownBtn.contains(e.target) && billEditDropdown && !billEditDropdown.contains(e.target)) {
            billEditDropdown.style.display = 'none';
        }
    });

    if (billsFilterMonth) {
        billsFilterMonth.addEventListener('change', () => {
            renderBills();
        });
    }

    function updateSummaryCards() {
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);

        const balance = totalIncome - totalExpenses;

        document.getElementById('totalIncome').textContent = `+₱${formatCurrency(totalIncome)}`;
        document.getElementById('totalExpenses').textContent = `-₱${formatCurrency(totalExpenses)}`;
        document.getElementById('totalBalance').textContent = `₱${formatCurrency(balance)}`;

        updateHomeIncomeProgress();
        renderHistory();
        renderSpendingPieChart();
    }

    function updateHomeIncomeProgress() {
        const activeMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const budgeted = monthlyIncomes[activeMonth] || { salary: 0, extra: 0, bonus: 0, others: 0 };

        const getActualExpenseBySource = (categoryName) => {
            return transactions
                .filter(t => t.type === 'expense' && t.source && t.source.toLowerCase() === categoryName.toLowerCase())
                .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);
        };

        const actualSalary = getActualExpenseBySource('Salary');
        const actualExtra = getActualExpenseBySource('Extra');
        const actualBonus = getActualExpenseBySource('Bonus');
        const actualOthers = getActualExpenseBySource('Others');

        document.getElementById('homeSalaryActual').textContent = `₱${formatCurrency(actualSalary)}`;
        document.getElementById('homeSalaryBudget').textContent = `₱${formatCurrency(budgeted.salary)}`;

        document.getElementById('homeExtraActual').textContent = `₱${formatCurrency(actualExtra)}`;
        document.getElementById('homeExtraBudget').textContent = `₱${formatCurrency(budgeted.extra)}`;

        document.getElementById('homeBonusActual').textContent = `₱${formatCurrency(actualBonus)}`;
        document.getElementById('homeBonusBudget').textContent = `₱${formatCurrency(budgeted.bonus)}`;

        document.getElementById('homeOthersActual').textContent = `₱${formatCurrency(actualOthers)}`;
        document.getElementById('homeOthersBudget').textContent = `₱${formatCurrency(budgeted.others)}`;
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';

        if (transactions.length === 0) {
            historyList.innerHTML = '<li class="empty-state">No transaction history yet.</li>';
            return;
        }

        const sorted = [...transactions].reverse();
        const fragment = document.createDocumentFragment();

        sorted.forEach(t => {
            const li = document.createElement('li');
            li.className = 'bill-item-row';
            const isInc = t.type === 'income';

            let txDateStr = t.date || getTodayLocalDateStr();
            const [y, m, d] = txDateStr.split('-');
            if (y && m && d) txDateStr = `${m}/${d}/${y}`;

            // If it's a profile income, do not display the source badge pill next to it
            const isProfileIncome = t.source === 'profile_income';

            li.innerHTML = `
                <div class="bill-info">
                    <div class="bill-name-wrapper">
                        <span class="bill-name">${t.desc}</span>
                        ${isProfileIncome ? '' : `<span class="recurrence-badge">${t.source || 'General'}</span>`}
                    </div>
                    <span class="bill-date">${txDateStr} • ${t.type.toUpperCase()}</span>
                </div>
                <div class="bill-actions">
                    <span class="bill-amount" style="color: ${isInc ? 'var(--accent)' : '#ef4444'}">${isInc ? '+' : '-'}₱${formatCurrency(t.amount)}</span>
                </div>
            `;
            fragment.appendChild(li);
        });
        historyList.appendChild(fragment);
    }

    function renderSpendingPieChart() {
        const canvasEl = document.getElementById('spendingPieChart');
        if (!canvasEl) return;

        const expenseMap = {};
        transactions.filter(t => t.type === 'expense' && t.source !== 'profile_income').forEach(t => {
            const cat = t.desc || 'Other';
            expenseMap[cat] = (expenseMap[cat] || 0) + parseCurrencyValue(t.amount);
        });

        const labels = Object.keys(expenseMap);
        const dataValues = Object.values(expenseMap);

        if (spendingChartInstance) {
            spendingChartInstance.destroy();
        }

        if (labels.length === 0) {
            labels.push('No Expenses');
            dataValues.push(1);
        }

        const backgroundColors = [
            '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'
        ];

        spendingChartInstance = new Chart(canvasEl, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11,
                                family: 'inherit'
                            }
                        }
                    }
                }
            }
        });
    }

    async function loadDataFromSupabase() {
        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            const billsTable = prefix + 'bills';
            const historyTable = prefix + 'history';
            const dailyTable = prefix + 'daily';
            const profileTable = prefix + 'profile_incomes';

            const [billsRes, historyRes, dailyRes, profileRes] = await Promise.all([
                supabaseClient.from(billsTable).select('*'),
                supabaseClient.from(historyTable).select('*'),
                supabaseClient.from(dailyTable).select('*'),
                supabaseClient.from(profileTable).select('*')
            ]);

            bills = [];
            transactions = [];
            monthlyIncomes = {};

            if (billsRes.data) {
                bills = billsRes.data.map(b => ({
                    id: Number(b.id),
                    name: b.name,
                    amount: b.amount,
                    dueDate: b.due_date,
                    isPaid: b.is_paid,
                    recurrence: b.recurrence || 'one-time'
                }));
            }

            if (historyRes.data) {
                transactions = historyRes.data.map(t => ({
                    id: t.id,
                    desc: t.source === 'profile_income' ? 'Income' : t.description,
                    amount: t.amount,
                    type: t.type,
                    source: t.source,
                    date: t.date || getTodayLocalDateStr()
                }));
            }

            if (dailyRes.data) {
                dailyRes.data.forEach(d => {
                    const existsTx = transactions.some(t => t.id === d.id);
                    if (!existsTx) {
                        transactions.push({
                            id: d.id,
                            desc: d.description,
                            amount: d.amount,
                            type: d.description.toLowerCase().includes('income') ? 'income' : 'expense',
                            source: d.category,
                            date: d.date
                        });
                    }

                    const existsBill = bills.some(b => b.name.toLowerCase() === d.description.toLowerCase() && b.dueDate === d.date);
                    if (!existsBill) {
                        bills.push({
                            id: Date.now() + Math.floor(Math.random() * 100),
                            name: d.description,
                            amount: d.amount,
                            dueDate: d.date,
                            isPaid: true,
                            recurrence: 'one-time'
                        });
                    }
                });
            }

            if (profileRes.data) {
                profileRes.data.forEach(row => {
                    monthlyIncomes[row.month_index] = {
                        salary: Number(row.salary),
                        extra: Number(row.extra),
                        bonus: Number(row.bonus),
                        others: Number(row.others)
                    };
                });
            }

            loadFormForSelectedMonth();
            updateSummaryCards();
            renderBills();
        } catch (err) {
            console.error('Error fetching Supabase data:', err);
        }
    }

    function loadFormForSelectedMonth() {
        const selectedMonth = parseInt(incomeMonthSelect.value);
        let data = monthlyIncomes[selectedMonth];

        if (!data) {
            let rolloverExtra = 0;
            const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
            
            if (monthlyIncomes[prevMonth]) {
                const prev = monthlyIncomes[prevMonth];
                const prevTotalIncome = (prev.salary || 0) + (prev.extra || 0) + (prev.bonus || 0) + (prev.others || 0);
                const prevExpenses = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);
            
                const prevBalance = prevTotalIncome - prevExpenses;
                if (prevBalance > 0) rolloverExtra = prevBalance;
            }

            data = { salary: 0, extra: rolloverExtra, bonus: 0, others: 0 };
            monthlyIncomes[selectedMonth] = data;
        }

        salaryInput.value = data.salary ? formatCurrency(data.salary) : '';
        extraInput.value = data.extra ? formatCurrency(data.extra) : '';
        bonusInput.value = data.bonus ? formatCurrency(data.bonus) : '';
        othersInput.value = data.others ? formatCurrency(data.others) : '';

        setIncomeInputsEditable(false);
    }

    function setIncomeInputsEditable(editable) {
        isEditingIncome = editable;
        salaryInput.disabled = !editable;
        extraInput.disabled = !editable;
        bonusInput.disabled = !editable;
        othersInput.disabled = !editable;

        if (editable) {
            saveIncomeBtn.style.display = 'block';
            salaryInput.focus();
        } else {
            saveIncomeBtn.style.display = 'none';
        }
    }

    if (incomeMonthSelect) {
        incomeMonthSelect.addEventListener('change', () => {
            loadFormForSelectedMonth();
            updateHomeIncomeProgress();
        });
    }

    // Account Switcher Event Listener
    if (accountSwitchSelect) {
        accountSwitchSelect.addEventListener('change', async (e) => {
            currentAccount = e.target.value;
            localStorage.setItem('activeAccount', currentAccount);
            if (profileAccountName) profileAccountName.textContent = currentAccount;

            bills = [];
            transactions = [];
            monthlyIncomes = {};

            await loadDataFromSupabase();
        });
    }

    await loadDataFromSupabase();

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetViewId = btn.getAttribute('data-target');
            const targetTitle = btn.getAttribute('data-title');

            navButtons.forEach(b => b.classList.remove('active'));
            tabViews.forEach(view => view.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetViewId).classList.add('active');
            tabTitle.textContent = targetTitle;
        });
    });

    openFullscreenBtn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        tabViews.forEach(view => view.classList.remove('active'));

        document.getElementById('viewQuickEntry').classList.add('active');
        tabTitle.textContent = 'Quick Entry';
    });

    const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
    if (closeFullscreenBtn) {
        closeFullscreenBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            closeFullscreenBtn.classList.toggle('active', isEditMode);
        });
    }

    // Quick Entry Form Submission
    quickTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rawDesc = descInput.value.trim();
        const totalAmt = parseCurrencyValue(totalAmountInput.value);

        if (!rawDesc || totalAmt <= 0) return;

        const activeMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const budgeted = monthlyIncomes[activeMonth] || { salary: 0, extra: 0, bonus: 0, others: 0 };

        const getSourceAvailableBalance = (sourceName) => {
            const budgetKey = sourceName.toLowerCase();
            const totalBudget = budgeted[budgetKey] || 0;
            const totalSpent = transactions
                .filter(t => t.type === 'expense' && t.source && t.source.toLowerCase() === sourceName.toLowerCase())
                .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);
            return totalBudget - totalSpent;
        };

        const deductSource1 = document.getElementById('deductSource1').value;
        const deductSource2 = document.getElementById('deductSource2').value;

        if (splitAmountCheck.checked) {
            const amt1 = parseCurrencyValue(amount1Input.value);
            const amt2 = parseCurrencyValue(amount2Input.value);

            const avail1 = getSourceAvailableBalance(deductSource1);
            const avail2 = getSourceAvailableBalance(deductSource2);

            if (amt1 > avail1) {
                showAppError(`Insufficient funds in ${deductSource1}! Available: ₱${formatCurrency(avail1)}, Tried to deduct: ₱${formatCurrency(amt1)}`);
                return;
            }
            if (amt2 > avail2) {
                showAppError(`Insufficient funds in ${deductSource2}! Available: ₱${formatCurrency(avail2)}, Tried to deduct: ₱${formatCurrency(amt2)}`);
                return;
            }
        } else {
            const avail = getSourceAvailableBalance(deductSource1);
            if (totalAmt > avail) {
                showAppError(`Insufficient funds in ${deductSource1}! Available balance: ₱${formatCurrency(avail)}, Attempted payment: ₱${formatCurrency(totalAmt)}`);
                return;
            }
        }

        const formattedDesc = rawDesc
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        quickTransactionForm.reset();
        billTxModal.classList.remove('active');
        if (splitAmountCheck) splitAmountCheck.checked = false;
        amount2Row.classList.remove('active');
        totalAmountInput.value = '';

        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            const newTxDb = {
                id: 'hist_' + Date.now(),
                description: formattedDesc,
                amount: totalAmt,
                type: 'expense',
                source: splitAmountCheck.checked ? `${deductSource1}/${deductSource2}` : deductSource1,
                date: getTodayLocalDateStr()
            };

            transactions.push({
                id: newTxDb.id,
                desc: newTxDb.description,
                amount: newTxDb.amount,
                type: newTxDb.type,
                source: newTxDb.source,
                date: newTxDb.date
            });

            let matchingBill = null;
            if (editingTxId) {
                matchingBill = bills.find(b => b.id === editingTxId);
            }
            if (!matchingBill) {
                matchingBill = bills.find(b => b.name.toLowerCase() === formattedDesc.toLowerCase() && !b.isPaid);
            }

            if (matchingBill) {
                matchingBill.isPaid = true;
                supabaseClient.from(prefix + 'bills').update({ is_paid: true }).eq('id', matchingBill.id).then();
            }
            editingTxId = null;

            updateSummaryCards();
            renderBills();

            supabaseClient.from(prefix + 'entries').insert([newTxDb]).then();
            supabaseClient.from(prefix + 'history').insert([newTxDb]).then();
        } catch (err) {
            console.error('Error in Quick Entry submission:', err);
            showAppError('Failed to save transaction. Please check your connection.');
        }
    });

    dailyTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rawTypeInput = dailyTypeInput.value.trim();
        const amount = parseCurrencyValue(document.getElementById('dailyAmount').value);
        const category = document.getElementById('dailyCategory').value;

        if (!rawTypeInput || amount <= 0) return;

        const formattedType = rawTypeInput
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const transactionType = formattedType.toLowerCase().includes('income') ? 'income' : 'expense';
        const todayStr = getTodayLocalDateStr();
        const uniqueId = 'daily_' + Date.now();
        const safeBillId = Date.now();

        dailyTransactionForm.reset();
        dailyTxModal.classList.remove('active');

        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            const newTxDb = {
                id: uniqueId,
                description: formattedType,
                amount: amount,
                type: transactionType,
                source: category,
                date: todayStr
            };

            transactions.push({
                id: newTxDb.id,
                desc: newTxDb.description,
                amount: newTxDb.amount,
                type: newTxDb.type,
                source: newTxDb.source,
                date: newTxDb.date
            });

            const newBillDb = {
                id: safeBillId,
                name: formattedType,
                amount: amount,
                due_date: todayStr,
                is_paid: true,
                recurrence: 'one-time'
            };

            bills.push({
                id: safeBillId,
                name: newBillDb.name,
                amount: newBillDb.amount,
                dueDate: newBillDb.due_date,
                isPaid: true,
                recurrence: newBillDb.recurrence
            });

            updateSummaryCards();
            renderBills();

            supabaseClient.from(prefix + 'daily').insert([{
                id: uniqueId,
                description: formattedType,
                amount: amount,
                category: category,
                date: todayStr
            }]).then();

            supabaseClient.from(prefix + 'entries').insert([newTxDb]).then();
            supabaseClient.from(prefix + 'history').insert([newTxDb]).then();
            supabaseClient.from(prefix + 'bills').insert([newBillDb]).then();
        } catch (err) {
            console.error('Error saving Daily transaction:', err);
            showAppError('Failed to save daily transaction.');
        }
    });

    window.deleteBill = async function(billId) {
        bills = bills.filter(bill => bill.id !== billId);
        renderBills();
        const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
        supabaseClient.from(prefix + 'bills').delete().eq('id', billId).then();
    };

    function renderBills() {
        billsList.innerHTML = '';

        const filterMonthVal = billsFilterMonth ? billsFilterMonth.value : 'all';
        
        let filteredBills = bills;
        if (filterMonthVal !== 'all') {
            const targetMonth = parseInt(filterMonthVal);
            filteredBills = bills.filter(bill => {
                const billMonth = new Date(bill.dueDate).getMonth();
                return billMonth === targetMonth;
            });
        }

        if (filteredBills.length === 0) {
            billsList.innerHTML = '<li class="empty-state">No bills found for this month.</li>';
            return;
        }

        filteredBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const fragment = document.createDocumentFragment();

        filteredBills.forEach(bill => {
            const li = document.createElement('li');
            li.className = `bill-item-row ${bill.isPaid ? 'is-paid' : ''}`;
            
            const [year, month, day] = bill.dueDate.split('-');
            const formattedDate = `${month}/${day}/${year}`;
            const formattedAmount = formatCurrency(bill.amount);

            li.innerHTML = `
                <div class="bill-info">
                    <div class="bill-name-wrapper">
                        <span class="bill-name">${bill.name}</span>
                        ${bill.isPaid ? '<span class="paid-badge">Paid</span>' : ''}
                        <span class="recurrence-badge">${bill.recurrence}</span>
                    </div>
                    <span class="bill-date">Due: ${formattedDate}</span>
                </div>
                <div class="bill-actions">
                    <span class="bill-amount">-₱${formattedAmount}</span>
                    <button class="delete-bill-btn" onclick="deleteBill(${bill.id})" title="Delete Bill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
            fragment.appendChild(li);
        });
        billsList.appendChild(fragment);
    }

    billForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSavingBill) return;

        const rawName = billNameInput.value.trim();
        const amount = document.getElementById('billAmount').value;
        const startDateStr = billDueDateInput.value;
        const selectedRecurrence = document.querySelector('input[name="recurrenceType"]:checked')?.value || 'one-time';
        const monthsCount = parseInt(recurrenceMonthsInput.value) || 1;

        if (!rawName || !amount || !startDateStr) return;

        isSavingBill = true;
        billForm.reset();
        if (billDueDateInput) billDueDateInput.value = getTodayLocalDateStr();
        monthlyCountRow.classList.remove('active');
        billEntryModal.classList.remove('active');

        const formattedName = rawName
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            let datesToCreate = [startDateStr];

            if (selectedRecurrence === 'monthly') {
                let baseDate = new Date(startDateStr);
                for (let i = 1; i < monthsCount; i++) {
                    baseDate.setMonth(baseDate.getMonth() + 1);
                    datesToCreate.push(baseDate.toISOString().split('T')[0]);
                }
            } else if (selectedRecurrence === 'permanent') {
                let baseDate = new Date(startDateStr);
                for (let i = 1; i < 12; i++) {
                    baseDate.setMonth(baseDate.getMonth() + 1);
                    datesToCreate.push(baseDate.toISOString().split('T')[0]);
                }
            }

            for (let dStr of datesToCreate) {
                const safeBillId = Date.now() + Math.floor(Math.random() * 100);
                const newBillDb = {
                    id: safeBillId,
                    name: formattedName,
                    amount: parseCurrencyValue(amount),
                    due_date: dStr,
                    is_paid: false,
                    recurrence: selectedRecurrence
                };

                bills.push({
                    id: newBillDb.id,
                    name: newBillDb.name,
                    amount: newBillDb.amount,
                    dueDate: newBillDb.due_date,
                    isPaid: newBillDb.is_paid,
                    recurrence: newBillDb.recurrence
                });

                supabaseClient.from(prefix + 'bills').insert([newBillDb]).then();
            }
            renderBills();
        } catch (err) {
            console.error('Error saving bill:', err);
            showAppError('Failed to save bill schedule.');
        } finally {
            isSavingBill = false;
        }
    });

    if (editIncomeBtn) {
        editIncomeBtn.addEventListener('click', () => {
            setIncomeInputsEditable(!isEditingIncome);
        });
    }

    profileIncomeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedMonth = parseInt(incomeMonthSelect.value);
        const salary = parseCurrencyValue(salaryInput.value);
        const extra = parseCurrencyValue(extraInput.value);
        const bonus = parseCurrencyValue(bonusInput.value);
        const others = parseCurrencyValue(othersInput.value);

        monthlyIncomes[selectedMonth] = { salary, extra, bonus, others };
        const totalProfileIncome = salary + extra + bonus + others;

        setIncomeInputsEditable(false);

        transactions = transactions.filter(t => !(t.source === 'profile_income' && t.monthIndex === selectedMonth));

        if (totalProfileIncome > 0) {
            const profileTx = {
                id: 'profile_income_group_' + selectedMonth + '_' + Date.now(),
                desc: 'Income',
                amount: totalProfileIncome,
                type: 'income',
                source: 'profile_income',
                monthIndex: selectedMonth,
                date: getTodayLocalDateStr()
            };

            transactions.push(profileTx);
        }

        updateSummaryCards();

        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            
            supabaseClient.from(prefix + 'profile_incomes').upsert({
                month_index: selectedMonth,
                salary: salary,
                extra: extra,
                bonus: bonus,
                others: others,
                updated_at: new Date()
            }).then();

            await supabaseClient.from(prefix + 'history').delete().eq('source', 'profile_income');

            if (totalProfileIncome > 0) {
                await supabaseClient.from(prefix + 'history').insert([{
                    id: 'profile_income_group_' + selectedMonth,
                    description: 'Income',
                    amount: totalProfileIncome,
                    type: 'income',
                    source: 'profile_income',
                    date: getTodayLocalDateStr()
                }]);
            }
        } catch (err) {
            console.error('Error saving profile income:', err);
        }
    });

    logoutBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});