// Advanced Booking System for SkyView Digital
// Handles calendar, time slots, and booking management with Firebase integration

class BookingSystem {
    constructor() {
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentCalendarMonth = new Date().getMonth();
        this.currentCalendarYear = new Date().getFullYear();
        this.bookedSlots = new Set();
        this.firebaseManager = null;
        this.bookedSlotsListener = null;
        this.isFirebaseReady = false;
        
        // Initialize Firebase when available
        this.initFirebase();
    }
    
    // Initialize Firebase connection
    async initFirebase() {
        this.updateFirebaseStatus(false, false);
        
        try {
            // Wait for Firebase to be available with retry logic
            let retries = 0;
            const maxRetries = 10;
            
            while (retries < maxRetries) {
                if (typeof window.firebaseBookingManager !== 'undefined') {
                    this.updateFirebaseStatus(true, false);
                    this.firebaseManager = window.firebaseBookingManager;
                    await this.loadBookedSlotsFromFirebase();
                    this.setupFirebaseListeners();
                    this.isFirebaseReady = true;
                    this.updateFirebaseStatus(true, true);
                    console.log('✅ Firebase integration ready');
                    return;
                }
                
                // Wait 500ms before next retry
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            // If Firebase is still not available after retries, use localStorage
            console.log('⚠️ Firebase not available after retries, using localStorage fallback');
            this.bookedSlots = new Set(JSON.parse(localStorage.getItem('bookedSlots') || '[]'));
            this.updateFirebaseStatus(false, false);
            
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            // Fallback to localStorage
            this.bookedSlots = new Set(JSON.parse(localStorage.getItem('bookedSlots') || '[]'));
            this.updateFirebaseStatus(false, false);
        }
    }
    
    // Load booked slots from Firebase
    async loadBookedSlotsFromFirebase() {
        if (!this.firebaseManager) return;
        
        try {
            const slots = await this.firebaseManager.getBookedSlots();
            this.bookedSlots = new Set(slots);
            console.log('📊 Loaded booked slots from Firebase:', slots.length);
        } catch (error) {
            console.error('❌ Error loading booked slots:', error);
        }
    }
    
    // Setup Firebase real-time listeners
    setupFirebaseListeners() {
        if (!this.firebaseManager) return;
        
        // Listen for changes to booked slots
        this.bookedSlotsListener = this.firebaseManager.onBookedSlotsChange((updatedSlots) => {
            console.log('🔄 Real-time update: booked slots changed', updatedSlots);
            const previousSlots = new Set([...this.bookedSlots]);
            this.bookedSlots = new Set(updatedSlots);
            
            // Show visual feedback for real-time updates
            this.showRealtimeUpdateNotification(previousSlots, this.bookedSlots);
            
            // Check if current time slot display needs updating
            if (this.selectedDate && this.hasSlotChanges(previousSlots, this.bookedSlots)) {
                console.log('🔄 Updating time slot display due to real-time changes');
                this.updateTimeSlotDisplay();
            }
        });
    }
    
    // Check if there are relevant slot changes for current date
    hasSlotChanges(oldSlots, newSlots) {
        if (!this.selectedDate) return false;
        
        const dateStr = this.selectedDate.toDateString();
        const relevantOldSlots = [...oldSlots].filter(slot => slot.startsWith(dateStr));
        const relevantNewSlots = [...newSlots].filter(slot => slot.startsWith(dateStr));
        
        return relevantOldSlots.length !== relevantNewSlots.length || 
               !relevantOldSlots.every(slot => newSlots.has(slot));
    }

    // Get available hours based on day of week
    getAvailableHoursForDate(date) {
        if (!date) return [];
        const dayOfWeek = date.getDay();
        
        // Sunday (0) - no hours available
        if (dayOfWeek === 0) {
            return [];
        }
        // Saturday (6) - special hours 8:00-20:00 (every hour)
        else if (dayOfWeek === 6) {
            const hours = [];
            for (let hour = 8; hour <= 20; hour++) {
                hours.push(`${hour}:00`);
            }
            return hours;
        }
        // Weekdays (Monday-Friday) - early morning + evening hours
        else {
            return ['4:00', '5:00', '18:00', '19:00', '20:00', '21:00'];
        }
    }

    // Initialize the booking widget
    init() {
        this.generateCalendar();
        this.setupCalendarNavigation();
        this.setupFormSubmission();
        this.setupPageUnloadHandler();
        
        // Make functions globally available
        window.getSelectedDateTime = () => ({
            date: this.selectedDate,
            time: this.selectedTime
        });
        
        window.resetCalendarSelection = () => {
            this.selectedDate = null;
            this.selectedTime = null;
            this.updateTimeSlotDisplay();
        };
        
        window.bookTimeSlot = (date, time, bookingData) => {
            return this.bookTimeSlot(date, time, bookingData);
        };
    }
    
    // Setup page unload handler to clean up Firebase listeners
    setupPageUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            if (this.firebaseManager) {
                this.firebaseManager.stopAllListeners();
                console.log('🧹 Firebase listeners cleaned up');
            }
        });
    }
    
    // Update Firebase connection status (console only)
    updateFirebaseStatus(isConnected, isReady = false) {
        if (isReady) {
            console.log('🔥 Firebase Status: Synchronizacja aktywna - rezerwacje synchronizowane w czasie rzeczywistym');
        } else if (isConnected) {
            console.log('🔥 Firebase Status: Łączenie z bazą danych...');
        } else {
            console.log('🔥 Firebase Status: Tryb lokalny - używa localStorage');
        }
    }
    
    // Show notification about real-time updates (console only)
    showRealtimeUpdateNotification(previousSlots, newSlots) {
        // Check if we're on the right date and there are relevant changes
        if (!this.selectedDate) return;
        
        const dateStr = this.selectedDate.toDateString();
        const previousRelevant = [...previousSlots].filter(slot => slot.startsWith(dateStr));
        const newRelevant = [...newSlots].filter(slot => slot.startsWith(dateStr));
        
        // If there are more slots now than before, someone booked
        if (newRelevant.length > previousRelevant.length) {
            console.log('🔔 Real-time update: Nowa rezerwacja została dodana przez innego użytkownika');
        }
    }

    // Generate calendar
    generateCalendar(month = this.currentCalendarMonth, year = this.currentCalendarYear) {
        const calendarGrid = document.querySelector('.calendar-widget .grid-cols-7:last-child');
        if (!calendarGrid) return;
        
        const today = new Date();
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 2);
        
        this.currentCalendarMonth = month;
        this.currentCalendarYear = year;
        
        this.updateCalendarHeader(month, year);
        
        // Clear existing days
        calendarGrid.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before month starts
        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'p-2';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('button');
            dayElement.className = 'calendar-day p-2 text-center hover:bg-primary hover:text-white rounded transition font-space';
            dayElement.textContent = day;
            
            const dayDate = new Date(year, month, day);
            const dayOfWeek = dayDate.getDay();
            const isToday = dayDate.toDateString() === today.toDateString();
            
            // Check if this day has available hours
            const availableHours = this.getAvailableHoursForDate(dayDate);
            
            // Disable past dates, days without hours, and dates beyond max range
            if (dayDate < today || availableHours.length === 0 || dayDate > maxDate) {
                dayElement.disabled = true;
                dayElement.className += ' text-gray-400 cursor-not-allowed opacity-50';
                
                // Add tooltip for Sunday
                if (dayOfWeek === 0) {
                    dayElement.title = 'Niedostępne w niedziele';
                }
            } else if (isToday) {
                dayElement.className += ' ring-2 ring-accent ring-opacity-50';
            }
            
            // Add tooltip for Saturday
            if (dayOfWeek === 6 && availableHours.length > 0) {
                dayElement.title = 'Sobota - godziny 8:00-20:00';
            }
            
            dayElement.addEventListener('click', () => this.selectDate(dayDate, dayElement));
            
            calendarGrid.appendChild(dayElement);
        }
    }

    // Select a date
    selectDate(date, element) {
        if (element.disabled) return;
        
        // Remove selected class from other days
        document.querySelectorAll('.calendar-day').forEach(d => {
            d.classList.remove('bg-primary', 'text-white');
        });
        
        // Add selected class to clicked day
        element.classList.add('bg-primary', 'text-white');
        this.selectedDate = date;
        this.selectedTime = null; // Reset time selection
        
        // Update time slots display
        this.updateTimeSlotDisplay();
    }

    // Update time slot display based on selected date
    updateTimeSlotDisplay() {
        const timeSlotsContainer = document.getElementById('time-slots-container');
        if (!timeSlotsContainer) return;
        
        // Clear current content
        timeSlotsContainer.innerHTML = '';
        
        if (!this.selectedDate) {
            timeSlotsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Wybierz datę w kalendarzu powyżej</p>';
            return;
        }
        
        const availableHours = this.getAvailableHoursForDate(this.selectedDate);
        const dayOfWeek = this.selectedDate.getDay();
        
        // Show day info
        const dayInfo = document.createElement('div');
        dayInfo.className = 'mb-4 text-center';
        const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const monthNames = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
                           'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
        
        dayInfo.innerHTML = `
            <h4 class="font-semibold text-lg mb-2">
                ${dayNames[dayOfWeek]}, ${this.selectedDate.getDate()} ${monthNames[this.selectedDate.getMonth()]}
            </h4>
            <p class="text-sm text-gray-600">
                ${dayOfWeek === 6 ? 'Godziny weekendowe (8:00-20:00)' : 'Godziny standardowe (4:00-5:00, 18:00-21:00)'}
            </p>
        `;
        timeSlotsContainer.appendChild(dayInfo);
        
        if (availableHours.length === 0) {
            timeSlotsContainer.innerHTML += '<p class="text-gray-500 text-center">Brak dostępnych godzin w tym dniu</p>';
            return;
        }
        
        // Create time slots grid
        const slotsGrid = document.createElement('div');
        slotsGrid.className = dayOfWeek === 6 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2';
        
        availableHours.forEach(hour => {
            const button = document.createElement('button');
            button.className = 'time-slot p-3 border rounded hover:bg-primary hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed';
            button.textContent = hour;
            
            // Check if this slot is booked
            const timeKey = `${this.selectedDate.toDateString()}-${hour}`;
            if (this.bookedSlots.has(timeKey)) {
                button.disabled = true;
                button.className += ' opacity-50 cursor-not-allowed bg-red-50';
                button.innerHTML = `${hour} <small class="block text-xs text-red-500">(Zajęte)</small>`;
            }
            
            button.addEventListener('click', () => this.selectTimeSlot(hour, button));
            slotsGrid.appendChild(button);
        });
        
        timeSlotsContainer.appendChild(slotsGrid);
    }

    // Select a time slot
    async selectTimeSlot(time, element) {
        if (element.disabled) return;
        
        // Real-time availability check
        const timeKey = `${this.selectedDate.toDateString()}-${time}`;
        
        if (this.firebaseManager && this.isFirebaseReady) {
            // Check availability in Firebase
            const isAvailable = await this.firebaseManager.isTimeSlotAvailable(timeKey);
            if (!isAvailable) {
                alert('⚠️ Ten termin został właśnie zarezerwowany przez inną osobę. Proszę wybrać inny termin.');
                await this.loadBookedSlotsFromFirebase();
                this.updateTimeSlotDisplay();
                return;
            }
        } else {
            // Fallback to localStorage check
            const currentBookedSlots = new Set(JSON.parse(localStorage.getItem('bookedSlots') || '[]'));
            if (currentBookedSlots.has(timeKey)) {
                alert('⚠️ Ten termin został właśnie zarezerwowany przez inną osobę. Proszę wybrać inny termin.');
                this.bookedSlots = currentBookedSlots;
                this.updateTimeSlotDisplay();
                return;
            }
        }
        
        // Remove selected class from other slots
        document.querySelectorAll('.time-slot').forEach(s => {
            s.classList.remove('selected', 'bg-primary', 'text-white');
        });
        
        // Add selected class to clicked slot
        element.classList.add('selected', 'bg-primary', 'text-white');
        this.selectedTime = time;
    }

    // Book a time slot
    async bookTimeSlot(date, time, bookingData) {
        const timeKey = `${date.toDateString()}-${time}`;
        
        try {
            let booking;
            
            if (this.firebaseManager && this.isFirebaseReady) {
                // Use Firebase
                console.log('📝 Saving booking to Firebase...');
                
                // Double-check availability before booking
                const isAvailable = await this.firebaseManager.isTimeSlotAvailable(timeKey);
                if (!isAvailable) {
                    throw new Error('Time slot is no longer available');
                }
                
                // Book the time slot
                await this.firebaseManager.bookTimeSlot(timeKey);
                
                // Save booking details
                const bookingDetails = {
                    date: date.toISOString(),
                    time: time,
                    timeKey: timeKey,
                    ...bookingData
                };
                
                booking = await this.firebaseManager.saveBooking(bookingDetails);
                
                // Update local cache
                this.bookedSlots.add(timeKey);
                
            } else {
                // Fallback to localStorage
                console.log('📝 Saving booking to localStorage (Firebase not available)...');
                
                this.bookedSlots.add(timeKey);
                localStorage.setItem('bookedSlots', JSON.stringify([...this.bookedSlots]));
                
                const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
                booking = {
                    id: Date.now().toString(),
                    date: date.toISOString(),
                    time: time,
                    timeKey: timeKey,
                    ...bookingData,
                    createdAt: new Date().toISOString(),
                    cancelled: false
                };
                bookings.push(booking);
                localStorage.setItem('bookings', JSON.stringify(bookings));
            }
            
            // Send notifications
            await this.sendBookingNotifications(booking);
            
            this.updateTimeSlotDisplay();
            return booking;
            
        } catch (error) {
            console.error('❌ Booking failed:', error);
            
            if (error.message === 'Time slot is no longer available') {
                alert('⚠️ Ten termin został właśnie zarezerwowany przez inną osobę. Proszę wybrać inny termin.');
                if (this.firebaseManager) {
                    await this.loadBookedSlotsFromFirebase();
                }
                this.updateTimeSlotDisplay();
            }
            
            throw error;
        }
    }

    // Send booking notifications
    async sendBookingNotifications(booking) {
        // Get day of week name
        const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const bookingDate = new Date(booking.date);
        const dayOfWeek = dayNames[bookingDate.getDay()];
        const formattedDate = `${dayOfWeek}, ${bookingDate.toLocaleDateString('pl-PL')}`;
        
        // Try to send email notifications via EmailJS
        if (typeof emailjs !== 'undefined') {
            console.log('📧 Attempting to send emails...');
            console.log('📋 Booking data:', booking);
            
            try {
                // Send notification to admin
                console.log('📤 Sending admin notification to dron.marketingweb@gmail.com...');
                const adminResult = await emailjs.send('service_deau84a', 'template_mcc1e8k', {
                    from_name: booking.name,
                    from_email: booking.email,
                    company: booking.company,
                    date: formattedDate,
                    day_of_week: dayOfWeek,
                    time: booking.time,
                    phone: booking.phone || 'Nie podano',
                    industry: booking.industry,
                    description: booking.description || 'Brak opisu',
                    budget: booking.budget
                });
                console.log('✅ Admin email sent successfully:', adminResult);

                // Send confirmation to client
                console.log(`📤 Sending client confirmation to ${booking.email}...`);
                const clientResult = await emailjs.send('service_deau84a', 'template_tf7482v', {
                    to_name: booking.name,
                    to_email: booking.email,
                    date: formattedDate,
                    day_of_week: dayOfWeek,
                    time: booking.time
                });
                console.log('✅ Client email sent successfully:', clientResult);

                console.log('✅ All emails sent successfully!');
                alert('✅ Potwierdzenie rezerwacji zostało wysłane na Twój email!');
            } catch (error) {
                console.error('❌ Email sending error:', error);
                console.error('Error details:', {
                    message: error.message,
                    text: error.text,
                    status: error.status
                });
                alert('⚠️ Rezerwacja zapisana, ale wystąpił problem z wysłaniem emaila. Skontaktujemy się telefonicznie.');
            }
        } else {
            console.log('⚠️ EmailJS nie jest skonfigurowany - emaile nie zostały wysłane');
            console.log('📧 Dane rezerwacji:', booking);
        }
        
        // Send Telegram notification to admin
        this.sendTelegramNotification(booking);
    }
    
    // Send Telegram notification
    async sendTelegramNotification(booking) {
        // UWAGA: Wstaw swój token bota poniżej (otrzymałeś go od BotFather)
        const TELEGRAM_BOT_TOKEN = '8386380132:AAGM8WwW9-YB4u1_2BmMZNF__kGzVyubLSM'; // <-- MUSISZ TO UZUPEŁNIĆ!
        const TELEGRAM_CHAT_ID = '5902050669'; // Twój Chat ID (Karol Grankers)
        
        // Jeśli token nie jest ustawiony, pomiń wysyłanie
        if (TELEGRAM_BOT_TOKEN === 'TUTAJ_WSTAW_TOKEN_BOTA') {
            console.log('⚠️ Telegram Bot Token nie jest skonfigurowany');
            return;
        }
        
        const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        const bookingDate = new Date(booking.date);
        const dayOfWeek = dayNames[bookingDate.getDay()];
        
        // Formatuj wiadomość
        const message = `🔔 <b>NOWA REZERWACJA!</b>\n\n` +
            `👤 <b>Klient:</b> ${booking.name}\n` +
            `📧 <b>Email:</b> ${booking.email}\n` +
            `📞 <b>Telefon:</b> ${booking.phone || 'Nie podano'}\n` +
            `🏢 <b>Firma:</b> ${booking.company}\n` +
            `🏭 <b>Branża:</b> ${booking.industry}\n\n` +
            `📅 <b>Data:</b> ${dayOfWeek}, ${bookingDate.toLocaleDateString('pl-PL')}\n` +
            `⏰ <b>Godzina:</b> ${booking.time}\n\n` +
            `💼 <b>Budżet:</b> ${booking.budget}\n\n` +
            `📝 <b>Opis projektu:</b>\n${booking.description || 'Brak opisu'}\n\n` +
            `🆔 <b>ID rezerwacji:</b> ${booking.id}`;
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            const result = await response.json();
            
            if (result.ok) {
                console.log('✅ Powiadomienie Telegram wysłane pomyślnie');
            } else {
                console.error('❌ Błąd wysyłania Telegram:', result);
            }
        } catch (error) {
            console.error('❌ Błąd połączenia z Telegram:', error);
        }
    }

    // Update calendar header
    updateCalendarHeader(month, year) {
        const monthNames = [
            'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
            'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
        ];
        
        let calendarHeader = document.querySelector('.calendar-header');
        if (!calendarHeader) {
            const calendarWidget = document.querySelector('.calendar-widget');
            if (!calendarWidget) return;
            
            calendarHeader = document.createElement('div');
            calendarHeader.className = 'calendar-header flex items-center justify-between mb-4';
            calendarHeader.innerHTML = `
                <button id="prevMonth" class="p-2 rounded-lg transition" style="background: transparent; border: 1px solid rgba(59, 159, 243, 0.25);" title="Poprzedni miesiąc">
                    <i class="fas fa-chevron-left" style="color: #5db2ff;"></i>
                </button>
                <h4 class="font-semibold text-lg" id="monthYear"></h4>
                <button id="nextMonth" class="p-2 rounded-lg transition" style="background: transparent; border: 1px solid rgba(59, 159, 243, 0.25);" title="Następny miesiąc">
                    <i class="fas fa-chevron-right" style="color: #5db2ff;"></i>
                </button>
            `;
            calendarWidget.insertBefore(calendarHeader, calendarWidget.firstChild);
        }
        
        document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
        
        // Update navigation buttons state
        const today = new Date();
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 2);
        
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
        prevBtn.disabled = isCurrentMonth;
        prevBtn.style.opacity = isCurrentMonth ? '0.3' : '1';
        
        const currentDate = new Date(year, month);
        const maxAllowedDate = new Date(today.getFullYear(), today.getMonth() + 2);
        nextBtn.disabled = currentDate >= maxAllowedDate;
        nextBtn.style.opacity = currentDate >= maxAllowedDate ? '0.3' : '1';
    }

    // Setup calendar navigation
    setupCalendarNavigation() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prevMonth' || e.target.closest('#prevMonth')) {
                const today = new Date();
                if (this.currentCalendarYear > today.getFullYear() || 
                    (this.currentCalendarYear === today.getFullYear() && this.currentCalendarMonth > today.getMonth())) {
                    this.currentCalendarMonth--;
                    if (this.currentCalendarMonth < 0) {
                        this.currentCalendarMonth = 11;
                        this.currentCalendarYear--;
                    }
                    this.generateCalendar(this.currentCalendarMonth, this.currentCalendarYear);
                }
            }
            
            if (e.target.id === 'nextMonth' || e.target.closest('#nextMonth')) {
                const maxDate = new Date();
                maxDate.setMonth(maxDate.getMonth() + 2);
                
                const nextMonth = new Date(this.currentCalendarYear, this.currentCalendarMonth + 1);
                if (nextMonth <= maxDate) {
                    this.currentCalendarMonth++;
                    if (this.currentCalendarMonth > 11) {
                        this.currentCalendarMonth = 0;
                        this.currentCalendarYear++;
                    }
                    this.generateCalendar(this.currentCalendarMonth, this.currentCalendarYear);
                }
            }
        });
    }

    // Setup form submission
    setupFormSubmission() {
        const bookingForm = document.getElementById('bookingForm');
        if (!bookingForm) return;
        
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(bookingForm);
            const selectedDateTime = window.getSelectedDateTime();
            
            // Collect form data
            const bookingData = {
                name: formData.get('name')?.trim() || bookingForm.querySelector('input[type="text"]').value.trim(),
                email: formData.get('email')?.trim() || bookingForm.querySelector('input[type="email"]').value.trim(),
                phone: formData.get('phone')?.trim() || bookingForm.querySelector('input[type="tel"]').value.trim(),
                company: formData.get('company')?.trim() || bookingForm.querySelectorAll('input[type="text"]')[1].value.trim(),
                industry: bookingForm.querySelector('select').value,
                description: bookingForm.querySelector('textarea').value.trim(),
                budget: bookingForm.querySelectorAll('select')[1].value,
                privacy: bookingForm.querySelector('input[type="checkbox"]').checked
            };
            
            // Validation
            const errors = [];
            
            if (!bookingData.name || bookingData.name.length < 2) {
                errors.push('Proszę podać poprawne imię i nazwisko (min. 2 znaki)');
            }
            
            if (!bookingData.email || !bookingData.email.includes('@')) {
                errors.push('Proszę podać poprawny adres email z symbolem @');
            }
            
            // Check email booking limit (max 2 bookings per email) - will be checked async during submission
            // This will be validated in the submission process
            
            if (!bookingData.company || bookingData.company.length < 2) {
                errors.push('Proszę podać nazwę firmy (min. 2 znaki)');
            }
            
            if (!selectedDateTime.date || !selectedDateTime.time) {
                errors.push('Proszę wybrać datę i godzinę spotkania w kalendarzu');
            }
            
            if (!bookingData.privacy) {
                errors.push('Proszę zaakceptować zgodę na przetwarzanie danych osobowych');
            }
            
            // Check if selected time slot is still available
            if (selectedDateTime.date && selectedDateTime.time) {
                const timeKey = `${selectedDateTime.date.toDateString()}-${selectedDateTime.time}`;
                
                if (this.firebaseManager && this.isFirebaseReady) {
                    // Will be checked in real-time during booking
                } else {
                    // Fallback localStorage check
                    const bookedSlots = new Set(JSON.parse(localStorage.getItem('bookedSlots') || '[]'));
                    if (bookedSlots.has(timeKey)) {
                        errors.push('Wybrany termin został już zarezerwowany. Proszę wybrać inny termin.');
                    }
                }
            }
            
            if (errors.length > 0) {
                alert('Błędy w formularzu:\n' + errors.join('\n'));
                return;
            }
            
            // Submit booking
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Wysyłanie...';
            submitButton.disabled = true;
            
            setTimeout(async () => {
                try {
                    // Check email booking limit
                    const emailBookingCount = await window.getEmailBookingCount(bookingData.email);
                    if (emailBookingCount >= 2) {
                        alert(`❌ Osiągnięto limit rezerwacji dla tego adresu email (max. 2 rezerwacje).\n\nJeśli potrzebujesz więcej spotkań, skontaktuj się z nami bezpośrednio:\n📞 +48 667 849 367\n📧 dron.marketingweb@gmail.com`);
                        submitButton.innerHTML = originalText;
                        submitButton.disabled = false;
                        return;
                    }
                    
                    const booking = await this.bookTimeSlot(selectedDateTime.date, selectedDateTime.time, bookingData);
                    
                    // Success message
                    alert(`✅ Dziękujemy za rezerwację!\n\nSpotkanie zaplanowane na:\n${new Date(booking.date).toLocaleDateString('pl-PL')} o godzinie ${booking.time}\n\nPotwierdzenie zostało wysłane na adres: ${booking.email}`);
                    
                    // Reset form
                    bookingForm.reset();
                    window.resetCalendarSelection();
                    
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                } catch (error) {
                    console.error('Booking error:', error);
                    alert('❌ Wystąpił błąd podczas rezerwacji. Proszę spróbować ponownie.');
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            }, 1500);
        });
    }
}

