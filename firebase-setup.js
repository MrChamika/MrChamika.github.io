import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCH6IPHZpkf4KhA_NitxbCrnaSNzIgiyzI",
    authDomain: "jacket-f3072.firebaseapp.com",
    projectId: "jacket-f3072",
    storageBucket: "jacket-f3072.firebasestorage.app",
    messagingSenderId: "1018668382074",
    appId: "1:1018668382074:web:be895a2526e79c1cd508c3",
    measurementId: "G-V2KN9MBRKG"
};

const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) { /* Analytics may fail on localhost */ }
export const db = getFirestore(app);

// Enable offline persistence for instant loading & offline resilience
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence unsupported in browser');
    }
});

export const auth = getAuth(app);
export const storage = getStorage(app);

// Seed function if DB is empty
export async function seedInitialProducts() {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    if (snapshot.empty) {
        const defaultProducts = [
            {
                id: '1',
                title: 'Apex Fire Puffer',
                price: 14900,
                description: 'Vibrant emergency orange outer layer with full heat retention lining, weather-proofing, and custom pull chords.',
                theme: 'orange',
                badge: 'Best Seller',
                image: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=600&auto=format&fit=crop&q=80',
                sizes: ['S', 'M', 'L', 'XL'],
                colors: [{ name: 'Fire Orange', hex: '#ff6a00' }, { name: 'Shadow Black', hex: '#333333' }]
            },
            {
                id: '2',
                title: 'Tundra Ice Shell',
                price: 16900,
                description: 'Alpine white and ice blue dual-tone weather shield. Built for active skiing, snowboard maneuvers, and extreme sub-zero conditions.',
                theme: 'blue',
                badge: 'New Arrival',
                image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                colors: [{ name: 'Ice Blue', hex: '#00d2ff' }, { name: 'Arctic White', hex: '#f0f0f0' }]
            },
            {
                id: '3',
                title: 'Obsidian Shadow Coat',
                price: 18900,
                description: 'Stealth matte black shell with custom quilted lines. Features magnetic pockets, water-repellent zippers, and high loft goose down filling.',
                theme: 'black',
                badge: 'Limited Edition',
                image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80',
                sizes: ['M', 'L', 'XL', 'XXL'],
                colors: [{ name: 'Shadow Black', hex: '#333333' }, { name: 'Arctic White', hex: '#f0f0f0' }]
            }
        ];

        for (const prod of defaultProducts) {
            await setDoc(doc(db, 'products', prod.id), prod);
        }
        console.log('Database seeded with default products.');
    }
}

// Ensure default checkout payment methods exist in Firestore
export async function seedPaymentMethods() {
    const defaults = [
        { name: 'Cash on Delivery', type: 'cod' },
        { name: 'Card Payment (PayHere)', type: 'payhere' }
    ];

    try {
        const pmRef = collection(db, 'payment_methods');
        const snapshot = await getDocs(pmRef);
        const existing = new Set();
        snapshot.forEach((d) => {
            const n = (d.data().name || '').toLowerCase().trim();
            if (n) existing.add(n);
        });

        for (const method of defaults) {
            if (!existing.has(method.name.toLowerCase())) {
                await addDoc(pmRef, method);
                console.log('Added payment method:', method.name);
            }
        }
    } catch (e) {
        console.error('Error seeding payment methods:', e);
    }
}

// --- Minimal MD5 (PayHere payment hash) ---
function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
}
function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
function md51(s) {
    var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
    s = s.substring(i - 64);
    var tail = new Array(16).fill(0);
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
}
function md5blk(s) {
    var md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
}
function rhex(n) {
    var hex_chr = '0123456789abcdef', s = '', j;
    for (j = 0; j < 4; j++) s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0F) + hex_chr.charAt((n >> (j * 8)) & 0x0F);
    return s;
}
function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
function md5(s) { return md51(s).map(rhex).join(''); }

/** PayHere hash = upper(md5(merchant_id + order_id + amount + currency + upper(md5(merchant_secret)))) */
export function buildPayHereHash(merchantId, orderId, amount, currency, merchantSecret) {
    const amountStr = Number(amount).toFixed(2);
    const secretHash = md5(merchantSecret).toUpperCase();
    return md5(merchantId + orderId + amountStr + currency + secretHash).toUpperCase();
}

// Fetch PayHere merchant config from Firestore settings
export async function getPayHereConfig() {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'payhere'));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        console.warn('PayHere settings not found in Firestore (settings > payhere).');
        return null;
    } catch (e) {
        console.error('Error fetching PayHere config:', e);
        return null;
    }
}

export async function savePayHereConfig(config) {
    await setDoc(doc(db, 'settings', 'payhere'), {
        merchant_id: (config.merchant_id || '').trim(),
        merchant_secret: (config.merchant_secret || '').trim(),
        notify_url: (config.notify_url || '').trim(),
        sandbox: config.sandbox !== false,
        updatedAt: new Date().toISOString()
    }, { merge: true });
}
