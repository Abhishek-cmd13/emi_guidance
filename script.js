// Simple Loan Calculator for Everyone
// कर्ज मुक्ति - Loan Mukti

let loanCount = 0;

// Start with one loan card
document.addEventListener('DOMContentLoaded', () => {
    addLoan();
});

// Add a new loan
function addLoan() {
    loanCount++;
    const container = document.getElementById('loansContainer');
    
    const loanDiv = document.createElement('div');
    loanDiv.className = 'loan-item';
    loanDiv.id = `loan-${loanCount}`;
    
    loanDiv.innerHTML = `
        <div class="loan-header">
            <span class="loan-title">लोन ${loanCount} (Loan ${loanCount})</span>
            <button class="remove-btn" onclick="removeLoan(${loanCount})">×</button>
        </div>
        <div class="loan-fields">
            <div class="field">
                <label>बैंक/लेंडर का नाम <span>(Bank/Lender Name)</span></label>
                <input type="text" id="name-${loanCount}" placeholder="जैसे: HDFC Bank">
            </div>
            <div class="two-cols">
                <div class="field">
                    <label>बकाया राशि ₹ <span>(Amount Due)</span></label>
                    <input type="number" id="amount-${loanCount}" placeholder="300000" inputmode="numeric">
                </div>
                <div class="field">
                    <label>ब्याज दर % <span>(Interest Rate)</span></label>
                    <input type="number" id="rate-${loanCount}" placeholder="12" inputmode="decimal" step="0.1">
                </div>
            </div>
            <div class="field">
                <label>सेटलमेंट ऑफर ₹ <span>(Settlement Offer - if any)</span></label>
                <input type="number" id="settle-${loanCount}" placeholder="खाली छोड़ें अगर नहीं है" inputmode="numeric">
            </div>
        </div>
    `;
    
    container.appendChild(loanDiv);
}

// Remove a loan
function removeLoan(id) {
    const loan = document.getElementById(`loan-${id}`);
    if (loan) {
        loan.remove();
    }
    
    // Keep at least one loan
    const container = document.getElementById('loansContainer');
    if (container.children.length === 0) {
        addLoan();
    }
}

// Show error message
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// Format currency
function formatMoney(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// Format months
function formatTime(months) {
    if (months < 12) {
        return `${months} महीने (${months} months)`;
    }
    const years = Math.floor(months / 12);
    const remaining = months % 12;
    if (remaining === 0) {
        return `${years} साल (${years} year${years > 1 ? 's' : ''})`;
    }
    return `${years} साल ${remaining} महीने (${years}y ${remaining}m)`;
}

// Collect loan data
function getLoans() {
    const loans = [];
    const items = document.querySelectorAll('.loan-item');
    
    items.forEach(item => {
        const id = item.id.split('-')[1];
        const name = document.getElementById(`name-${id}`).value.trim() || `Loan ${id}`;
        const amount = parseFloat(document.getElementById(`amount-${id}`).value) || 0;
        const rate = parseFloat(document.getElementById(`rate-${id}`).value) || 0;
        const settle = parseFloat(document.getElementById(`settle-${id}`).value) || 0;
        
        if (amount > 0) {
            loans.push({
                name,
                amount,
                rate,
                monthlyRate: rate / 12 / 100,
                settlement: settle > 0 ? settle : null,
                savings: settle > 0 ? amount - settle : 0
            });
        }
    });
    
    return loans;
}

// Calculate best strategy
function calculate() {
    const budget = parseFloat(document.getElementById('monthlyBudget').value) || 0;
    const loans = getLoans();
    
    // Validation
    if (budget <= 0) {
        showError('⚠️ कृपया मासिक बचत राशि भरें (Please enter monthly budget)');
        return;
    }
    
    if (loans.length === 0) {
        showError('⚠️ कृपया कम से कम एक लोन की जानकारी भरें (Please add at least one loan)');
        return;
    }
    
    // Calculate strategies
    const regular = calculateRegularPayoff(loans, budget);
    const settlement = calculateSettlementStrategy(loans, budget);
    
    // Pick better strategy
    const best = settlement.totalCost < regular.totalCost ? settlement : regular;
    
    // Show results
    showResults(best, loans, budget);
}

// Calculate regular payoff (avalanche method - highest interest first)
function calculateRegularPayoff(loans, budget) {
    const timeline = [];
    let totalInterest = 0;
    let totalMonths = 0;
    
    // Sort by interest rate (highest first)
    const sorted = [...loans].sort((a, b) => b.rate - a.rate);
    const active = sorted.map(l => ({ ...l, balance: l.amount }));
    
    while (active.length > 0 && totalMonths < 600) {
        totalMonths++;
        
        // Add interest to all loans
        active.forEach(loan => {
            const interest = loan.balance * loan.monthlyRate;
            loan.balance += interest;
            totalInterest += interest;
        });
        
        // Pay towards loans (prioritize first loan)
        let remaining = budget;
        for (let i = 0; i < active.length && remaining > 0; i++) {
            const payment = Math.min(remaining, active[i].balance);
            active[i].balance -= payment;
            remaining -= payment;
        }
        
        // Check for paid off loans
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].balance <= 1) {
                timeline.push({
                    name: active[i].name,
                    month: totalMonths,
                    amount: active[i].amount,
                    type: 'regular'
                });
                active.splice(i, 1);
            }
        }
    }
    
    const totalPrincipal = loans.reduce((sum, l) => sum + l.amount, 0);
    
    return {
        type: 'regular',
        timeline,
        totalMonths,
        totalInterest,
        totalCost: totalPrincipal + totalInterest,
        savings: 0
    };
}

