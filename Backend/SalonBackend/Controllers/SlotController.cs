using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SlotController : ControllerBase
    {
        private readonly SlotService _slotService;

        public SlotController(SlotService slotService)
        {
            _slotService = slotService;
        }

        [HttpPost("available-slots")]
        public async Task<IActionResult> GetAvailableSlots([FromBody] SlotRequestDto request)
        {
            try
            {
                if (request == null)
                    return BadRequest(new { Status = false, Message = "Invalid request." });

                var result = await _slotService.GetAvailableSlotsAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }
    }
}