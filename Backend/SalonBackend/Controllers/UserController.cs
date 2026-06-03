using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Services;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;

        public UserController(UserService userService)
        {
            _userService = userService;
        }

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

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<User>>>> GetAllUsers()
        {
            try
            {
                var users = await _userService.GetAllUsersAsync();
                
                return Ok(new ApiResponse<List<User>>
                {
                    Status = true,
                    Message = "Users retrieved successfully",
                    Result = users
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<User>>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

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

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> UpdateUser(string id, [FromBody] UpdateUserRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<User>
                    {
                        Status = false,
                        Message = "Invalid update data",
                        Result = null
                    });
                }

                var result = await _userService.UpdateUserAsync(id, dto);
                
                if (result.Success)
                {
                    return Ok(new ApiResponse<User>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = null
                    });
                }
                
                return BadRequest(new ApiResponse<User>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
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