// Calculate settlement strategy
function calculateSettlementStrategy(loans, budget) {
    const timeline = [];
    let totalCost = 0;
    let totalMonths = 0;
    let totalSavings = 0;
    
    // Separate settlement and regular loans
    const settlementLoans = loans.filter(l => l.settlement !== null).sort((a, b) => a.settlement - b.settlement);
    const regularLoans = loans.filter(l => l.settlement === null).sort((a, b) => b.rate - a.rate);
    
    // First, handle settlements
    for (const loan of settlementLoans) {
        const monthsNeeded = Math.ceil(loan.settlement / budget);
        totalMonths += monthsNeeded;
        totalCost += loan.settlement;
        totalSavings += loan.savings;
        
        timeline.push({
            name: loan.name,
            month: totalMonths,
            amount: loan.settlement,
            originalAmount: loan.amount,
            savings: loan.savings,
            type: 'settlement'
        });
    }
    
    // Then, handle regular loans
    if (regularLoans.length > 0) {
        const regularResult = calculateRegularPayoff(regularLoans, budget);
        
        regularResult.timeline.forEach(item => {
            timeline.push({
                ...item,
                month: item.month + totalMonths
            });
        });
        
        totalMonths += regularResult.totalMonths;
        totalCost += regularResult.totalCost;
    }
    
    return {
        type: 'settlement',
        timeline,
        totalMonths,
        totalCost,
        savings: totalSavings
    };
}

// Show results
function showResults(result, loans, budget) {
    const resultsDiv = document.getElementById('results');
    const resultBox = document.getElementById('resultBox');
    
    const totalDebt = loans.reduce((sum, l) => sum + l.amount, 0);
    
    let html = `
        <div class="result-summary">
            <div class="label">आप कर्ज मुक्त होंगे (You'll be debt-free in)</div>
            <div class="big-number">${formatTime(result.totalMonths)}</div>
            <div class="label">कुल भुगतान: ${formatMoney(result.totalCost)}</div>
        </div>
    `;
    
    if (result.savings > 0) {
        html += `
            <div class="savings-box">
                <div class="label">🎉 सेटलमेंट से आप बचाएंगे (You'll save with settlement)</div>
                <div class="amount">${formatMoney(result.savings)}</div>
            </div>
        `;
    }
    
    html += `
        <div class="timeline">
            <h3>📅 यह करें (Do This)</h3>
    `;
    
    result.timeline.forEach((item, index) => {
        if (item.type === 'settlement') {
            html += `
                <div class="timeline-item settlement">
                    <div class="timeline-step">${index + 1}</div>
                    <div class="timeline-content">
                        <div class="timeline-lender">${item.name}</div>
                        <div class="timeline-action">
                            सेटलमेंट करें • ${formatMoney(item.savings)} बचत
                            <br>Settle & save ${formatMoney(item.savings)}
                        </div>
                    </div>
                    <div class="timeline-amount">${formatMoney(item.amount)}<br>महीना ${item.month}</div>
                </div>
            `;
        } else {
            html += `
                <div class="timeline-item">
                    <div class="timeline-step">${index + 1}</div>
                    <div class="timeline-content">
                        <div class="timeline-lender">${item.name}</div>
                        <div class="timeline-action">पूरा चुकाएं • Pay in full</div>
                    </div>
                    <div class="timeline-amount">${formatMoney(item.amount)}<br>महीना ${item.month}</div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    
    resultBox.innerHTML = html;
    resultsDiv.classList.add('visible');
    
    // Scroll to results
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}
