import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
try { getAnalytics(app); } catch(e) { /* Analytics may fail on localhost */ }
export const db = getFirestore(app);
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
                sizes: ['S','M','L','XL'],
                colors: [{name:'Fire Orange',hex:'#ff6a00'},{name:'Shadow Black',hex:'#333333'}]
            },
            {
                id: '2',
                title: 'Tundra Ice Shell',
                price: 16900,
                description: 'Alpine white and ice blue dual-tone weather shield. Built for active skiing, snowboard maneuvers, and extreme sub-zero conditions.',
                theme: 'blue',
                badge: 'New Arrival',
                image: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
                sizes: ['S','M','L','XL','XXL'],
                colors: [{name:'Ice Blue',hex:'#00d2ff'},{name:'Arctic White',hex:'#f0f0f0'}]
            },
            {
                id: '3',
                title: 'Obsidian Shadow Coat',
                price: 18900,
                description: 'Stealth matte black shell with custom quilted lines. Features magnetic pockets, water-repellent zippers, and high loft goose down filling.',
                theme: 'black',
                badge: 'Limited Edition',
                image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80',
                sizes: ['M','L','XL','XXL'],
                colors: [{name:'Shadow Black',hex:'#333333'},{name:'Arctic White',hex:'#f0f0f0'}]
            }
        ];
        
        for (const prod of defaultProducts) {
            await setDoc(doc(db, 'products', prod.id), prod);
        }
        console.log('Database seeded with default products.');
    }
}
