using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminServicesController : ControllerBase
    {
        private readonly AdminService _adminService;

        public AdminServicesController(AdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllServices()
        {
            var services = await _adminService.GetAllAsync();
            return Ok(services);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetServiceById(string id)
        {
            var service = await _adminService.GetByIdAsync(id);
            if (service == null)
                return NotFound(new { message = "Service not found" });

            return Ok(service);
        }

        [HttpPost]
        public async Task<IActionResult> CreateService([FromBody] AdminServiceDto dto)
        {
            var service = new AdminServices
            {
                ServiceName = dto.ServiceName,
                Duration = dto.Duration,
                Price = dto.Price,
                IsActive = dto.IsActive
            };

            var created = await _adminService.CreateAsync(service);

            return CreatedAtAction(nameof(GetServiceById),
                new { id = created.Id },
                created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(string id, [FromBody] AdminServiceDto dto)
        {
            var existing = await _adminService.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = "Service not found" });

            existing.ServiceName = dto.ServiceName;
            existing.Duration = dto.Duration;
            existing.Price = dto.Price;
            existing.IsActive = dto.IsActive;

            var success = await _adminService.UpdateAsync(id, existing);

            if (!success)
                return StatusCode(500, new { message = "Failed to update service" });

            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteService(string id)
        {
            var existing = await _adminService.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = "Service not found" });

            var success = await _adminService.DeleteAsync(id);

            if (!success)
                return StatusCode(500, new { message = "Failed to delete service" });

            return Ok(new { message = "Service deleted successfully" });
        }
    }
}