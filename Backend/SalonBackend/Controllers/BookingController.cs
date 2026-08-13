using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
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
        private readonly IHubContext<Hubs.BookingHub> _hubContext;

        public BookingController(
            BookingService bookingService,
            IHubContext<Hubs.BookingHub> hubContext)
        {
            _bookingService = bookingService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<PaginationDto<Booking>>>> GetAllBooking(
          int page = 1,
          int pageSize = 10)
        {
            try
            {
                var (data, totalCount) =
                    await _bookingService.GetPagedAsync(page, pageSize);

                var totalPages =
                    (int)Math.Ceiling(totalCount / (double)pageSize);

                return Ok(new ApiResponse<PaginationDto<Booking>>
                {
                    Status = true,
                    Message = "Bookings retrieved successfully",

                    Result = new PaginationDto<Booking>
                    {
                        Data = data,
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalCount = totalCount,
                        TotalPages = totalPages,
                        HasNextPage = page < totalPages,
                        HasPreviousPage = page > 1
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<PaginationDto<Booking>>
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

                if (string.IsNullOrWhiteSpace(dto.CustomerName))
                {
                    return BadRequest(new ApiResponse<Booking>
                    {
                        Status = false,
                        Message = "Customer name is required",
                        Result = null
                    });
                }

                var customerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

                string finalCustomerId = !string.IsNullOrEmpty(dto.CustomerId)
                    ? dto.CustomerId
                    : customerId ?? string.Empty;

                var booking = new Booking
                {
                    CustomerId = finalCustomerId,
                    CustomerName = dto.CustomerName.Trim(),
                    StaffId = dto.StaffId,
                    ServiceId = dto.ServiceId,
                    ServiceIds = dto.ServiceIds ?? new(),
                    AppointmentDate = dto.AppointmentDate,
                    SalonName = dto.SalonName,
                    Amount = dto.Amount,
                    Status = "pending",
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime
                };

                var created = await _bookingService.CreateAsync(booking);
                await _hubContext.Clients.All.SendAsync("SlotBooked", created);
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

                var existingBooking = await _bookingService.GetByIdAsync(id);
                if (existingBooking == null)
                {
                    return NotFound(new ApiResponse<string>
                    {
                        Status = false,
                        Message = "Booking not found",
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

                var updatedBooking = await _bookingService.GetByIdAsync(id);
                await _hubContext.Clients.All.SendAsync("BookingUpdated", updatedBooking);
                if (dto.Status.ToLower() == "completed" || dto.Status.ToLower() == "cancelled")
                {
                    await _hubContext.Clients.All.SendAsync("SlotReleased", id);
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

                await _hubContext.Clients.All.SendAsync("SlotReleased", id);

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