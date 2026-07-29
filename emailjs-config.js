// ============================================================
// emailjs-config.js — Order Confirmation Email Helper
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://www.emailjs.com → Create free account
// 2. Add Email Service (Gmail/Outlook) → copy Service ID
// 3. Create Email Template with these variables:
//    {{order_id}}, {{customer_name}}, {{customer_email}},
//    {{items_list}}, {{subtotal}}, {{shipping}}, {{total}},
//    {{address}}, {{payment_method}}
//    Copy the Template ID.
// 4. Go to Account > API Keys → copy Public Key
// 5. Replace the three values below
// ============================================================

const EMAILJS_CONFIG = {
    serviceId:  'service_axf5ok8',
    templateId: 'YOUR_CUSTOMER_TEMPLATE_ID',  // Replace with your customer confirmation template ID
    publicKey:  'jhxzJXLT4GMJ-FaEy'
};

const EMAILJS_CONTACT_CONFIG = {
    serviceId:  'service_axf5ok8',
    templateId: 'template_6hjvccv',
    publicKey:  'jhxzJXLT4GMJ-FaEy'
};

export async function sendContactMessage({ name, email, phone, message }) {
    if (!window.emailjs) {
        throw new Error('EmailJS SDK not loaded');
    }
    emailjs.init(EMAILJS_CONTACT_CONFIG.publicKey);
    await emailjs.send(
        EMAILJS_CONTACT_CONFIG.serviceId,
        EMAILJS_CONTACT_CONFIG.templateId,
        { name, email, phone, message, time: new Date().toLocaleString() }
    );
}


export async function sendOrderConfirmation(orderData) {
    if (EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID') {
        console.log('📧 EmailJS not configured — skipping email. See emailjs-config.js to set up.');
        return false;
    }

    if (!window.emailjs) {
        console.warn('EmailJS SDK not loaded on this page.');
        return false;
    }

    const itemsList = (orderData.cart || [])
        .map(item =>
            `• ${item.title} | Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity} — Rs. ${(item.price * item.quantity).toLocaleString()}`
        )
        .join('\n');

    const subtotal = (orderData.cart || []).reduce((s, i) => s + i.price * i.quantity, 0);

    const params = {
        order_id:       orderData.orderId     || 'N/A',
        customer_name:  `${orderData.fname || ''} ${orderData.lname || ''}`.trim(),
        customer_email: orderData.email       || '',
        items_list:     itemsList,
        subtotal:       `Rs. ${subtotal.toLocaleString()}`,
        shipping:       'Rs. 500',
        total:          `Rs. ${(orderData.total || subtotal + 500).toLocaleString()}`,
        address:        `${orderData.address || ''}, ${orderData.city || ''} ${orderData.zip || ''}`,
        payment_method: orderData.paymentMethod || 'N/A'
    };

    try {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params);
        console.log('✅ Order confirmation email sent to', orderData.email);
        return true;
    } catch (err) {
        console.error('❌ Failed to send email:', err);
        return false;
    }
}
const EMAILJS_ADMIN_CONFIG = {
    serviceId:  'service_axf5ok8',
    templateId: 'template_0aq6whq',
    publicKey:  'jhxzJXLT4GMJ-FaEy'
};

export async function sendAdminOrderNotification(orderData) {
    if (!window.emailjs) {
        console.warn('EmailJS SDK not loaded on this page.');
        return false;
    }

    var items = (orderData.cart || []).map(function(item) {
        return {
            name: item.title,
            size: item.size || '',
            color: item.color || '',
            units: item.quantity,
            price: String(item.price * item.quantity)
        };
    });

    var subtotal = 0;
    (orderData.cart || []).forEach(function(i) { subtotal += i.price * i.quantity; });

    var name = (orderData.fname || '') + ' ' + (orderData.lname || '');
    name = name.trim() || 'N/A';

    var addr = (orderData.address || '') + ', ' + (orderData.city || '') + ' ' + (orderData.zip || '');
    addr = addr.trim();

    var params = {
        admin_email: 'italiontailors@gmail.com',
        order_id:       orderData.orderId || 'N/A',
        customer_name:  name,
        customer_email: orderData.email || '',
        customer_phone: orderData.phone || '',
        address:        addr,
        payment_method: orderData.paymentMethod || 'N/A',
        order_date:     orderData.date ? new Date(orderData.date).toLocaleString() : new Date().toLocaleString(),
        orders: items,
        cost: {
            shipping: '500',
            subtotal: String(subtotal),
            total: String(orderData.total || subtotal + 500)
        }
    };

    try {
        emailjs.init(EMAILJS_ADMIN_CONFIG.publicKey);
        await emailjs.send(EMAILJS_ADMIN_CONFIG.serviceId, EMAILJS_ADMIN_CONFIG.templateId, params);
        console.log('Admin order notification sent.');
        return true;
    } catch (err) {
        console.error('Failed to send admin notification:', err);
        return false;
    }
}