// Admin functions for managing bookings (Firebase + localStorage fallback)
window.getAllBookings = async function() {
    try {
        if (window.firebaseBookingManager) {
            const bookings = await window.firebaseBookingManager.getAllBookings();
            console.table(bookings);
            return bookings;
        } else {
            // Fallback to localStorage
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            console.table(bookings);
            return bookings;
        }
    } catch (error) {
        console.error('❌ Error getting bookings:', error);
        return [];
    }
};

window.getBookingsForDate = async function(dateString) {
    try {
        const bookings = await window.getAllBookings();
        const targetDate = new Date(dateString).toDateString();
        const filtered = bookings.filter(b => new Date(b.date).toDateString() === targetDate);
        console.table(filtered);
        return filtered;
    } catch (error) {
        console.error('❌ Error getting bookings for date:', error);
        return [];
    }
};

window.cancelBooking = async function(bookingId) {
    try {
        if (window.firebaseBookingManager) {
            const booking = await window.firebaseBookingManager.cancelBooking(bookingId);
            if (booking) {
                console.log('✅ Rezerwacja anulowana w Firebase:', booking);
                return booking;
            } else {
                console.error('❌ Nie znaleziono rezerwacji o ID:', bookingId);
                return null;
            }
        } else {
            // Fallback to localStorage
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            const booking = bookings.find(b => b.id === bookingId);
            
            if (booking) {
                // Remove from booked slots
                const bookedSlots = new Set(JSON.parse(localStorage.getItem('bookedSlots') || '[]'));
                bookedSlots.delete(booking.timeKey);
                localStorage.setItem('bookedSlots', JSON.stringify([...bookedSlots]));
                
                // Mark as cancelled
                booking.cancelled = true;
                localStorage.setItem('bookings', JSON.stringify(bookings));
                
                console.log('✅ Rezerwacja anulowana w localStorage:', booking);
                return booking;
            } else {
                console.error('❌ Nie znaleziono rezerwacji o ID:', bookingId);
                return null;
            }
        }
    } catch (error) {
        console.error('❌ Error cancelling booking:', error);
        return null;
    }
};

