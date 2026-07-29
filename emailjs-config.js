// ============================================================
// emailjs-config.js Ã¢â‚¬â€ Order Confirmation Email Helper
// ============================================================
// SETUP INSTRUCTIONS:
// 1. Go to https://www.emailjs.com Ã¢â€ â€™ Create free account
// 2. Add Email Service (Gmail/Outlook) Ã¢â€ â€™ copy Service ID
// 3. Create Email Template with these variables:
//    {{order_id}}, {{customer_name}}, {{customer_email}},
//    {{items_list}}, {{subtotal}}, {{shipping}}, {{total}},
//    {{address}}, {{payment_method}}
//    Copy the Template ID.
// 4. Go to Account > API Keys Ã¢â€ â€™ copy Public Key
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
    if (EMAILJS_CONFIG.templateId === 'YOUR_CUSTOMER_TEMPLATE_ID') {
        console.log('Customer confirmation email not configured - skipping.');
        return false;
    }

    if (!window.emailjs) {
        console.warn('EmailJS SDK not loaded on this page.');
        return false;
    }

    const itemsList = (orderData.cart || [])
        .map(item =>
            `Ã¢â‚¬Â¢ ${item.title} | Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity} Ã¢â‚¬â€ Rs. ${(item.price * item.quantity).toLocaleString()}`
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
        console.log('Ã¢Å“â€¦ Order confirmation email sent to', orderData.email);
        return true;
    } catch (err) {
        console.error('Ã¢ÂÅ’ Failed to send email:', err);
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

    var items_flat = (orderData.cart || []).map(function(item) {
        var qty = Number(item.quantity) || 0;
        var price = Number(item.price) || 0;
        var total = price * qty;
        return (item.title || 'Item') + ' | Size: ' + (item.size || 'N/A') + ' | Color: ' + (item.color || 'N/A') + ' | Qty: ' + qty + ' - Rs. ' + total;
    }).join('\n') || '(no items)';

    var subtotal = 0;
    (orderData.cart || []).forEach(function(i) { var p = Number(i.price) || 0; var q = Number(i.quantity) || 0; subtotal += p * q; });
    var addr = (orderData.address || '') + ', ' + (orderData.city || '') + ' ' + (orderData.zip || '');

    var name = (orderData.fname || '') + ' ' + (orderData.lname || '');
    name = name.trim() || 'N/A';
    addr = addr.trim();

    var params = {
        admin_email: 'Piyumalc11@gmail.com',
        order_id:       orderData.orderId || 'N/A',
        customer_name:  name,
        customer_email: orderData.email || '',
        customer_phone: orderData.phone || '',
        address:        addr,
        payment_method: orderData.paymentMethod || 'N/A',
        order_date:     orderData.date ? new Date(orderData.date).toLocaleString() : new Date().toLocaleString(),
        items_flat:     items_flat,
        subtotal_flat:  'Rs. ' + Number(subtotal).toLocaleString(),
        total_flat:     'Rs. ' + Number(orderData.total || subtotal + 500).toLocaleString()
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
