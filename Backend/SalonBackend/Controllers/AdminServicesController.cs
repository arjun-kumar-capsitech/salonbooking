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
        public async Task<ActionResult<ApiResponse<List<AdminServices>>>> GetAllServices()
        {
            try
            {
                var services = await _adminService.GetAllAsync();

                return Ok(new ApiResponse<List<AdminServices>>
                {
                    Status = true,
                    Message = "Services retrieved successfully",
                    Result = services
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<AdminServices>>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<AdminServices>>> GetServiceById(string id)
        {
            try
            {
                var service = await _adminService.GetByIdAsync(id);

                if (service == null)
                {
                    return NotFound(new ApiResponse<AdminServices>
                    {
                        Status = false,
                        Message = "Service not found",
                        Result = null
                    });
                }

                return Ok(new ApiResponse<AdminServices>
                {
                    Status = true,
                    Message = "Service retrieved successfully",
                    Result = service
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<AdminServices>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpGet("by-salon/{salonName}")]
        public async Task<ActionResult<ApiResponse<List<AdminServices>>>> GetServicesBySalon(string salonName)
        {
            try
            {
                var services = await _adminService.GetBySalonNameAsync(salonName);

                return Ok(new ApiResponse<List<AdminServices>>
                {
                    Status = true,
                    Message = $"Services for salon: {salonName}",
                    Result = services
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<AdminServices>>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<AdminServices>>> CreateService([FromBody] AdminServiceDto dto)
        {
            try
            {
                var service = new AdminServices
                {
                    ServiceName = dto.ServiceName,
                    Duration = dto.Duration,
                    Price = dto.Price,
                    IsActive = dto.IsActive,
                    SalonName = dto.SalonName
                };

                var created = await _adminService.CreateAsync(service);

                return Ok(new ApiResponse<AdminServices>
                {
                    Status = true,
                    Message = "Service created successfully",
                    Result = created
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<AdminServices>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<AdminServices>>> UpdateService(string id, [FromBody] AdminServiceDto dto)
        {
            try
            {
                var existing = await _adminService.GetByIdAsync(id);

                if (existing == null)
                {
                    return NotFound(new ApiResponse<AdminServices>
                    {
                        Status = false,
                        Message = "Service not found",
                        Result = null
                    });
                }

                existing.ServiceName = dto.ServiceName;
                existing.Duration = dto.Duration;
                existing.Price = dto.Price;
                existing.IsActive = dto.IsActive;
                existing.SalonName = dto.SalonName;

                await _adminService.UpdateAsync(id, existing);

                return Ok(new ApiResponse<AdminServices>
                {
                    Status = true,
                    Message = "Service updated successfully",
                    Result = existing
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<AdminServices>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteService(string id)
        {
            try
            {
                var existing = await _adminService.GetByIdAsync(id);

                if (existing == null)
                {
                    return NotFound(new ApiResponse<bool>
                    {
                        Status = false,
                        Message = "Service not found",
                        Result = false
                    });
                }

                var deleted = await _adminService.DeleteAsync(id);

                return Ok(new ApiResponse<bool>
                {
                    Status = true,
                    Message = "Service deleted successfully",
                    Result = deleted
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<bool>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = false
                });
            }
        }
    }
}