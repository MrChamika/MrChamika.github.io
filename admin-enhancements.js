import { db, auth } from './firebase-setup.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

let reportPeriod = '30';

const byId = id => document.getElementById(id);
const money = value => `Rs. ${Math.round(Number(value) || 0).toLocaleString()}`;
const dateOf = value => {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date : null;
};
const escapeHtml = value => {
    const node = document.createElement('span');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
};

function activatePanel(panel) {
    const target = byId(panel) ? panel : 'reports';
    document.querySelectorAll('.admin-panel').forEach(item => item.classList.toggle('active', item.dataset.panel === target));
    document.querySelectorAll('.admin-nav-link').forEach(item => item.classList.toggle('active', item.dataset.panel === target));
    document.querySelector('.admin-sidebar')?.classList.remove('open');
    byId('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
}

function initNavigation() {
    const sidebar = document.querySelector('.admin-sidebar');
    byId('sidebar-toggle')?.addEventListener('click', () => {
        const open = sidebar.classList.toggle('open');
        byId('sidebar-toggle').setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('hashchange', () => activatePanel(location.hash.slice(1)));
    activatePanel(location.hash.slice(1) || 'reports');
}

function startDate() {
    if (reportPeriod === 'all') return null;
    const now = new Date();
    if (reportPeriod === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    const date = new Date(now); date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (Number(reportPeriod) - 1));
    return date;
}

function renderList(id, records, format, empty) {
    const container = byId(id);
    if (!container) return;
    if (!records.length) { container.innerHTML = `<p class="report-empty">${empty}</p>`; return; }
    const max = Math.max(...records.map(record => record.value), 1);
    container.innerHTML = records.map(record => `<div class="report-list-row"><span title="${escapeHtml(record.label)}">${escapeHtml(record.label)}</span><strong>${format(record)}</strong><div class="report-bar"><i style="width:${Math.max(4, record.value / max * 100)}%"></i></div></div>`).join('');
}

function renderTrend(orders, from) {
    const target = byId('sales-trend');
    if (!target) return;
    if (!orders.length) { target.innerHTML = '<p class="report-empty">No paid sales in this period.</p>'; return; }
    const start = new Date(from || Math.min(...orders.map(order => order.date))); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const days = new Map();
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) days.set(day.toISOString().slice(0, 10), 0);
    orders.forEach(order => { const key = order.date.toISOString().slice(0, 10); days.set(key, (days.get(key) || 0) + order.total); });
    const series = [...days.entries()]; const values = series.map(([, value]) => value); const max = Math.max(...values, 1);
    const width = Math.max(430, series.length * 22), height = 170, pad = 18;
    const point = (value, index) => `${pad + index * ((width - 2 * pad) / Math.max(values.length - 1, 1))},${height - pad - value / max * (height - 2 * pad)}`;
    const points = values.map(point); const labels = series.map(([key], index) => ({ key, index })).filter(({ index }) => index === 0 || index === series.length - 1 || index % Math.ceil(series.length / 4) === 0).map(({ key, index }) => `<text class="trend-label" x="${pad + index * ((width - 2 * pad) / Math.max(values.length - 1, 1))}" y="${height}" text-anchor="middle">${new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>`).join('');
    target.innerHTML = `<svg class="trend-chart" viewBox="0 0 ${width} 185" role="img" aria-label="Paid revenue trend"><line class="trend-axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"/><path class="trend-area" d="M ${pad},${height - pad} L ${points.join(' L ')} L ${width - pad},${height - pad} Z"/><polyline class="trend-line" points="${points.join(' ')}"/>${points.map(value => { const [x, y] = value.split(','); return `<circle class="trend-dot" cx="${x}" cy="${y}" r="2"/>`; }).join('')}${labels}</svg>`;
}

async function renderReports() {
    const loading = byId('reports-loading'), content = byId('reports-content');
    if (!loading || !content) return;
    loading.hidden = false; content.hidden = true;
    try {
        const from = startDate();
        const snapshot = await getDocs(collection(db, 'orders'));
        const orders = snapshot.docs.map(item => ({ id: item.id, ...item.data(), date: dateOf(item.data().date) })).filter(order => order.date && (!from || order.date >= from));
        const paid = orders.filter(order => order.paymentStatus === 'paid' && order.fulfillmentStatus !== 'cancelled');
        const revenue = paid.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const customers = new Map(), products = new Map(), methods = new Map();
        paid.forEach(order => {
            const customer = String(order.email || order.userId || '').trim().toLowerCase(); if (customer) customers.set(customer, (customers.get(customer) || 0) + 1);
            const method = order.paymentMethod || 'Unknown'; methods.set(method, (methods.get(method) || 0) + (Number(order.total) || 0));
        });
        // Product demand includes every non-cancelled order, even when payment is still pending.
        orders.filter(order => order.fulfillmentStatus !== 'cancelled').forEach(order => {
            (Array.isArray(order.cart) ? order.cart : (Array.isArray(order.items) ? order.items : [])).forEach(item => { const name = item.title || item.name || 'Unnamed product', quantity = Number(item.quantity) || 1; const value = products.get(name) || { units: 0, revenue: 0 }; value.units += quantity; value.revenue += (Number(item.price) || 0) * quantity; products.set(name, value); });
        });
        byId('metric-revenue').textContent = money(revenue); byId('metric-paid-orders').textContent = paid.length.toLocaleString();
        byId('metric-aov').textContent = money(paid.length ? revenue / paid.length : 0); byId('metric-customers').textContent = customers.size.toLocaleString();
        byId('metric-repeat-customers').textContent = [...customers.values()].filter(value => value > 1).length.toLocaleString();
        byId('metric-pending').textContent = orders.filter(order => order.paymentStatus !== 'paid' && order.fulfillmentStatus !== 'cancelled').length.toLocaleString();
        byId('metric-cancelled').textContent = orders.filter(order => order.fulfillmentStatus === 'cancelled').length.toLocaleString();
        renderTrend(paid, from);
        renderList('payment-breakdown', [...methods].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value), record => money(record.value), 'No paid payment data yet.');
        renderList('top-products', [...products].map(([label, value]) => ({ label, value: value.revenue, units: value.units })).sort((a, b) => b.units - a.units || b.value - a.value).slice(0, 5), record => `${record.units} units · ${money(record.value)}`, 'No products ordered in this period.');
        const recent = byId('recent-paid-orders');
        recent.innerHTML = paid.sort((a, b) => b.date - a.date).slice(0, 5).map(order => `<div class="recent-order"><span>${escapeHtml(`${order.fname || ''} ${order.lname || ''}`.trim() || order.email || 'Customer')}<small>${order.date.toLocaleDateString()} · ${escapeHtml(order.paymentMethod || 'Unknown')}</small></span><strong>${money(order.total)}</strong></div>`).join('') || '<p class="report-empty">No paid orders yet.</p>';
    } catch (error) {
        console.error('Reports failed to load:', error);
        content.innerHTML = '<p class="report-empty">Reports could not be loaded. Check Firestore permissions.</p>';
    } finally { loading.hidden = false; content.hidden = false; }
}

async function renderOrders() {
    const container = byId('orders-list'); if (!container) return;
    try {
        const snapshot = await getDocs(collection(db, 'orders'));
        if (snapshot.empty) {
            container.innerHTML = '<p class="report-empty">No orders yet.</p>';
            return;
        }
        const orders = snapshot.docs.map(item => ({ id: item.id, ...item.data(), date: dateOf(item.data().date) })).sort((a, b) => (b.date || 0) - (a.date || 0));
        container.innerHTML = orders.map(order => {
            const status = order.fulfillmentStatus || 'not_started';
            const options = [['not_started', 'Not started'], ['processing', 'Processing'], ['shipped', 'Shipped'], ['completed', 'Completed'], ['cancelled', 'Cancelled']].map(([value, label]) => `<option value="${value}" ${value === status ? 'selected' : ''}>${label}</option>`).join('');
            const cartItems = Array.isArray(order.cart) ? order.cart : (Array.isArray(order.items) ? order.items : []);
            
            const itemsHTML = cartItems.length > 0 ? cartItems.map(item => {
                const itemImg = item.image || 'letter-e.png';
                const itemTitle = item.title || item.name || 'Unnamed product';
                const itemSize = item.size ? `Size: ${item.size}` : null;
                const itemColor = item.color ? `Color: ${item.color}` : null;
                const itemQty = Number(item.quantity) || 1;
                const itemPrice = Number(item.price) || 0;
                const itemSubtotal = itemPrice * itemQty;
                
                const specs = [itemSize, itemColor, `Qty: ${itemQty}`].filter(Boolean).map(s => `<span class="order-spec-chip">${escapeHtml(s)}</span>`).join('');
                
                return `<div class="order-item-row"><img src="${escapeHtml(itemImg)}" class="order-item-img" onerror="this.onerror=null; this.src='letter-e.png';"><div class="order-item-details"><div class="order-item-title">${escapeHtml(itemTitle)}</div><div class="order-item-specs">${specs}</div></div><div class="order-item-price"><div>${money(itemSubtotal)}</div><small>${money(itemPrice)} each</small></div></div>`;
            }).join('') : '<div style="color:#888; font-size:0.78rem; font-style:italic;">No item details available for this order.</div>';

            const fullName = `${order.fname || ''} ${order.lname || ''}`.trim() || 'Customer';
            const addressParts = [order.address, order.city, order.zip].filter(Boolean).join(', ') || 'No address provided';
            const fulfillmentStatus = order.fulfillmentStatus || 'not_started';
            const fulfillmentLabels = { not_started: 'PENDING', processing: 'PROCESSING', shipped: 'SHIPPED', completed: 'COMPLETED', cancelled: 'CANCELLED' };
            const fulfillmentColors = { not_started: { bg: 'rgba(0,210,255,0.15)', color: '#00d2ff' }, processing: { bg: 'rgba(255,165,0,0.15)', color: '#ffa500' }, shipped: { bg: 'rgba(0,200,83,0.15)', color: '#00c853' }, completed: { bg: 'rgba(0,210,255,0.15)', color: '#00d2ff' }, cancelled: { bg: 'rgba(255,71,87,0.15)', color: '#ff4757' } };
            const statusColors = fulfillmentColors[fulfillmentStatus] || fulfillmentColors.not_started;
            const paymentStatusText = fulfillmentLabels[fulfillmentStatus] || 'PENDING';

            return `<article class="order-admin-card"><div class="order-admin-header"><div><strong>Order #${escapeHtml(order.id)}</strong><span class="order-admin-date"><i class="fa-regular fa-clock"></i> ${order.date ? order.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date unavailable'}</span></div><span class="order-spec-chip" style="background:${statusColors.bg}; color:${statusColors.color}; font-weight:bold;">${escapeHtml(paymentStatusText.toUpperCase().replace('_', ' '))}</span></div><div class="order-admin-body"><div class="order-customer-info"><div><span>Customer:</span> <strong>${escapeHtml(fullName)}</strong></div><div><span>Email:</span> ${escapeHtml(order.email || 'No email')}</div><div><span>Phone:</span> ${escapeHtml(order.phone || 'N/A')}</div><div><span>Address:</span> ${escapeHtml(addressParts)}</div><div><span>Payment Method:</span> <strong>${escapeHtml(order.paymentMethod || 'Unknown')}</strong></div></div><div class="order-items-wrapper"><div class="order-items-title"><i class="fa-solid fa-bag-shopping"></i> Purchased Products (${cartItems.length})</div><div class="order-items-list">${itemsHTML}</div></div></div><div class="order-admin-footer"><label class="fulfillment-control"><span style="font-size:0.75rem; color:#aaa;">Fulfilment:</span> <select class="fulfillment-select" data-order-id="${escapeHtml(order.id)}">${options}</select></label><strong class="order-admin-total">${money(order.total)}</strong></div></article>`;
        }).join('');
    } catch (error) { console.error('Orders failed to load:', error); container.innerHTML = '<p class="report-empty">Orders could not be loaded.</p>'; }
}

async function clearOrders() {
    if (!confirm("Are you sure you want to DELETE ALL past orders from the database? This action cannot be undone.")) return;
    const btn = document.getElementById("clear-orders-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }
    const container = document.getElementById("orders-list");
    if (container) {
        container.innerHTML = '<p class="report-empty"><i class="fa-solid fa-spinner fa-spin"></i> Deleting all orders from database...</p>';
    }
    try {
        const snapshot = await getDocs(collection(db, "orders"));
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "orders", d.id)));
        await Promise.all(deletePromises);
        await Promise.all([renderOrders(), renderReports()]);
        alert(`Successfully deleted ${snapshot.docs.length} order(s).`);
    } catch (e) {
        console.error("Failed to clear orders:", e);
        alert("Failed to clear orders: " + (e.message || e));
        await renderOrders();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Clear All Orders';
        }
    }
}

function initInteractions() {
    document.querySelectorAll('.period-btn').forEach(button => button.addEventListener('click', () => { reportPeriod = button.dataset.period; document.querySelectorAll('.period-btn').forEach(item => item.classList.toggle('active', item === button)); renderReports(); }));
    byId('orders-list')?.addEventListener('change', async event => {
        const select = event.target.closest('.fulfillment-select'); if (!select) return;
        try { await updateDoc(doc(db, 'orders', select.dataset.orderId), { fulfillmentStatus: select.value }); await Promise.all([renderReports(), renderOrders()]); }
        catch (error) { console.error('Status update failed:', error); alert('Could not update fulfilment status.'); renderOrders(); }
    });
    byId('clear-orders-btn')?.addEventListener('click', () => clearOrders());
}

initNavigation();
initInteractions();
window.clearOrders = clearOrders;
window.renderOrders = renderOrders;
window.renderReports = renderReports;
onAuthStateChanged(auth, user => { if (user) { renderOrders(); renderReports(); } });

