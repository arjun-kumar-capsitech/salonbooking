using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Services;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StaffController :ControllerBase
    {
        private readonly StaffService _staffService;

        public StaffController(StaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllStaff()
        {
            var staffList = await _staffService.GetAllAsync();
            return Ok(staffList);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetStaffById(string id)
        {
            var staff = await _staffService.GetByIdAsync(id);
            if (staff == null) return NotFound();

            return Ok(staff);
        }

        [HttpPost]
        public async Task<IActionResult> CreateStaff([FromBody] StaffDto dto)
        {
            var staff = new Staff
            {
                Name = dto.Name,
                Email = dto.Email,
                Password = dto.Password,
                Role = dto.Role,
                IsActive = dto.IsActive,
                JoinedDate = dto.JoinedDate
            };

            var created = await _staffService.CreateAsync(staff);

            return CreatedAtAction(nameof(GetStaffById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStaff(string id, [FromBody] StaffDto dto)
        {
            var existing = await _staffService.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.Name = dto.Name;
            existing.Password = dto.Password;
            existing.Email = dto.Email;
            existing.Role = dto.Role;
            existing.IsActive = dto.IsActive;
            existing.JoinedDate = dto.JoinedDate;

            var success = await _staffService.UpdateAsync(id, existing);
            if (!success) return StatusCode(500, "Failed to update");

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStaff(string id)
        {
            var existing = await _staffService.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var success = await _staffService.DeleteAsync(id);
            if (!success) return StatusCode(500, "Failed to delete");

            return Ok(new { message = "Staff deleted successfully" });
        }
    }
}