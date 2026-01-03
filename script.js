// Simple Loan Calculator
let count = 0;

window.onload = () => addLoan();

function addLoan() {
    count++;
    const div = document.createElement('div');
    div.className = 'loan-card';
    div.id = `loan${count}`;
    div.innerHTML = `
        <div class="title">
            <span>📄 लोन ${count}</span>
            <button class="remove-btn" onclick="remove(${count})">×</button>
        </div>
        <div class="fields">
            <div class="field">
                <label>बैंक का नाम (Bank Name)</label>
                <input type="text" id="bank${count}" placeholder="HDFC, SBI, etc.">
            </div>
            <div class="row">
                <div class="field">
                    <label>बकाया ₹ (Due Amount)</label>
                    <input type="number" id="amt${count}" placeholder="300000" inputmode="numeric">
                </div>
                <div class="field">
                    <label>ब्याज % (Interest)</label>
                    <input type="number" id="rate${count}" placeholder="12" inputmode="decimal">
                </div>
            </div>
            <div class="field">
                <label>सेटलमेंट ऑफर ₹ (Settlement - optional)</label>
                <input type="number" id="settle${count}" placeholder="खाली छोड़ें" inputmode="numeric">
            </div>
        </div>
    `;
    document.getElementById('loans').appendChild(div);
}

function remove(id) {
    document.getElementById(`loan${id}`)?.remove();
    if (document.getElementById('loans').children.length === 0) addLoan();
}

function calculate() {
    const budget = parseFloat(document.getElementById('budget').value) || 0;
    
    if (budget <= 0) {
        alert('⚠️ कृपया मासिक बचत भरें');
        return;
    }
    
    const loans = [];
    document.querySelectorAll('.loan-card').forEach(card => {
        const id = card.id.replace('loan', '');
        const amt = parseFloat(document.getElementById(`amt${id}`).value) || 0;
        if (amt > 0) {
            loans.push({
                name: document.getElementById(`bank${id}`).value || `Loan ${id}`,
                amount: amt,
                rate: parseFloat(document.getElementById(`rate${id}`).value) || 0,
                settle: parseFloat(document.getElementById(`settle${id}`).value) || 0
            });
        }
    });
    
    if (loans.length === 0) {
        alert('⚠️ कम से कम एक लोन भरें');
        return;
    }
    
    // Calculate
    let totalPay = 0;
    let totalSave = 0;
    let months = 0;
    const steps = [];
    
    // Sort: settlements first (by amount), then by interest rate
    const withSettle = loans.filter(l => l.settle > 0).sort((a, b) => a.settle - b.settle);
    const noSettle = loans.filter(l => l.settle <= 0).sort((a, b) => b.rate - a.rate);
    
    // Handle settlements
    withSettle.forEach(loan => {
        const m = Math.ceil(loan.settle / budget);
        months += m;
        totalPay += loan.settle;
        totalSave += loan.amount - loan.settle;
        steps.push({
            name: loan.name,
            action: `सेटलमेंट करें (₹${formatNum(loan.amount - loan.settle)} बचत)`,
            amount: loan.settle,
            month: months
        });
    });
    
    // Handle regular loans
    noSettle.forEach(loan => {
        const monthlyRate = loan.rate / 12 / 100;
        let balance = loan.amount;
        let loanMonths = 0;
        
        while (balance > 1 && loanMonths < 600) {
            balance += balance * monthlyRate;
            balance -= Math.min(budget, balance);
            loanMonths++;
            totalPay += Math.min(budget, balance + budget);
        }
        
        months += loanMonths;
        steps.push({
            name: loan.name,
            action: `पूरा चुकाएं (Pay in full)`,
            amount: loan.amount,
            month: months
        });
    });
    
    // Show results
    showResults(months, totalPay, totalSave, steps);
}

function formatNum(n) {
    return n.toLocaleString('en-IN');
}

function showResults(months, total, saved, steps) {
    const years = Math.floor(months / 12);
    const m = months % 12;
    const timeText = years > 0 
        ? `${years} साल ${m > 0 ? m + ' महीने' : ''}`
        : `${months} महीने`;
    
    let html = `
        <div class="result-card success">
            <div class="icon">🎉</div>
            <div class="sub">आप कर्ज मुक्त होंगे</div>
            <div class="big">${timeText}</div>
            <div class="sub">(${months} months)</div>
        </div>
    `;
    
    if (saved > 0) {
        html += `
            <div class="result-card savings">
                <div class="icon">💰</div>
                <div class="sub">सेटलमेंट से बचत</div>
                <div class="big">₹${formatNum(saved)}</div>
            </div>
        `;
    }
    
    html += `
        <div class="steps">
            <h3>📋 यह करें (Action Plan)</h3>
            ${steps.map((s, i) => `
                <div class="step">
                    <div class="num">${i + 1}</div>
                    <div class="info">
                        <div class="name">${s.name}</div>
                        <div class="action">${s.action}</div>
                    </div>
                    <div class="amount">₹${formatNum(s.amount)}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    const result = document.getElementById('result');
    result.innerHTML = html;
    result.className = 'result show';
    result.scrollIntoView({ behavior: 'smooth' });
}
