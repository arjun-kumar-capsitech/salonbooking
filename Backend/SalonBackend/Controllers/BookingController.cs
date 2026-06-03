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
        public async Task<ActionResult<ApiResponse<List<Booking>>>> GetAllBooking()
        {
            try
            {
                var bookings = await _bookingService.GetAllAsync();

                return Ok(new ApiResponse<List<Booking>>
                {
                    Status = true,
                    Message = "Bookings retrieved successfully",
                    Result = bookings
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<Booking>>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Booking>>> GetById(string id)
        {
            try
            {
                var booking = await _bookingService.GetByIdAsync(id);

                if (booking == null)
                {
                    return NotFound(new ApiResponse<Booking>
                    { 
                        Status = false,
                        Message = "Booking not found",
                        Result = null
                    });
                }

                return Ok(new ApiResponse<Booking>
                {
                    Status = true,
                    Message = "Booking retrieved successfully",
                    Result = booking
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<Booking>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Booking>>> Create([FromBody] BookingDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<Booking>
                    {
                        Status = false,
                        Message = "Invalid booking data",
                        Result = null
                    });
                }

                var customerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                if (string.IsNullOrEmpty(customerId))
                {
                    return Unauthorized(new ApiResponse<Booking>
                    {
                        Status = false,
                        Message = "Unauthorized user",
                        Result = null
                    });
                }

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

                return Ok(new ApiResponse<Booking>
                {
                    Status = true,
                    Message = "Booking created successfully",
                    Result = created
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<Booking>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<string>>> UpdateStatus(string id, [FromBody] UpdateBookingStatusDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<string>
                    {
                        Status = false,
                        Message = "Invalid data",
                        Result = null
                    });
                }

                var success = await _bookingService.UpdateStatusAsync(id, dto.Status);

                if (!success)
                {
                    return NotFound(new ApiResponse<string>
                    {
                        Status = false,
                        Message = "Booking not found",
                        Result = null
                    });
                }

                return Ok(new ApiResponse<string>
                {
                    Status = true,
                    Message = "Booking status updated successfully",
                    Result = "Updated"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<string>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<string>>> Delete(string id)
        {
            try
            {
                var success = await _bookingService.DeleteAsync(id);

                if (!success)
                {
                    return NotFound(new ApiResponse<string>
                    {
                        Status = false,
                        Message = "Booking not found",
                        Result = null
                    });
                }

                return Ok(new ApiResponse<string>
                {
                    Status = true,
                    Message = "Booking deleted successfully",
                    Result = "Deleted"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<string>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }
    }
}