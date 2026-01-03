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

    // Calculate all 3 strategies
    const strategies = [
        calculateSmallestFirst(loans, budget),
        calculateHighestInterestFirst(loans, budget),
        calculateBestDiscountFirst(loans, budget)
    ];

    // Find the best strategy (lowest total cost)
    const best = strategies.reduce((a, b) => a.totalCost < b.totalCost ? a : b);
    best.isRecommended = true;

    // Calculate summary stats
    const summary = {
        totalOutstanding: loans.reduce((sum, l) => sum + l.amount, 0),
        totalSettlement: loans.reduce((sum, l) => sum + (l.settlement || l.amount), 0),
        totalSavings: loans.reduce((sum, l) => sum + l.savings, 0),
        hasSettlements: loans.some(l => l.settlement !== null)
    };

    // Show dashboard with all strategies
    showDashboard(strategies, summary, budget);
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

// Calculate settlement strategy - Smallest Settlement First
function calculateSmallestFirst(loans, budget) {
    const timeline = [];
    let totalCost = 0;
    let totalMonths = 0;
    let totalSavings = 0;

    // Separate settlement and regular loans - sort settlements by amount (smallest first)
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
        type: 'smallest',
        name: 'Smallest Settlement First',
        nameHi: 'सबसे छोटा सेटलमेंट पहले',
        icon: '⚡',
        description: 'Quick wins, close loans fast',
        descriptionHi: 'जल्दी जीत, लोन जल्दी बंद करें',
        timeline,
        totalMonths,
        totalCost,
        savings: totalSavings
    };
}

// Calculate Highest Interest First strategy (Avalanche for settlements too)
function calculateHighestInterestFirst(loans, budget) {
    const timeline = [];
    let totalCost = 0;
    let totalMonths = 0;
    let totalSavings = 0;

    // Sort ALL loans by interest rate (highest first), handle settlements for those with offers
    const sortedLoans = [...loans].sort((a, b) => b.rate - a.rate);

    for (const loan of sortedLoans) {
        if (loan.settlement !== null) {
            // Pay settlement amount
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
                type: 'settlement',
                rate: loan.rate
            });
        } else {
            // Calculate regular payoff for this single loan
            let balance = loan.amount;
            let loanMonths = 0;
            let loanInterest = 0;

            while (balance > 1 && loanMonths < 600) {
                loanMonths++;
                const interest = balance * loan.monthlyRate;
                balance += interest;
                loanInterest += interest;
                balance -= Math.min(budget, balance);
            }

            totalMonths += loanMonths;
            totalCost += loan.amount + loanInterest;

            timeline.push({
                name: loan.name,
                month: totalMonths,
                amount: loan.amount,
                type: 'regular',
                rate: loan.rate
            });
        }
    }

    return {
        type: 'avalanche',
        name: 'Highest Interest First',
        nameHi: 'सबसे ज्यादा ब्याज वाला पहले',
        icon: '📉',
        description: 'Stop expensive debt growth',
        descriptionHi: 'महंगे कर्ज की बढ़त रोकें',
        timeline,
        totalMonths,
        totalCost,
        savings: totalSavings
    };
}