// Additional Firebase admin functions
window.migrateToFirebase = async function() {
    if (window.firebaseBookingManager) {
        try {
            await window.firebaseBookingManager.migrateLocalStorageData();
            console.log('✅ Migration to Firebase completed!');
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    } else {
        console.error('❌ Firebase not available');
    }
};

window.getEmailBookingCount = async function(email) {
    try {
        const bookings = await window.getAllBookings();
        return bookings.filter(b => b.email === email && !b.cancelled).length;
    } catch (error) {
        console.error('❌ Error counting email bookings:', error);
        return 0;
    }
};

// Initialize booking system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize EmailJS first
    if (typeof emailjs !== 'undefined') {
        emailjs.init('V3ydLx9GdC2_OudCa');
        console.log('✅ EmailJS initialized with key: V3ydLx9GdC2_OudCa');
    } else {
        console.error('❌ EmailJS library not loaded!');
    }
    
    // Initialize booking system
    const bookingSystem = new BookingSystem();
    bookingSystem.init();
    
    // Make booking system globally available
    window.bookingSystem = bookingSystem;
    
    // Auto-migrate localStorage data to Firebase if available (one-time)
    if (window.firebaseBookingManager) {
        // Check if migration has been done before
        const migrationKey = 'firebase_migration_completed';
        const migrationDone = localStorage.getItem(migrationKey);
        
        if (!migrationDone) {
            // Delay migration to ensure Firebase is fully initialized
            setTimeout(async () => {
                try {
                    console.log('🔄 Auto-migrating localStorage data to Firebase...');
                    await window.firebaseBookingManager.migrateLocalStorageData();
                    localStorage.setItem(migrationKey, 'true');
                    console.log('✅ Auto-migration completed!');
                } catch (error) {
                    console.error('❌ Auto-migration failed:', error);
                }
            }, 2000);
        }
    }
});