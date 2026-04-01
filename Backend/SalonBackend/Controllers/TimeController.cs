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
        public async Task<IActionResult> GetAll()
        {
            var times = await _timeService.GetAllAsync();
            return Ok(times);
        }

        [HttpGet("{day}")]
        public async Task<IActionResult> GetByDay(string day)
        {
            var time = await _timeService.GetByDayAsync(day);
            if (time == null) return NotFound();
            return Ok(time);
        }

       
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TimeDto dto)
        {
            var created = await _timeService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetByDay), new { day = created.Day }, created);
        }

   
        [HttpPut("{day}")]
        public async Task<IActionResult> Update(string day, [FromBody] TimeDto dto)
        {
            var success = await _timeService.UpdateAsync(day, dto);
            if (!success) return NotFound();
            return Ok(new { message = "Time updated successfully" });
        }

       
        [HttpDelete("{day}")]
        public async Task<IActionResult> Delete(string day)
        {
            var success = await _timeService.DeleteAsync(day);
            if (!success) return NotFound();
            return Ok(new { message = "Time deleted successfully" });
        }
    }
}