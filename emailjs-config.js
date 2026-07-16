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
    serviceId:  'YOUR_SERVICE_ID',   // e.g. 'service_abc123'
    templateId: 'YOUR_TEMPLATE_ID',  // e.g. 'template_xyz456'
    publicKey:  'YOUR_PUBLIC_KEY'    // e.g. 'AbCdEf_123456789'
};

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
