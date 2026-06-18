using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Services;
using SalonBackend.Models.Dtos;
using System.Security.Claims;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;

        public UserController(UserService userService)
        {
            _userService = userService;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<ApiResponse<object>>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Status = false,
                        Message = "Email and password are required",
                        Result = null
                    });
                }

                var result = await _userService.LoginAsync(request.Email, request.Password);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result
                    });
                }
                
                return BadRequest(new ApiResponse<object>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [AllowAnonymous]
        [HttpPost("register/customer")]
        public async Task<ActionResult<ApiResponse<object>>> RegisterCustomer([FromBody] RegisterCustomerRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterCustomerAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result
                    });
                }
                
                return BadRequest(new ApiResponse<object>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("register/admin")]
        public async Task<ActionResult<ApiResponse<object>>> RegisterAdmin([FromBody] RegisterAdminRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterAdminAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result
                    });
                }
                
                return BadRequest(new ApiResponse<object>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("register/employee")]
        public async Task<ActionResult<ApiResponse<object>>> RegisterEmployee([FromBody] RegisterEmployeeRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterEmployeeAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result
                    });
                }
                
                return BadRequest(new ApiResponse<object>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("register/superadmin")]
        public async Task<ActionResult<ApiResponse<object>>> RegisterSuperAdmin([FromBody] RegisterSuperAdminRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterSuperAdminAsync(dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<object>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result
                    });
                }
                
                return BadRequest(new ApiResponse<object>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpGet]
        public async Task<ActionResult<ApiResponse<object>>> GetAllUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 4)
        {
            try
            {
                if (page == 0 || pageSize == 0)
                {
                    var allUsers = await _userService.GetAllUsersAsync();
                    return Ok(new ApiResponse<List<User>>
                    {
                        Status = true,
                        Message = "Users retrieved successfully",
                        Result = allUsers
                    });
                }

                var (data, totalCount) = await _userService.GetPagedUsersAsync(page, pageSize);
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

                return Ok(new ApiResponse<object>
                {
                    Status = true,
                    Message = "Users retrieved successfully",
                    Result = new
                    {
                        Data = data,
                        Pagination = new
                        {
                            CurrentPage = page,
                            PageSize = pageSize,
                            TotalCount = totalCount,
                            TotalPages = totalPages,
                            HasNextPage = page < totalPages,
                            HasPreviousPage = page > 1
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> GetUserById(string id)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                
                if (user == null)
                {
                    return NotFound(new ApiResponse<User>
                    {
                        Status = false,
                        Message = "User not found",
                        Result = null
                    });
                }
                
                return Ok(new ApiResponse<User>
                {
                    Status = true,
                    Message = "User retrieved successfully",
                    Result = user
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<User>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<string>>> UpdateUser(string id, [FromBody] UpdateUserRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<string>
                    {
                        Status = false,
                        Message = "Invalid update data",
                        Result = null
                    });
                }

                var result = await _userService.UpdateUserAsync(id, dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<string>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = "Updated"
                    });
                }
                
                return BadRequest(new ApiResponse<string>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<string>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(string id)
        {
            try
            {
                var result = await _userService.DeleteUserAsync(id);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<bool>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = true
                    });
                }
                
                return BadRequest(new ApiResponse<bool>
                {
                    Status = false,
                    Message = result.Message,
                    Result = false
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<bool>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = false
                });
            }
        }
    }
}