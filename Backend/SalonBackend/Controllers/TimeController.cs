using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TimeController : ControllerBase
    {
        private readonly TimeService _timeService;

        public TimeController(TimeService timeService)
        {
            _timeService = timeService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? userId = null)
        {
            try
            {
                if (!string.IsNullOrEmpty(userId))
                {
                    var data = await _timeService.GetByUserIdAsync(userId);
                    return Ok(new { status = true, result = data });
                }

                var allData = await _timeService.GetAllAsync();
                return Ok(new { status = true, result = allData });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet("{day}")]
        public async Task<IActionResult> GetByDay(string day, [FromQuery] string? userId = null)
        {
            try
            {
                Time? data;

                if (!string.IsNullOrEmpty(userId))
                {
                    data = await _timeService.GetByUserIdAndDayAsync(userId, day);
                }
                else
                {
                    data = await _timeService.GetByDayAsync(day);
                }

                if (data is null)
                {
                    return NotFound(new { status = false, message = $"Time slots for '{day}' not found" });
                }

                return Ok(new { status = true, result = data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdate([FromBody] TimeDto dto)
        {
            try
            {
                if (dto is null || string.IsNullOrEmpty(dto.UserId))
                {
                    return BadRequest(new { status = false, message = "Invalid time slot data or missing UserId" });
                }

                var data = await _timeService.CreateOrUpdateAsync(dto);
                return Ok(new { status = true, result = data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error: {ex.Message}" });
            }
        }

        [HttpPut("{day}")]
        public async Task<IActionResult> Update(string day, [FromBody] TimeDto dto)
        {
            try
            {
                if (dto is null || string.IsNullOrEmpty(dto.UserId))
                {
                    return BadRequest(new { status = false, message = "Invalid time slot data or missing UserId" });
                }

                var success = await _timeService.UpdateAsync(dto.UserId, day, dto);

                if (!success)
                {
                    return NotFound(new { status = false, message = $"Time slots for '{day}' not found for this user" });
                }

                return Ok(new { status = true, message = "Time updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error: {ex.Message}" });
            }
        }

        [HttpDelete("{day}")]
        public async Task<IActionResult> Delete(string day, [FromQuery] string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    return BadRequest(new { status = false, message = "UserId is required" });
                }

                var success = await _timeService.DeleteAsync(userId, day);

                if (!success)
                {
                    return NotFound(new { status = false, message = $"Time slots for '{day}' not found for this user" });
                }

                return Ok(new { status = true, message = "Time deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = $"Error: {ex.Message}" });
            }
        }
    }
}