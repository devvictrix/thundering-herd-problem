import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp up to 1,000 users
    { duration: '5m', target: 5000 },   // Ramp up to 5,000 users
    { duration: '10m', target: 10000 }, // Ramp up to 10,000 users
    { duration: '20m', target: 15000 }, // Peak at 15,000 users
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],      // Error rate below 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://your-concert-booking-app.com';

export function setup() {
  // Setup code - create test data, authenticate, etc.
  console.log('Setting up test environment...');
  return { authToken: 'test-token' };
}

export default function(data) {
  // Simulate user entering waiting room
  let waitingRoomResponse = http.get(`${BASE_URL}/waiting-room`, {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
      'User-Agent': 'k6-load-test',
    },
  });
  
  let waitingRoomOK = check(waitingRoomResponse, {
    'waiting room status is 200': (r) => r.status === 200,
    'waiting room response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!waitingRoomOK);
  
  // Simulate user being released from waiting room
  sleep(Math.random() * 3 + 1); // Random wait 1-4 seconds
  
  // Get available seats
  let seatsResponse = http.get(`${BASE_URL}/api/seats/available`, {
    headers: {
      'Authorization': `Bearer ${data.authToken}`,
    },
  });
  
  let seatsOK = check(seatsResponse, {
    'seats status is 200': (r) => r.status === 200,
    'seats returned data': (r) => JSON.parse(r.body).seats.length > 0,
  });
  
  errorRate.add(!seatsOK);
  
  if (seatsOK) {
    let seats = JSON.parse(seatsResponse.body).seats;
    let randomSeat = seats[Math.floor(Math.random() * seats.length)];
    
    // Attempt to book a seat
    let bookingResponse = http.post(`${BASE_URL}/api/bookings`, 
      JSON.stringify({
        seatId: randomSeat.id,
        concertId: 'blackpink-world-tour-2024',
      }), 
      {
        headers: {
          'Authorization': `Bearer ${data.authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    let bookingOK = check(bookingResponse, {
      'booking status is 200 or 409': (r) => r.status === 200 || r.status === 409, // 409 for seat already taken
      'booking response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!bookingOK);
    
    if (bookingResponse.status === 200) {
      let booking = JSON.parse(bookingResponse.body);
      
      // Simulate payment process
      sleep(Math.random() * 5 + 2); // Random wait 2-7 seconds
      
      let paymentResponse = http.post(`${BASE_URL}/api/payments`, 
        JSON.stringify({
          bookingId: booking.id,
          paymentMethod: 'credit_card',
          amount: booking.price,
        }), 
        {
          headers: {
            'Authorization': `Bearer ${data.authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      let paymentOK = check(paymentResponse, {
        'payment status is 200 or 402': (r) => r.status === 200 || r.status === 402, // 402 for payment failed
        'payment response time < 5000ms': (r) => r.timings.duration < 5000,
      });
      
      errorRate.add(!paymentOK);
    }
  }
  
  // Think time between requests
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('Test completed. Cleaning up...');
}
