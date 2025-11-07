import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let waitingRoomTime = new Trend('waiting_room_time');
export let bookingTime = new Trend('booking_time');
export let paymentTime = new Trend('payment_time');

// Test configuration for 1M requests
export let options = {
  stages: [
    { duration: '1m', target: 1000 },    // Warm up
    { duration: '3m', target: 5000 },    // Ramp up
    { duration: '5m', target: 10000 },   // Continue ramping
    { duration: '10m', target: 15000 },  // Peak load
    { duration: '15m', target: 20000 },  // Sustained peak
    { duration: '5m', target: 0 },       // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95% of requests under 2s
    http_req_failed: ['rate<0.15'],      // Error rate below 15%
    errors: ['rate<0.15'],
    waiting_room_time: ['p(95)<5000'],   // Waiting room under 5s
    bookingTime: ['p(95)<3000'],         // Booking under 3s
    paymentTime: ['p(95)<5000'],         // Payment under 5s
  },
};

const BASE_URL = 'https://your-concert-booking-app.com';
const CONCERT_ID = 'blackpink-world-tour-2024';

// User behavior scenarios
const USER_SCENARIOS = {
  QUICK_BOOKER: 0.4,     // 40% - Know what they want
  BROWSER: 0.3,          // 30% - Browse around
  HESITANT: 0.2,         // 20% - Take longer to decide
  ERROR_PRONE: 0.1,      // 10% - Make mistakes
};

export default function() {
  // Determine user scenario
  let rand = Math.random();
  let scenario;
  
  if (rand < USER_SCENARIOS.QUICK_BOOKER) {
    scenario = 'QUICK_BOOKER';
  } else if (rand < USER_SCENARIOS.QUICK_BOOKER + USER_SCENARIOS.BROWSER) {
    scenario = 'BROWSER';
  } else if (rand < USER_SCENARIOS.QUICK_BOOKER + USER_SCENARIOS.BROWSER + USER_SCENARIOS.HESITANT) {
    scenario = 'HESITANT';
  } else {
    scenario = 'ERROR_PRONE';
  }
  
  // Enter waiting room
  let waitingRoomStart = Date.now();
  let waitingRoomResponse = http.get(`${BASE_URL}/waiting-room?concertId=${CONCERT_ID}`);
  waitingRoomTime.add(Date.now() - waitingRoomStart);
  
  let waitingRoomOK = check(waitingRoomResponse, {
    'waiting room status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(!waitingRoomOK);
  
  // Wait in queue (simulated)
  let queueTime = scenario === 'QUICK_BOOKER' ? randomIntBetween(1, 3) : 
                  scenario === 'BROWSER' ? randomIntBetween(2, 5) :
                  scenario === 'HESITANT' ? randomIntBetween(5, 10) :
                  randomIntBetween(3, 8);
  
  sleep(queueTime);
  
  // Get concert info
  let concertResponse = http.get(`${BASE_URL}/api/concerts/${CONCERT_ID}`);
  
  // Get available seats
  let seatsResponse = http.get(`${BASE_URL}/api/seats/available?concertId=${CONCERT_ID}`);
  let seatsOK = check(seatsResponse, {
    'seats status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(!seatsOK);
  
  if (seatsOK) {
    let seats = JSON.parse(seatsResponse.body).seats;
    
    // User behavior based on scenario
    let selectedSeats;
    if (scenario === 'QUICK_BOOKER') {
      // Select first available seats
      selectedSeats = seats.slice(0, randomIntBetween(1, 4));
    } else if (scenario === 'BROWSER') {
      // Browse through sections
      sleep(randomIntBetween(2, 5));
      let preferredSection = randomItem(['VIP', 'ORCHESTRA', 'MEZZANINE']);
      selectedSeats = seats.filter(s => s.section === preferredSection).slice(0, randomIntBetween(1, 3));
    } else if (scenario === 'HESITANT') {
      // Check multiple sections
      sleep(randomIntBetween(5, 10));
      selectedSeats = seats.slice(0, randomIntBetween(1, 2));
    } else {
      // ERROR_PRONE: Make invalid requests sometimes
      if (Math.random() < 0.3) {
        // Request more seats than allowed
        selectedSeats = seats.slice(0, randomIntBetween(10, 20));
      } else {
        selectedSeats = seats.slice(0, randomIntBetween(1, 4));
      }
    }
    
    if (selectedSeats.length > 0) {
      // Attempt booking
      let bookingStart = Date.now();
      let bookingResponse = http.post(`${BASE_URL}/api/bookings`, 
        JSON.stringify({
          concertId: CONCERT_ID,
          seats: selectedSeats.map(s => ({ id: s.id, price: s.price })),
        }), 
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      bookingTime.add(Date.now() - bookingStart);
      
      let bookingOK = check(bookingResponse, {
        'booking status is 200 or 409': (r) => r.status === 200 || r.status === 409,
      });
      
      errorRate.add(!bookingOK);
      
      if (bookingResponse.status === 200) {
        let booking = JSON.parse(bookingResponse.body);
        
        // Payment process
        let paymentDelay = scenario === 'QUICK_BOOKER' ? randomIntBetween(2, 5) :
                           scenario === 'BROWSER' ? randomIntBetween(5, 10) :
                           scenario === 'HESITANT' ? randomIntBetween(10, 20) :
                           randomIntBetween(5, 15);
        
        sleep(paymentDelay);
        
        let paymentStart = Date.now();
        let paymentResponse = http.post(`${BASE_URL}/api/payments`, 
          JSON.stringify({
            bookingId: booking.id,
            paymentMethod: scenario === 'ERROR_PRONE' && Math.random() < 0.3 ? 'invalid_method' : 'credit_card',
            amount: booking.totalAmount,
          }), 
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
        paymentTime.add(Date.now() - paymentStart);
        
        let paymentOK = check(paymentResponse, {
          'payment status is 200 or 402': (r) => r.status === 200 || r.status === 402,
        });
        
        errorRate.add(!paymentOK);
      }
    }
  }
}
