// Firebase Configuration for SkyView Digital Booking System
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getDatabase, ref, set, get, push, onValue, off, remove } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

console.log('🔥 Loading Firebase configuration...');

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyD4rgeGO5BkVDRvtBrGNI0njgkB8yuI37k",
    authDomain: "skyview-booking.firebaseapp.com",
    databaseURL: "https://skyview-booking-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "skyview-booking",
    storageBucket: "skyview-booking.firebasestorage.app",
    messagingSenderId: "758993828969",
    appId: "1:758993828969:web:31e17e19dd7c5a3fd5b6f8",
    measurementId: "G-46BNCXET85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

console.log('🔥 Firebase initialized with Analytics');

// Firebase Database Helper Class
class FirebaseBookingManager {
    constructor() {
        this.database = database;
        this.bookedSlotsRef = ref(database, 'bookedSlots');
        this.bookingsRef = ref(database, 'bookings');
        this.listeners = new Map();
        
        console.log('🔥 Firebase Booking Manager initialized');
    }

    // Get all booked slots
    async getBookedSlots() {
        try {
            const snapshot = await get(this.bookedSlotsRef);
            if (snapshot.exists()) {
                const slots = snapshot.val();
                return Object.keys(slots).filter(key => slots[key] === true);
            }
            return [];
        } catch (error) {
            console.error('❌ Error getting booked slots:', error);
            return [];
        }
    }

    // Book a time slot
    async bookTimeSlot(timeKey) {
        try {
            const slotRef = ref(this.database, `bookedSlots/${timeKey.replace(/[.#$[\]]/g, '_')}`);
            await set(slotRef, true);
            console.log('✅ Time slot booked in Firebase:', timeKey);
            return true;
        } catch (error) {
            console.error('❌ Error booking time slot:', error);
            return false;
        }
    }

    // Cancel a time slot booking
    async cancelTimeSlot(timeKey) {
        try {
            const slotRef = ref(this.database, `bookedSlots/${timeKey.replace(/[.#$[\]]/g, '_')}`);
            await remove(slotRef);
            console.log('✅ Time slot cancelled in Firebase:', timeKey);
            return true;
        } catch (error) {
            console.error('❌ Error cancelling time slot:', error);
            return false;
        }
    }

    // Save booking details
    async saveBooking(bookingData) {
        try {
            const bookingRef = push(this.bookingsRef);
            const booking = {
                ...bookingData,
                id: bookingRef.key,
                createdAt: new Date().toISOString(),
                cancelled: false
            };
            
            await set(bookingRef, booking);
            console.log('✅ Booking saved to Firebase:', booking.id);
            return booking;
        } catch (error) {
            console.error('❌ Error saving booking:', error);
            throw error;
        }
    }

    // Get all bookings
    async getAllBookings() {
        try {
            const snapshot = await get(this.bookingsRef);
            if (snapshot.exists()) {
                const bookingsObj = snapshot.val();
                return Object.values(bookingsObj);
            }
            return [];
        } catch (error) {
            console.error('❌ Error getting bookings:', error);
            return [];
        }
    }

    // Cancel booking
    async cancelBooking(bookingId) {
        try {
            // Get the booking first
            const bookingRef = ref(this.database, `bookings/${bookingId}`);
            const snapshot = await get(bookingRef);
            
            if (snapshot.exists()) {
                const booking = snapshot.val();
                
                // Cancel the time slot
                await this.cancelTimeSlot(booking.timeKey);
                
                // Mark booking as cancelled
                await set(ref(this.database, `bookings/${bookingId}/cancelled`), true);
                
                console.log('✅ Booking cancelled:', bookingId);
                return booking;
            } else {
                console.error('❌ Booking not found:', bookingId);
                return null;
            }
        } catch (error) {
            console.error('❌ Error cancelling booking:', error);
            return null;
        }
    }

    // Listen for real-time updates to booked slots
    onBookedSlotsChange(callback) {
        const listenerId = 'bookedSlots_' + Date.now();
        
        const unsubscribe = onValue(this.bookedSlotsRef, (snapshot) => {
            if (snapshot.exists()) {
                const slots = snapshot.val();
                const bookedSlots = Object.keys(slots).filter(key => slots[key] === true);
                callback(bookedSlots);
            } else {
                callback([]);
            }
        }, (error) => {
            console.error('❌ Error listening to booked slots:', error);
        });

        this.listeners.set(listenerId, unsubscribe);
        return listenerId;
    }

    // Listen for real-time updates to bookings
    onBookingsChange(callback) {
        const listenerId = 'bookings_' + Date.now();
        
        const unsubscribe = onValue(this.bookingsRef, (snapshot) => {
            if (snapshot.exists()) {
                const bookingsObj = snapshot.val();
                const bookings = Object.values(bookingsObj);
                callback(bookings);
            } else {
                callback([]);
            }
        }, (error) => {
            console.error('❌ Error listening to bookings:', error);
        });

        this.listeners.set(listenerId, unsubscribe);
        return listenerId;
    }

    // Stop listening to changes
    stopListening(listenerId) {
        if (this.listeners.has(listenerId)) {
            const unsubscribe = this.listeners.get(listenerId);
            unsubscribe();
            this.listeners.delete(listenerId);
            console.log('🔇 Stopped listening:', listenerId);
        }
    }

    // Stop all listeners
    stopAllListeners() {
        this.listeners.forEach((unsubscribe, listenerId) => {
            unsubscribe();
            console.log('🔇 Stopped listening:', listenerId);
        });
        this.listeners.clear();
    }

    // Check if time slot is available (real-time check)
    async isTimeSlotAvailable(timeKey) {
        try {
            const slotRef = ref(this.database, `bookedSlots/${timeKey.replace(/[.#$[\]]/g, '_')}`);
            const snapshot = await get(slotRef);
            return !snapshot.exists() || snapshot.val() !== true;
        } catch (error) {
            console.error('❌ Error checking time slot availability:', error);
            return false;
        }
    }

    // Migrate existing localStorage data to Firebase (one-time migration)
    async migrateLocalStorageData() {
        try {
            console.log('🔄 Starting localStorage to Firebase migration...');
            
            // Migrate booked slots
            const existingSlots = JSON.parse(localStorage.getItem('bookedSlots') || '[]');
            if (existingSlots.length > 0) {
                console.log(`📤 Migrating ${existingSlots.length} booked slots...`);
                for (const timeKey of existingSlots) {
                    await this.bookTimeSlot(timeKey);
                }
                console.log('✅ Booked slots migrated');
            }

            // Migrate bookings
            const existingBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            if (existingBookings.length > 0) {
                console.log(`📤 Migrating ${existingBookings.length} bookings...`);
                for (const booking of existingBookings) {
                    // Remove the old ID and let Firebase generate a new one
                    const { id, ...bookingData } = booking;
                    await this.saveBooking(bookingData);
                }
                console.log('✅ Bookings migrated');
            }

            console.log('🎉 Migration completed successfully!');
            
            // Optionally clear localStorage after successful migration
            // localStorage.removeItem('bookedSlots');
            // localStorage.removeItem('bookings');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }
}

// Global Firebase manager instance
window.firebaseBookingManager = new FirebaseBookingManager();

// Export for module use
export { FirebaseBookingManager, database, analytics };

console.log('🔥 Firebase configuration loaded and ready with Analytics!');