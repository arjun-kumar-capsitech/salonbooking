using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;
using System;

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
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var data = await _timeService.GetAllAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpGet("{day}")]
        public async Task<IActionResult> GetByDay(string day)
        {
            try
            {
                var data = await _timeService.GetByDayAsync(day);

                if (data == null)
                {
                    return NotFound(new { message = $"Time slots for '{day}' not found" });
                }

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdate([FromBody] TimeDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new { message = "Invalid time slot data" });
                }

                var data = await _timeService.CreateOrUpdateAsync(dto);

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpPut("{day}")]
        public async Task<IActionResult> Update(string day, [FromBody] TimeDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new { message = "Invalid time slot data" });
                }

                var success = await _timeService.UpdateAsync(day, dto);

                if (!success)
                {
                    return NotFound(new { message = $"Time slots for '{day}' not found" });
                }

                return Ok(new { message = "Time updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }

        [HttpDelete("{day}")]
        public async Task<IActionResult> Delete(string day)
        {
            try
            {
                var success = await _timeService.DeleteAsync(day);

                if (!success)
                {
                    return NotFound(new { message = $"Time slots for '{day}' not found" });
                }

                return Ok(new { message = "Time deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error: {ex.Message}" });
            }
        }
    }
}