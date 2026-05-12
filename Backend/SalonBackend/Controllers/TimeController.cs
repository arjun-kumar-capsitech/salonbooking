using Microsoft.AspNetCore.Mvc;
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
        public async Task<IActionResult> GetAll()
        {
            var data = await _timeService.GetAllAsync();
            return Ok(data);
        }

        [HttpGet("{day}")]
        public async Task<IActionResult> GetByDay(string day)
        {
            var data = await _timeService.GetByDayAsync(day);

            if (data == null)
            {
                return NotFound();
            }

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrUpdate(
            [FromBody] TimeDto dto
        )
        {
            var data = await _timeService.CreateOrUpdateAsync(dto);

            return Ok(data);
        }

        [HttpPut("{day}")]
        public async Task<IActionResult> Update(
            string day,
            [FromBody] TimeDto dto
        )
        {
            var success = await _timeService.UpdateAsync(day, dto);

            if (!success)
            {
                return NotFound();
            }

            return Ok(new
            {
                message = "Time updated successfully"
            });
        }

        [HttpDelete("{day}")]
        public async Task<IActionResult> Delete(string day)
        {
            var success = await _timeService.DeleteAsync(day);

            if (!success)
            {
                return NotFound();
            }

            return Ok(new
            {
                message = "Time deleted successfully"
            });
        }
    }
}