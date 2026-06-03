using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Services;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StaffController : ControllerBase
    {
        private readonly StaffService _staffService;
        public StaffController(StaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<Staff>>>> GetAllStaff()
        {
            try
            {
                var staffList = await _staffService.GetAllAsync();
                return Ok(new ApiResponse<List<Staff>>
                {
                    Message = "Staff retrieved successfully",
                    Status = true,
                    Result = staffList
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<Staff>>
                {
                    Message = ex.Message,
                    Status = false,
                    Result = null
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Staff>>> GetStaffById(string id)
        {
            try
            {
                var staff = await _staffService.GetByIdAsync(id);
                
                if (staff == null)
                {
                    return NotFound(new ApiResponse<Staff>
                    {
                        Message = "Staff not found",
                        Status = false,
                        Result = null
                    });
                }

                return Ok(new ApiResponse<Staff>
                {
                    Message = "Staff retrieved successfully",
                    Status = true,
                    Result = staff
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<Staff>
                {
                    Message = ex.Message,
                    Status = false,
                    Result = null 
                });
            }
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Staff>>> CreateStaff([FromBody] StaffDto dto)
        {
            try
            {
                if (dto == null)
                {   
                    return BadRequest(new ApiResponse<Staff>
                    {
                        Message = "Invalid staff data",
                        Status = false,
                        Result = null
                    });
                }

                var staff = new Staff
                {
                    Name = dto.Name,
                    Email = dto.Email,
                    Password = dto.Password,
                    Role = dto.Role,
                    IsActive = dto.IsActive,
                    JoinedDate = dto.JoinedDate,
                    SalonName = dto.SalonName
                };

                var created = await _staffService.CreateAsync(staff);

                return Ok(new ApiResponse<Staff>
                {
                    Message = "Staff created successfully",
                    Status = true,
                    Result = created
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<Staff>
                {
                    Message = ex.Message

                });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Staff>>> UpdateStaff(string id, [FromBody] StaffDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<Staff>
                    {
                        Message = "Invalid staff data",
                        Status = false,
                        Result = null
                    });
                }

                var existing = await _staffService.GetByIdAsync(id);
                
                if (existing == null)
                {
                    return NotFound(new ApiResponse<Staff>
                    {
                        Message = "Staff not found",
                        Status = false,
                        Result = null
                    });
                }

                existing.Name = dto.Name;
                existing.Email = dto.Email;
                existing.Password = dto.Password;
                existing.Role = dto.Role;
                existing.IsActive = dto.IsActive;
                existing.JoinedDate = dto.JoinedDate;
                existing.SalonName = dto.SalonName;

                var success = await _staffService.UpdateAsync(id, existing);
                
                if (!success)
                {
                    return StatusCode(500, new ApiResponse<Staff>
                    {
                        Message = "Failed to update staff",
                        Status = false,
                        Result = null
                    });
                }

                return Ok(new ApiResponse<Staff>
                {
                    Message = "Staff updated successfully",
                    Status = true,
                    Result = existing
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<Staff>
                {
                    Message = ex.Message,
                    Status = false,
                    Result = null
                });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteStaff(string id)
        {
            try
            {
                var existing = await _staffService.GetByIdAsync(id);
                
                if (existing == null)
                {
                    return NotFound(new ApiResponse<bool>
                    {
                        Message = "Staff not found",
                        Status = false,
                        Result = false
                    });
                }

                var success = await _staffService.DeleteAsync(id);
                
                if (!success)
                {
                    return StatusCode(500, new ApiResponse<bool>
                    {
                        Message = "Failed to delete staff",
                        Status = false,
                        Result = false
                    });
                }

                return Ok(new ApiResponse<bool>
                {
                    Message = "Staff deleted successfully",
                    Status = true,
                    Result = true
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<bool>
                {
                    Message = ex.Message,
                    Status = false,
                    Result = false
                });
            }
        }
    }
}