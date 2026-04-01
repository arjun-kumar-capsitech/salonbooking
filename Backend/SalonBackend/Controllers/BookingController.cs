using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;
using System.Security.Claims;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BookingController : ControllerBase
    {
        private readonly BookingService _bookingService;

        public BookingController(BookingService bookingService)
        {
            _bookingService = bookingService;
        }

     
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bookings = await _bookingService.GetAllAsync();
            return Ok(bookings);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var booking = await _bookingService.GetByIdAsync(id);

            if (booking == null)
                return NotFound(new { message = "Booking not found" });

            return Ok(booking);
        }


        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid booking data" });

            var customerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrEmpty(customerId))
                return Unauthorized();

            var booking = new Booking
            {
                CustomerId = customerId,
                StaffId = dto.StaffId,
                ServiceId = dto.ServiceId,
                AppointmentDate = dto.AppointmentDate,
                SalonName = dto.SalonName,
                Amount = dto.Amount,
                Status = "pending"
            };

            var created = await _bookingService.CreateAsync(booking);

            return Ok(created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateBookingStatusDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid data" });

            var success = await _bookingService.UpdateStatusAsync(id, dto.Status);

            if (!success)
                return NotFound(new { message = "Booking not found" });

            return Ok(new { message = "Booking status updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _bookingService.DeleteAsync(id);

            if (!success)
                return NotFound(new { message = "Booking not found" });

            return Ok(new { message = "Booking deleted successfully" });
        }
    }
}