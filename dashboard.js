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

    const activeRangeTitleText = document.getElementById('activeRangeTitleText');
    const rangeStartDateInput = document.getElementById('rangeStartDate');
    const rangeEndDateInput = document.getElementById('rangeEndDate');

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

    let currentAccount = localStorage.getItem('activeAccount') || 'Krazy Doom';
    if (accountSwitchSelect) {
        accountSwitchSelect.value = currentAccount;
        if (profileAccountName) profileAccountName.textContent = currentAccount;
    }

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
    const incomePaycheckTypeSelect = document.getElementById('incomePaycheckType');

    const addIncomeSourceBtn = document.getElementById('addIncomeSourceBtn');
    const removeIncomeSourceBtn = document.getElementById('removeIncomeSourceBtn');
    const incomeSourceModal = document.getElementById('incomeSourceModal');
    const deleteIncomeSourceModal = document.getElementById('deleteIncomeSourceModal');
    const customIncomeSourceForm = document.getElementById('customIncomeSourceForm');
    const deleteIncomeSourceForm = document.getElementById('deleteIncomeSourceForm');
    const customIncomeSourceNameInput = document.getElementById('customIncomeSourceName');
    const deleteIncomeSourceSelect = document.getElementById('deleteIncomeSourceSelect');
    const dynamicIncomeFieldsContainer = document.getElementById('dynamicIncomeFieldsContainer');
    const homeIncomeProgressList = document.getElementById('homeIncomeProgressList');

    const enableInterestCheck = document.getElementById('enableInterestCheck');
    const interestFieldsSlot = document.getElementById('interestFieldsSlot');

    if (enableInterestCheck && interestFieldsSlot) {
        enableInterestCheck.addEventListener('change', () => {
            interestFieldsSlot.style.display = enableInterestCheck.checked ? 'flex' : 'none';
        });
    }

    let bills = [];
    let transactions = [];
    let monthlyIncomes = {};
    let paycheckRanges = {};
    let customIncomeCategories = []; 
    let isEditingIncome = false;

    function formatDescriptionText(rawStr) {
        if (!rawStr) return '';
        return rawStr
            .trim()
            .split(' ')
            .map(word => {
                if (word.length <= 3 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    let autosaveTimer = null;
    function triggerAutosave(callback) {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(async () => {
            if (typeof callback === 'function') {
                await callback();
            }
        }, 1000);
    }

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
    if (rangeStartDateInput) rangeStartDateInput.value = getTodayLocalDateStr();
    if (rangeEndDateInput) rangeEndDateInput.value = getTodayLocalDateStr();

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
            const input = e.target;
            const originalVal = input.value;
            const selectionStart = input.selectionStart;

            const digitsBeforeCursor = originalVal.slice(0, selectionStart).replace(/[^0-9.]/g, '').length;

            let value = originalVal.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1] && parts[1].length > 2) value = parts[0] + '.' + parts[1].substring(0, 2);

            let formattedValue = value;
            if (parts[0]) {
                const formattedInteger = parseInt(parts[0], 10).toLocaleString('en-US');
                formattedValue = parts.length > 1 ? `${formattedInteger}.${parts[1]}` : formattedInteger;
            }

            input.value = formattedValue;

            let newCursorPos = 0;
            let digitsSeen = 0;

            for (let i = 0; i < formattedValue.length; i++) {
                if (/[0-9.]/.test(formattedValue[i])) {
                    digitsSeen++;
                }
                if (digitsSeen === digitsBeforeCursor) {
                    newCursorPos = i + 1;
                    break;
                }
            }

            if (digitsBeforeCursor === 0) {
                newCursorPos = 0;
            }

            input.setSelectionRange(newCursorPos, newCursorPos);
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
    setupCurrencyFormatting(totalAmountInput);
    setupCurrencyFormatting(document.getElementById('dailyAmount'));
    setupCurrencyFormatting(document.getElementById('billAmount'));

    function getCategoryName(cat) {
        return typeof cat === 'object' && cat !== null ? cat.name : cat;
    }

    function updateIncomeDropdownOptions() {
        const dropdowns = [
            document.getElementById('deductSource1'),
            document.getElementById('deductSource2'),
            document.getElementById('dailyCategory')
        ];

        dropdowns.forEach(selectEl => {
            if (!selectEl) return;
            const prevVal = selectEl.value;
            selectEl.innerHTML = '';
            customIncomeCategories.forEach(cat => {
                const cName = getCategoryName(cat);
                const opt = document.createElement('option');
                opt.value = cName;
                opt.textContent = cName;
                selectEl.appendChild(opt);
            });
            const namesList = customIncomeCategories.map(c => getCategoryName(c));
            if (namesList.includes(prevVal)) {
                selectEl.value = prevVal;
            }
        });
    }

    if (addIncomeSourceBtn) {
        addIncomeSourceBtn.addEventListener('click', () => {
            if (customIncomeSourceForm) customIncomeSourceForm.reset();
            if (interestFieldsSlot) interestFieldsSlot.style.display = 'none';
            if (incomeSourceModal) incomeSourceModal.classList.add('active');
        });
    }

    if (removeIncomeSourceBtn) {
        removeIncomeSourceBtn.addEventListener('click', () => {
            if (!deleteIncomeSourceSelect) return;
            deleteIncomeSourceSelect.innerHTML = '';
            
            if (customIncomeCategories.length === 0) {
                showAppError('No income sources to delete.');
                return;
            }

            customIncomeCategories.forEach(cat => {
                const cName = getCategoryName(cat);
                const opt = document.createElement('option');
                opt.value = cName;
                opt.textContent = cName;
                deleteIncomeSourceSelect.appendChild(opt);
            });

            if (deleteIncomeSourceModal) deleteIncomeSourceModal.classList.add('active');
        });
    }

    if (customIncomeSourceForm) {
        customIncomeSourceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const rawName = customIncomeSourceNameInput.value.trim();
            if (!rawName) return;

            const categoryName = formatDescriptionText(rawName);
            const isInterestEnabled = enableInterestCheck ? enableInterestCheck.checked : false;

            const interestConfig = isInterestEnabled ? {
                rate: parseFloat(document.getElementById('interestRate').value) || 0,
                pa: parseFloat(document.getElementById('interestPA').value) || 365,
                whtax: parseFloat(document.getElementById('interestWHTax').value) || 20
            } : null;

            const existingNames = customIncomeCategories.map(c => getCategoryName(c));
            if (!existingNames.includes(categoryName)) {
                const newCatObj = interestConfig ? { name: categoryName, interest: interestConfig } : categoryName;
                customIncomeCategories.push(newCatObj);

                addDynamicIncomeFieldUI(categoryName);
                localStorage.setItem(`custom_categories_${currentAccount}`, JSON.stringify(customIncomeCategories));
                updateIncomeDropdownOptions();
            }

            if (incomeSourceModal) incomeSourceModal.classList.remove('active');
            if (enableInterestCheck) enableInterestCheck.checked = false;
            if (interestFieldsSlot) interestFieldsSlot.style.display = 'none';

            loadFormForSelectedMonth();
            updateSummaryCards();
        });
    }

    if (deleteIncomeSourceForm) {
        deleteIncomeSourceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const categoryToRemove = deleteIncomeSourceSelect.value;
            if (!categoryToRemove) return;

            customIncomeCategories = customIncomeCategories.filter(c => getCategoryName(c) !== categoryToRemove);
            localStorage.setItem(`custom_categories_${currentAccount}`, JSON.stringify(customIncomeCategories));

            const fieldKey = categoryToRemove.toLowerCase().replace(/\s+/g, '_');
            const profileRow = document.getElementById(`row_income_${fieldKey}`);
            if (profileRow) profileRow.remove();

            const homeRow = document.getElementById(`home_progress_${fieldKey}`);
            if (homeRow) homeRow.remove();

            updateIncomeDropdownOptions();
            if (deleteIncomeSourceModal) deleteIncomeSourceModal.classList.remove('active');

            loadFormForSelectedMonth();
            updateSummaryCards();
        });
    }

    function addDynamicIncomeFieldUI(categoryName) {
        const fieldKey = categoryName.toLowerCase().replace(/\s+/g, '_');
        
        if (dynamicIncomeFieldsContainer && !document.getElementById(`row_income_${fieldKey}`)) {
            const fieldRow = document.createElement('div');
            fieldRow.className = 'form-row-horizontal draggable-row';
            fieldRow.id = `row_income_${fieldKey}`;
            fieldRow.setAttribute('draggable', 'true');
            fieldRow.dataset.category = categoryName;

            fieldRow.innerHTML = `
                <span class="drag-handle" title="Drag to reorder">☰</span>
                <label for="income_${fieldKey}" style="text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${categoryName}</label>
                <input type="text" id="income_${fieldKey}" data-category="${categoryName}" class="currency-input income-dynamic-input" placeholder="0.00" autocomplete="off" ${isEditingIncome ? '' : 'disabled'}>
                <div id="balance_income_${fieldKey}" class="income-balance-display" title="Remaining Balance">₱0.00</div>
            `;
            dynamicIncomeFieldsContainer.appendChild(fieldRow);

            const newEl = document.getElementById(`income_${fieldKey}`);
            setupCurrencyFormatting(newEl);

            newEl.addEventListener('input', () => {
                updateSummaryCards();
                triggerAutosave(async () => {
                    const selectedMonth = parseInt(incomeMonthSelect.value);
                    const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
                    if (paycheckType === 'Total Paycheck') return;

                    if (!monthlyIncomes[selectedMonth]) monthlyIncomes[selectedMonth] = {};
                    if (!monthlyIncomes[selectedMonth][paycheckType]) monthlyIncomes[selectedMonth][paycheckType] = {};

                    monthlyIncomes[selectedMonth][paycheckType][fieldKey] = parseCurrencyValue(newEl.value);

                    localStorage.setItem(`cached_incomes_${currentAccount}`, JSON.stringify(monthlyIncomes));

                    const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
                    await supabaseClient.from(prefix + 'profile_incomes').upsert({
                        month_index: selectedMonth,
                        paycheck_type: paycheckType,
                        category_data: monthlyIncomes[selectedMonth][paycheckType],
                        start_date: rangeStartDateInput ? rangeStartDateInput.value : null,
                        end_date: rangeEndDateInput ? rangeEndDateInput.value : null,
                        updated_at: new Date()
                    });
                });
            });

            fieldRow.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', categoryName);
                fieldRow.classList.add('dragging');
            });

            fieldRow.addEventListener('dragend', () => {
                fieldRow.classList.remove('dragging');
                saveNewCategoryOrder();
            });

            fieldRow.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingRow = document.querySelector('.draggable-row.dragging');
                if (!draggingRow || draggingRow === fieldRow) return;

                const bounding = fieldRow.getBoundingClientRect();
                const offset = e.clientY - bounding.top;
                const middle = bounding.height / 2;

                if (offset > middle) {
                    dynamicIncomeFieldsContainer.insertBefore(draggingRow, fieldRow.nextSibling);
                } else {
                    dynamicIncomeFieldsContainer.insertBefore(draggingRow, fieldRow);
                }
            });
        }

        if (homeIncomeProgressList && !document.getElementById(`home_${fieldKey}_Actual`)) {
            const homeProgressRow = document.createElement('div');
            homeProgressRow.className = 'progress-row';
            homeProgressRow.id = `home_progress_${fieldKey}`;
            homeProgressRow.innerHTML = `
                <span class="progress-label">${categoryName}</span>
                <div class="progress-values">
                    <span id="home_${fieldKey}_Actual">₱0.00</span>
                    <span class="progress-slash">/</span>
                    <span id="home_${fieldKey}_Budget">₱0.00</span>
                </div>
            `;
            homeIncomeProgressList.appendChild(homeProgressRow);
        }
    }

    function saveNewCategoryOrder() {
        const rows = dynamicIncomeFieldsContainer.querySelectorAll('.draggable-row');
        const newOrder = [];
        rows.forEach(row => {
            const catName = row.dataset.category;
            const originalObj = customIncomeCategories.find(c => getCategoryName(c) === catName);
            if (originalObj) newOrder.push(originalObj);
        });
        customIncomeCategories = newOrder;
        localStorage.setItem(`custom_categories_${currentAccount}`, JSON.stringify(customIncomeCategories));
        
        rows.forEach(row => {
            const cat = row.dataset.category;
            const fieldKey = cat.toLowerCase().replace(/\s+/g, '_');
            const homeRow = document.getElementById(`home_progress_${fieldKey}`);
            if (homeRow) {
                homeIncomeProgressList.appendChild(homeRow);
            }
        });
    }

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

    function setQuickTxFieldsLock(disabled) {
        if (quickDueDateInput) {
            quickDueDateInput.disabled = disabled;
        }
        if (totalAmountInput) {
            totalAmountInput.disabled = disabled;
        }
    }

    openBillTxModalBtn.addEventListener('click', () => {
        quickTransactionForm.reset();
        if (quickDueDateInput) quickDueDateInput.value = getTodayLocalDateStr();

        if (isEditMode) {
            toBePaidModalTitle.textContent = 'Edit To Be Paid';
            payBillBtn.textContent = 'Update Transaction';
            setQuickTxFieldsLock(false);
        } else {
            toBePaidModalTitle.textContent = 'To Be Paid';
            payBillBtn.textContent = 'Pay Bill';
            setQuickTxFieldsLock(true);
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
        const activeRange = getActiveDateRange();

        const listToFilter = isEditMode ? bills : bills.filter(b => !b.isPaid);
        const filtered = listToFilter.filter(b => {
            if (!activeRange.startDate || !activeRange.endDate) return true;
            const bDate = new Date(b.dueDate);
            return bDate >= new Date(activeRange.startDate) && bDate <= new Date(activeRange.endDate);
        });

        if (filtered.length === 0) {
            quickBillsDropdown.innerHTML = '<div style="padding: 8px; font-size: 11px; color: var(--text-muted); text-align: center;">No unpaid bills for this active range</div>';
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
                    setQuickTxFieldsLock(false);
                } else {
                    editingTxId = b.id;
                    descInput.value = b.name;
                    totalAmountInput.value = formatCurrency(b.amount);
                    amount1Input.value = formatCurrency(b.amount);
                    if (splitAmountCheck.checked) {
                        amount2Input.value = '0.00';
                    }
                    if (quickDueDateInput) quickDueDateInput.value = b.dueDate;
                    setQuickTxFieldsLock(true);
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

    function getActiveDateRange() {
        const selectedMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';

        if (paycheckRanges[selectedMonth] && paycheckRanges[selectedMonth][paycheckType]) {
            return paycheckRanges[selectedMonth][paycheckType];
        }
        return { startDate: null, endDate: null };
    }

    function getMonthTotalIncome(selectedMonth) {
        const mData = monthlyIncomes[selectedMonth] || {};
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';

        if (paycheckType === 'Total Paycheck') {
            const types = ['1st Paycheck', '2nd Paycheck'];
            let sum = 0;
            types.forEach(type => {
                const entry = mData[type] || {};
                Object.keys(entry).forEach(k => {
                    sum += (entry[k] || 0);
                });
            });
            return sum;
        }

        const entry = mData[paycheckType] || {};
        let sum = 0;
        Object.keys(entry).forEach(k => {
            sum += (entry[k] || 0);
        });
        return sum;
    }

    function updateSummaryCards() {
        let totalIncome = 0;
        const selectedMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        const activeRange = getActiveDateRange();

        if (activeRangeTitleText) {
            activeRangeTitleText.textContent = paycheckType;
        }

        if (isEditingIncome && paycheckType !== 'Total Paycheck') {
            let s = 0;
            const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
            dynamicInputs.forEach(inp => {
                s += parseCurrencyValue(inp.value);
            });
            totalIncome = s;
        } else {
            totalIncome = getMonthTotalIncome(selectedMonth);
        }

        const totalPaidExpenses = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (!t.date) return false;
                if (paycheckType !== 'Total Paycheck' && activeRange.startDate && activeRange.endDate) {
                    return t.date >= activeRange.startDate && t.date <= activeRange.endDate;
                }
                if (paycheckType === 'Total Paycheck') return true;
                const txMonth = new Date(t.date).getMonth();
                return txMonth === selectedMonth;
            })
            .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);

        const balanceValue = totalIncome - totalPaidExpenses;
        const balanceEl = document.getElementById('totalBalance');

        document.getElementById('totalIncome').textContent = `+₱${formatCurrency(totalIncome)}`;
        document.getElementById('totalExpenses').textContent = `-₱${formatCurrency(totalPaidExpenses)}`;
        
        if (balanceValue < 0) {
            balanceEl.textContent = `-₱${formatCurrency(Math.abs(balanceValue))}`;
            balanceEl.style.color = '#ef4444';
        } else {
            balanceEl.textContent = `₱${formatCurrency(balanceValue)}`;
            balanceEl.style.color = 'var(--text-primary)';
        }

        updateHomeIncomeProgress();
        updateIncomeCategoryBalances();
        renderBills();
    }

    if (rangeStartDateInput && rangeEndDateInput) {
        [rangeStartDateInput, rangeEndDateInput].forEach(dateInput => {
            dateInput.addEventListener('change', () => {
                const selectedMonth = parseInt(incomeMonthSelect.value);
                const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
                if (paycheckType === 'Total Paycheck') return;

                if (!paycheckRanges[selectedMonth]) paycheckRanges[selectedMonth] = {};
                paycheckRanges[selectedMonth][paycheckType] = {
                    startDate: rangeStartDateInput.value,
                    endDate: rangeEndDateInput.value
                };

                localStorage.setItem(`cached_ranges_${currentAccount}`, JSON.stringify(paycheckRanges));
                updateSummaryCards();
                renderBills();

                triggerAutosave(async () => {
                    const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
                    await supabaseClient.from(prefix + 'profile_incomes').upsert({
                        month_index: selectedMonth,
                        paycheck_type: paycheckType,
                        category_data: monthlyIncomes[selectedMonth]?.[paycheckType] || {},
                        start_date: rangeStartDateInput.value,
                        end_date: rangeEndDateInput.value,
                        updated_at: new Date()
                    });
                });
            });
        });
    }

    function updateHomeIncomeProgress() {
        const activeMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        const mData = monthlyIncomes[activeMonth] || {};
        const activeRange = getActiveDateRange();
        
        const budgeted = {};
        const types = paycheckType === 'Total Paycheck' ? ['1st Paycheck', '2nd Paycheck', 'Monthly Paycheck'] : [paycheckType];

        types.forEach(t => {
            const entry = mData[t] || {};
            Object.keys(entry).forEach(k => {
                budgeted[k] = (budgeted[k] || 0) + (entry[k] || 0);
            });
        });

        const getActualExpenseBySource = (categoryName) => {
            return transactions
                .filter(t => {
                    if (t.type !== 'expense' || !t.source || t.source.toLowerCase() !== categoryName.toLowerCase()) return false;
                    if (!t.date) return false;
                    if (paycheckType !== 'Total Paycheck' && activeRange.startDate && activeRange.endDate) {
                        return t.date >= activeRange.startDate && t.date <= activeRange.endDate;
                    }
                    if (paycheckType === 'Total Paycheck') return true;
                    const txMonth = new Date(t.date).getMonth();
                    return txMonth === activeMonth;
                })
                .reduce((sum, t) => sum + parseCurrencyValue(t.amount), 0);
        };

        customIncomeCategories.forEach(cat => {
            const catName = getCategoryName(cat);
            const fieldKey = catName.toLowerCase().replace(/\s+/g, '_');
            const actualEl = document.getElementById(`home_${fieldKey}_Actual`);
            const budgetEl = document.getElementById(`home_${fieldKey}_Budget`);
            if (actualEl && budgetEl) {
                actualEl.textContent = `₱${formatCurrency(getActualExpenseBySource(catName))}`;
                budgetEl.textContent = `₱${formatCurrency(budgeted[fieldKey] || 0)}`;
            }
        });
    }

    function updateIncomeCategoryBalances() {
        const activeMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        const activeRange = getActiveDateRange();

        customIncomeCategories.forEach(cat => {
            const catName = getCategoryName(cat);
            const fieldKey = catName.toLowerCase().replace(/\s+/g, '_');
            const inputEl = document.getElementById(`income_${fieldKey}`);
            const balanceEl = document.getElementById(`balance_income_${fieldKey}`);

            if (inputEl && balanceEl) {
                const encodedAmount = parseCurrencyValue(inputEl.value);

                const totalDeducted = transactions
                    .filter(t => {
                        if (t.type !== 'expense' || !t.source) return false;
                        const sources = t.source.toLowerCase().split('/');
                        if (!sources.includes(catName.toLowerCase())) return false;
                        if (!t.date) return false;
                        if (paycheckType !== 'Total Paycheck' && activeRange.startDate && activeRange.endDate) {
                            return t.date >= activeRange.startDate && t.date <= activeRange.endDate;
                        }
                        if (paycheckType === 'Total Paycheck') return true;
                        const txMonth = new Date(t.date).getMonth();
                        return txMonth === activeMonth;
                    })
                    .reduce((sum, t) => {
                        if (t.source.includes('/')) {
                            const parts = t.source.split('/');
                            if (parts[0].toLowerCase() === catName.toLowerCase()) {
                                return sum + (parseCurrencyValue(t.amount1) || (parseCurrencyValue(t.amount) / 2));
                            } else if (parts[1] && parts[1].toLowerCase() === catName.toLowerCase()) {
                                return sum + (parseCurrencyValue(t.amount2) || (parseCurrencyValue(t.amount) / 2));
                            }
                        }
                        return sum + parseCurrencyValue(t.amount);
                    }, 0);

                const remainingBalance = encodedAmount - totalDeducted;

                if (remainingBalance < 0) {
                    balanceEl.textContent = `-₱${formatCurrency(Math.abs(remainingBalance))}`;
                    balanceEl.classList.add('negative-balance');
                } else {
                    balanceEl.textContent = `₱${formatCurrency(remainingBalance)}`;
                    balanceEl.classList.remove('negative-balance');
                }
            }
        });
    }

    function loadFormForSelectedMonth() {
        const selectedMonth = parseInt(incomeMonthSelect.value);
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        
        if (!monthlyIncomes[selectedMonth]) monthlyIncomes[selectedMonth] = {};

        if (paycheckRanges[selectedMonth]?.[paycheckType]) {
            const range = paycheckRanges[selectedMonth][paycheckType];
            if (rangeStartDateInput) rangeStartDateInput.value = range.startDate || getTodayLocalDateStr();
            if (rangeEndDateInput) rangeEndDateInput.value = range.endDate || getTodayLocalDateStr();
        } else {
            let startDay = 1;
            let endDay = 15;
            if (rangeStartDateInput && rangeStartDateInput.value) {
                const curStart = new Date(rangeStartDateInput.value);
                if (!isNaN(curStart.getTime())) startDay = curStart.getDate();
            }
            if (rangeEndDateInput && rangeEndDateInput.value) {
                const curEnd = new Date(rangeEndDateInput.value);
                if (!isNaN(curEnd.getTime())) endDay = curEnd.getDate();
            }
            const curYear = new Date().getFullYear();
            const newStart = `${curYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
            const newEnd = `${curYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
            
            if (rangeStartDateInput) rangeStartDateInput.value = newStart;
            if (rangeEndDateInput) rangeEndDateInput.value = newEnd;
        }

        if (paycheckType === 'Total Paycheck') {
            const types = ['1st Paycheck', '2nd Paycheck'];
            let dynamicSums = {};

            types.forEach(t => {
                const entry = monthlyIncomes[selectedMonth][t] || {};
                Object.keys(entry).forEach(k => {
                    dynamicSums[k] = (dynamicSums[k] || 0) + (entry[k] || 0);
                });
            });

            const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
            dynamicInputs.forEach(inp => {
                const key = inp.id.replace('income_', '');
                inp.value = dynamicSums[key] ? formatCurrency(dynamicSums[key]) : '';
            });

            setIncomeInputsEditable(false);
            if (editIncomeBtn) {
                editIncomeBtn.disabled = true;
                editIncomeBtn.style.opacity = '0.4';
                editIncomeBtn.style.cursor = 'not-allowed';
            }
            return;
        }

        if (editIncomeBtn) {
            editIncomeBtn.disabled = false;
            editIncomeBtn.style.opacity = '1';
            editIncomeBtn.style.cursor = 'pointer';
        }

        let data = monthlyIncomes[selectedMonth][paycheckType];

        if (!data) {
            data = {};
            monthlyIncomes[selectedMonth][paycheckType] = data;
        }

        const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
        dynamicInputs.forEach(inp => {
            const key = inp.id.replace('income_', '');
            inp.value = data[key] ? formatCurrency(data[key]) : '';
        });

        setIncomeInputsEditable(false);
    }

    function setIncomeInputsEditable(editable) {
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        
        if (paycheckType === 'Total Paycheck') {
            isEditingIncome = false;
            const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
            dynamicInputs.forEach(inp => inp.disabled = true);
            if (rangeStartDateInput && rangeEndDateInput) {
                rangeStartDateInput.disabled = true;
                rangeEndDateInput.disabled = true;
            }
            if (saveIncomeBtn) saveIncomeBtn.style.display = 'none';
            if (editIncomeBtn) editIncomeBtn.classList.remove('active');
            return;
        }

        isEditingIncome = editable;

        const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
        dynamicInputs.forEach(inp => inp.disabled = !editable);

        if (rangeStartDateInput && rangeEndDateInput) {
            rangeStartDateInput.disabled = !editable;
            rangeEndDateInput.disabled = !editable;
        }

        if (editable) {
            saveIncomeBtn.style.display = 'block';
            editIncomeBtn.classList.add('active');
            if (dynamicInputs.length > 0) dynamicInputs[0].focus();
        } else {
            saveIncomeBtn.style.display = 'none';
            editIncomeBtn.classList.remove('active');
        }
    }

    if (incomeMonthSelect) {
        incomeMonthSelect.addEventListener('change', () => {
            loadFormForSelectedMonth();
            updateSummaryCards();
            renderBills();
        });
    }

    if (incomePaycheckTypeSelect) {
        incomePaycheckTypeSelect.addEventListener('change', () => {
            loadFormForSelectedMonth();
            updateSummaryCards();
            renderBills();
        });
    }

    if (accountSwitchSelect) {
        accountSwitchSelect.addEventListener('change', async (e) => {
            currentAccount = e.target.value;
            localStorage.setItem('activeAccount', currentAccount);
            if (profileAccountName) profileAccountName.textContent = currentAccount;

            bills = [];
            transactions = [];
            monthlyIncomes = {};
            paycheckRanges = {};
            customIncomeCategories = [];
            
            if (dynamicIncomeFieldsContainer) dynamicIncomeFieldsContainer.innerHTML = '';
            if (homeIncomeProgressList) homeIncomeProgressList.innerHTML = '';

            await loadDataFromSupabase();
        });
    }

    async function loadDataFromSupabase() {
        try {
            const cachedBills = localStorage.getItem(`cache_bills_${currentAccount}`);
            const cachedTx = localStorage.getItem(`cache_tx_${currentAccount}`);
            const cachedIncomes = localStorage.getItem(`cache_incomes_${currentAccount}`);
            const cachedRanges = localStorage.getItem(`cached_ranges_${currentAccount}`);
            const cachedCats = localStorage.getItem(`custom_categories_${currentAccount}`);

            if (cachedCats) {
                customIncomeCategories = JSON.parse(cachedCats);
            }

            customIncomeCategories.forEach(cat => {
                addDynamicIncomeFieldUI(getCategoryName(cat));
            });
            updateIncomeDropdownOptions();

            if (cachedBills) bills = JSON.parse(cachedBills);
            if (cachedTx) transactions = JSON.parse(cachedTx);
            if (cachedIncomes) monthlyIncomes = JSON.parse(cachedIncomes);
            if (cachedRanges) paycheckRanges = JSON.parse(cachedRanges);

            if (cachedBills || cachedTx || cachedIncomes) {
                loadFormForSelectedMonth();
                updateSummaryCards();
                renderBills();
            }

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
            paycheckRanges = {};

            if (billsRes.data) {
                bills = billsRes.data.map(b => ({
                    id: Number(b.id),
                    name: b.name,
                    amount: b.amount,
                    dueDate: b.due_date,
                    isPaid: b.is_paid,
                    recurrence: b.recurrence || 'one-time',
                    counter: b.counter || null
                }));
            }

            if (historyRes.data) {
                transactions = historyRes.data.map(t => ({
                    id: t.id,
                    desc: t.description,
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
                            recurrence: 'one-time',
                            counter: null
                        });
                    }
                });
            }

            if (profileRes.data) {
                profileRes.data.forEach(row => {
                    const mIdx = row.month_index;
                    const pType = row.paycheck_type || 'Monthly Paycheck';
                    if (!monthlyIncomes[mIdx]) monthlyIncomes[mIdx] = {};
                    if (!paycheckRanges[mIdx]) paycheckRanges[mIdx] = {};
                    
                    const catData = row.category_data || {};

                    monthlyIncomes[mIdx][pType] = catData;
                    if (row.start_date || row.end_date) {
                        paycheckRanges[mIdx][pType] = {
                            startDate: row.start_date,
                            endDate: row.end_date
                        };
                    }
                });
            }

            localStorage.setItem(`cache_bills_${currentAccount}`, JSON.stringify(bills));
            localStorage.setItem(`cache_tx_${currentAccount}`, JSON.stringify(transactions));
            localStorage.setItem(`cache_incomes_${currentAccount}`, JSON.stringify(monthlyIncomes));
            localStorage.setItem(`cached_ranges_${currentAccount}`, JSON.stringify(paycheckRanges));

            loadFormForSelectedMonth();
            updateSummaryCards();
            renderBills();
        } catch (err) {
            console.error('Error fetching Supabase data:', err);
        }
    }

    function persistStateToLocalStorage() {
        localStorage.setItem(`cache_bills_${currentAccount}`, JSON.stringify(bills));
        localStorage.setItem(`cache_tx_${currentAccount}`, JSON.stringify(transactions));
        localStorage.setItem(`cache_incomes_${currentAccount}`, JSON.stringify(monthlyIncomes));
        localStorage.setItem(`cached_ranges_${currentAccount}`, JSON.stringify(paycheckRanges));
    }

    function calculateDailyInterest() {
        const selectedMonth = parseInt(incomeMonthSelect.value);
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        if (paycheckType === 'Total Paycheck') return;

        customIncomeCategories.forEach(cat => {
            if (typeof cat === 'object' && cat !== null && cat.interest) {
                const fieldKey = cat.name.toLowerCase().replace(/\s+/g, '_');
                const inputEl = document.getElementById(`income_${fieldKey}`);
                const balanceEl = document.getElementById(`balance_income_${fieldKey}`);

                if (inputEl && balanceEl) {
                    const currentBalance = parseCurrencyValue(balanceEl.textContent);

                    if (currentBalance > 0) {
                        const rateDecimal = cat.interest.rate / 100;
                        const whTaxDecimal = cat.interest.whtax / 100;

                        const grossDailyInterest = (currentBalance * rateDecimal) / cat.interest.pa;
                        const netTax = grossDailyInterest * whTaxDecimal;
                        const netDailyEarned = grossDailyInterest - netTax;

                        const currentAmount = parseCurrencyValue(inputEl.value);
                        const newTotalAmount = currentAmount + netDailyEarned;

                        inputEl.value = formatCurrency(newTotalAmount);

                        if (!monthlyIncomes[selectedMonth]) monthlyIncomes[selectedMonth] = {};
                        if (!monthlyIncomes[selectedMonth][paycheckType]) monthlyIncomes[selectedMonth][paycheckType] = {};
                        
                        monthlyIncomes[selectedMonth][paycheckType][fieldKey] = newTotalAmount;
                    }
                }
            }
        });
    }

    await loadDataFromSupabase();
    calculateDailyInterest();

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

            const menuGrid = document.querySelector('.quick-entry-menu-grid');
            if (menuGrid) {
                menuGrid.classList.toggle('edit-mode-active', isEditMode);
            }
        });
    }

    quickTransactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rawDesc = descInput.value.trim();
        const totalAmt = parseCurrencyValue(totalAmountInput.value);

        if (!rawDesc || totalAmt <= 0) return;

        const formattedDesc = formatDescriptionText(rawDesc);
        const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';

        if (isEditMode) {
            let matchingBill = null;
            if (editingTxId) {
                matchingBill = bills.find(b => b.id === editingTxId);
            }
            if (!matchingBill) {
                matchingBill = bills.find(b => b.name.toLowerCase() === formattedDesc.toLowerCase());
            }

            if (matchingBill) {
                matchingBill.name = formattedDesc;
                matchingBill.amount = totalAmt;
                if (quickDueDateInput && quickDueDateInput.value) {
                    matchingBill.dueDate = quickDueDateInput.value;
                }

                supabaseClient.from(prefix + 'bills').update({
                    name: formattedDesc,
                    amount: totalAmt,
                    due_date: matchingBill.dueDate
                }).eq('id', matchingBill.id).then();
            }

            editingTxId = null;
            quickTransactionForm.reset();
            billTxModal.classList.remove('active');
            if (splitAmountCheck) splitAmountCheck.checked = false;
            amount2Row.classList.remove('active');
            totalAmountInput.value = '';

            persistStateToLocalStorage();
            updateSummaryCards();
            renderBills();
            return;
        }

        const activeRange = getActiveDateRange();
        const activeMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;
        const totalBudget = getMonthTotalIncome(activeMonth);

        const getSourceAvailableBalance = (sourceName) => {
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

        quickTransactionForm.reset();
        billTxModal.classList.remove('active');
        if (splitAmountCheck) splitAmountCheck.checked = false;
        amount2Row.classList.remove('active');
        totalAmountInput.value = '';

        try {
            const newTxDb = {
                id: 'hist_' + Date.now(),
                description: formattedDesc,
                amount: totalAmt,
                type: 'expense',
                source: splitAmountCheck.checked ? `${deductSource1}/${deductSource2}` : deductSource1,
                date: quickDueDateInput && quickDueDateInput.value ? quickDueDateInput.value : getTodayLocalDateStr()
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
                matchingBill.amount = totalAmt;
                supabaseClient.from(prefix + 'bills').update({ is_paid: true, amount: totalAmt }).eq('id', matchingBill.id).then();
            }
            editingTxId = null;

            persistStateToLocalStorage();
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

        const formattedType = formatDescriptionText(rawTypeInput);
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
                recurrence: 'one-time',
                counter: null
            };

            bills.push({
                id: safeBillId,
                name: newBillDb.name,
                amount: newBillDb.amount,
                dueDate: newBillDb.due_date,
                isPaid: true,
                recurrence: newBillDb.recurrence,
                counter: null
            });

            persistStateToLocalStorage();
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
        persistStateToLocalStorage();
        renderBills();
        updateSummaryCards();
        const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
        supabaseClient.from(prefix + 'bills').delete().eq('id', billId).then();
    };

    function renderBills() {
        billsList.innerHTML = '';

        const activeRange = getActiveDateRange();
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        const selectedMonth = incomeMonthSelect ? parseInt(incomeMonthSelect.value) : currentMonth;

        let filteredBills = bills;

        if (paycheckType === 'Total Paycheck') {
            filteredBills = bills;
        } 
        else if (activeRange.startDate && activeRange.endDate) {
            filteredBills = bills.filter(bill => {
                return bill.dueDate >= activeRange.startDate && bill.dueDate <= activeRange.endDate;
            });
        } 
        else {
            const filterMonthVal = billsFilterMonth ? billsFilterMonth.value : 'all';
            const targetMonth = filterMonthVal !== 'all' ? parseInt(filterMonthVal) : selectedMonth;
            
            filteredBills = bills.filter(bill => {
                const billMonth = new Date(bill.dueDate).getMonth();
                return billMonth === targetMonth;
            });
        }

        const unpaidFilteredBills = filteredBills.filter(b => !b.isPaid);
        const filteredTotalSum = unpaidFilteredBills.reduce((sum, b) => sum + parseCurrencyValue(b.amount), 0);
        
        const billsTotalAmountText = document.getElementById('billsTotalAmountText');
        if (billsTotalAmountText) {
            billsTotalAmountText.textContent = `₱${formatCurrency(filteredTotalSum)}`;
        }

        if (filteredBills.length === 0) {
            billsList.innerHTML = '<li class="empty-state">No bills found for this filter/range.</li>';
            return;
        }

        filteredBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        const fragment = document.createDocumentFragment();

        const recurrenceLabels = {
            'one-time': 'One-Time',
            'monthly': 'Monthly',
            'permanent': 'Lifetime'
        };

        filteredBills.forEach(bill => {
            const li = document.createElement('li');
            li.className = `bill-item-row ${bill.isPaid ? 'is-paid' : ''}`;
            
            const [year, month, day] = bill.dueDate.split('-');
            const formattedDate = `${month}/${day}/${year}`;
            const formattedAmount = formatCurrency(bill.amount);
            const displayRecurrence = recurrenceLabels[bill.recurrence] || bill.recurrence;

            // Display counter next to date if it's a monthly recurrence with a counter
            let dateDisplayStr = `Due: ${formattedDate}`;
            if (bill.recurrence === 'monthly' && bill.counter) {
                dateDisplayStr = `Due: ${formattedDate} | ${bill.counter}`;
            }

            li.innerHTML = `
                <div class="bill-info">
                    <div class="bill-name-wrapper">
                        <span class="bill-name">${bill.name}</span>
                        ${bill.isPaid ? '<span class="paid-badge">Paid</span>' : ''}
                        <span class="recurrence-badge">${displayRecurrence}</span>
                    </div>
                    <span class="bill-date">${dateDisplayStr}</span>
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

        const formattedName = formatDescriptionText(rawName);

        try {
            const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';
            const numericAmount = parseCurrencyValue(amount);

            if (editingBillId) {
                const existingBill = bills.find(b => b.id === editingBillId);
                if (existingBill) {
                    existingBill.name = formattedName;
                    existingBill.amount = numericAmount;
                    existingBill.dueDate = startDateStr;
                    existingBill.recurrence = selectedRecurrence;
                    if (selectedRecurrence === 'monthly') {
                        existingBill.counter = existingBill.counter || `1 / ${monthsCount}`;
                    } else {
                        existingBill.counter = null;
                    }

                    await supabaseClient.from(prefix + 'bills').update({
                        name: formattedName,
                        amount: numericAmount,
                        due_date: startDateStr,
                        recurrence: selectedRecurrence,
                        counter: existingBill.counter
                    }).eq('id', editingBillId);
                }

                editingBillId = null;
                persistStateToLocalStorage();
                updateSummaryCards();
                renderBills();
                return;
            }

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

            datesToCreate.forEach((dStr, index) => {
                const safeBillId = Date.now() + Math.floor(Math.random() * 100);
                
                let counterVal = null;
                if (selectedRecurrence === 'monthly') {
                    counterVal = `${index + 1} / ${datesToCreate.length}`;
                }

                const newBillDb = {
                    id: safeBillId,
                    name: formattedName,
                    amount: numericAmount,
                    due_date: dStr,
                    is_paid: false,
                    recurrence: selectedRecurrence,
                    counter: counterVal
                };

                bills.push({
                    id: newBillDb.id,
                    name: newBillDb.name,
                    amount: newBillDb.amount,
                    dueDate: newBillDb.due_date,
                    isPaid: newBillDb.is_paid,
                    recurrence: newBillDb.recurrence,
                    counter: newBillDb.counter
                });

                supabaseClient.from(prefix + 'bills').insert([newBillDb]).then();
            });

            persistStateToLocalStorage();
            updateSummaryCards();
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
        const paycheckType = incomePaycheckTypeSelect ? incomePaycheckTypeSelect.value : 'Monthly Paycheck';
        if (paycheckType === 'Total Paycheck') return;

        const categoryData = {};

        const dynamicInputs = document.querySelectorAll('.income-dynamic-input');
        dynamicInputs.forEach(inp => {
            const key = inp.id.replace('income_', '');
            categoryData[key] = parseCurrencyValue(inp.value);
        });

        if (!monthlyIncomes[selectedMonth]) monthlyIncomes[selectedMonth] = {};
        monthlyIncomes[selectedMonth][paycheckType] = categoryData;
        setIncomeInputsEditable(false);

        const startDateVal = rangeStartDateInput ? rangeStartDateInput.value : null;
        const endDateVal = rangeEndDateInput ? rangeEndDateInput.value : null;

        if (!paycheckRanges[selectedMonth]) paycheckRanges[selectedMonth] = {};
        paycheckRanges[selectedMonth][paycheckType] = { startDate: startDateVal, endDate: endDateVal };

        const prefix = currentAccount === 'Krazy Ellie' ? 'ellie_' : 'doom_';

        persistStateToLocalStorage();
        updateSummaryCards();
        renderBills();

        try {
            await supabaseClient.from(prefix + 'profile_incomes').upsert({
                month_index: selectedMonth,
                paycheck_type: paycheckType,
                category_data: categoryData,
                start_date: startDateVal,
                end_date: endDateVal,
                updated_at: new Date()
            });
        } catch (err) {
            console.error('Error saving profile income breakdown:', err);
        }
    });

    logoutBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});