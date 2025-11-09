import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { BookingService } from './booking.service';

class CreateBookingDto {
  userId: number;
  eventId: number;
  seatNumber: string;
}

@Controller('api/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(@Body() body: CreateBookingDto) {
    try {
      return await this.bookingService.createBooking(body);
    } catch (error) {
      if (error.status === HttpStatus.CONFLICT || error.status === HttpStatus.NOT_FOUND) {
        throw new HttpException(error.message, error.status);
      }
      console.error('Unhandled booking error:', error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}