// Calculate Best Discount First strategy
function calculateBestDiscountFirst(loans, budget) {
    const timeline = [];
    let totalCost = 0;
    let totalMonths = 0;
    let totalSavings = 0;

    // Sort settlement loans by discount percentage (best discount first)
    const settlementLoans = loans.filter(l => l.settlement !== null)
        .sort((a, b) => (b.savings / b.amount) - (a.savings / a.amount));
    const regularLoans = loans.filter(l => l.settlement === null).sort((a, b) => b.rate - a.rate);

    // First, handle settlements (best discount first)
    for (const loan of settlementLoans) {
        const monthsNeeded = Math.ceil(loan.settlement / budget);
        totalMonths += monthsNeeded;
        totalCost += loan.settlement;
        totalSavings += loan.savings;

        const discountPercent = Math.round((loan.savings / loan.amount) * 100);

        timeline.push({
            name: loan.name,
            month: totalMonths,
            amount: loan.settlement,
            originalAmount: loan.amount,
            savings: loan.savings,
            discountPercent: discountPercent,
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
        type: 'discount',
        name: 'Best Discount First',
        nameHi: 'सबसे अच्छी छूट पहले',
        icon: '💎',
        description: 'Maximize value per rupee',
        descriptionHi: 'हर रुपये का ज्यादा फायदा',
        timeline,
        totalMonths,
        totalCost,
        savings: totalSavings
    };
}

// Calculate debt-free date
function getDebtFreeDate(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    const options = { year: 'numeric', month: 'long' };
    return date.toLocaleDateString('en-IN', options);
}

// Show dashboard with all strategies
function showDashboard(strategies, summary, budget) {
    const resultsDiv = document.getElementById('results');
    const resultBox = document.getElementById('resultBox');

    // Find best strategy for debt-free date
    const best = strategies.find(s => s.isRecommended);

    // Summary Dashboard
    let html = `
        <div class="summary-dashboard">
            <div class="summary-grid">
                <div class="summary-stat">
                    <div class="stat-icon">💰</div>
                    <div class="stat-value">${formatMoney(summary.totalOutstanding)}</div>
                    <div class="stat-label">कुल बकाया<br>Total Outstanding</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-icon">🤝</div>
                    <div class="stat-value">${formatMoney(summary.totalSettlement)}</div>
                    <div class="stat-label">सेटलमेंट राशि<br>Settlement Amount</div>
                </div>
                <div class="summary-stat highlight">
                    <div class="stat-icon">🎉</div>
                    <div class="stat-value">${formatMoney(summary.totalSavings)}</div>
                    <div class="stat-label">कुल बचत<br>Total Savings</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-icon">📅</div>
                    <div class="stat-value date-value">${getDebtFreeDate(best.totalMonths)}</div>
                    <div class="stat-label">कर्ज मुक्ति तिथि<br>Debt-Free Date</div>
                </div>
            </div>
        </div>

        <h3 class="strategies-title">📊 अपनी रणनीति चुनें (Choose Your Strategy)</h3>
        <div class="strategies-container">
    `;

    // Strategy Cards
    strategies.forEach((strategy, index) => {
        const isRecommended = strategy.isRecommended;
        html += `
            <div class="strategy-card ${isRecommended ? 'recommended' : ''}" onclick="showStrategyDetails(${index})">
                ${isRecommended ? '<div class="recommended-badge">✓ सुझाया गया (Recommended)</div>' : ''}
                <div class="strategy-header">
                    <span class="strategy-icon">${strategy.icon}</span>
                    <div class="strategy-names">
                        <div class="strategy-name">${strategy.name}</div>
                        <div class="strategy-name-hi">${strategy.nameHi}</div>
                    </div>
                </div>
                <div class="strategy-desc">${strategy.descriptionHi}<br>${strategy.description}</div>
                <div class="strategy-stats">
                    <div class="strategy-stat">
                        <span class="stat-num">${formatTime(strategy.totalMonths)}</span>
                        <span class="stat-text">समय</span>
                    </div>
                    <div class="strategy-stat">
                        <span class="stat-num">${formatMoney(strategy.totalCost)}</span>
                        <span class="stat-text">कुल भुगतान</span>
                    </div>
                    ${strategy.savings > 0 ? `
                    <div class="strategy-stat savings">
                        <span class="stat-num">${formatMoney(strategy.savings)}</span>
                        <span class="stat-text">बचत</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += `</div>`;

    // Show recommended strategy details by default
    html += `<div id="strategyDetails"></div>`;

    resultBox.innerHTML = html;
    resultsDiv.classList.add('visible');

    // Store strategies globally for detail view
    window.currentStrategies = strategies;

    // Show recommended strategy details
    const recommendedIndex = strategies.findIndex(s => s.isRecommended);
    showStrategyDetails(recommendedIndex);

    // Scroll to results
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Show strategy details
function showStrategyDetails(index) {
    const strategy = window.currentStrategies[index];
    const detailsDiv = document.getElementById('strategyDetails');

    // Update active card
    document.querySelectorAll('.strategy-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });

    let html = `
        <div class="strategy-detail-box">
            <h3>${strategy.icon} ${strategy.nameHi} - ${strategy.name}</h3>
            <div class="timeline">
                <h4>📅 यह करें (Do This)</h4>
    `;

    strategy.timeline.forEach((item, idx) => {
        if (item.type === 'settlement') {
            html += `
                <div class="timeline-item settlement">
                    <div class="timeline-step">${idx + 1}</div>
                    <div class="timeline-content">
                        <div class="timeline-lender">${item.name}</div>
                        <div class="timeline-action">
                            सेटलमेंट करें • ${formatMoney(item.savings)} बचत
                            ${item.discountPercent ? `(${item.discountPercent}% छूट)` : ''}
                            <br>Settle & save ${formatMoney(item.savings)}
                        </div>
                    </div>
                    <div class="timeline-amount">${formatMoney(item.amount)}<br>महीना ${item.month}</div>
                </div>
            `;
        } else {
            html += `
                <div class="timeline-item">
                    <div class="timeline-step">${idx + 1}</div>
                    <div class="timeline-content">
                        <div class="timeline-lender">${item.name}</div>
                        <div class="timeline-action">पूरा चुकाएं • Pay in full</div>
                    </div>
                    <div class="timeline-amount">${formatMoney(item.amount)}<br>महीना ${item.month}</div>
                </div>
            `;
        }
    });

    html += `
            </div>
        </div>
    `;

    detailsDiv.innerHTML = html;
}
