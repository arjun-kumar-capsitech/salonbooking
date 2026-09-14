using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;
using SalonBackend.Services;
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
        public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new ApiResponse<LoginResponse>
                    {
                        Status = false,
                        Message = "Email and password are required",
                        Result = null
                    });
                }

                var result = await _userService.LoginAsync(request.Email, request.Password);

                if (result.Success && !string.IsNullOrEmpty(result.Token))
                {
                    Response.Cookies.Append("jwt_token", result.Token, new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.Strict,
                        Expires = DateTime.UtcNow.AddDays(7),
                        Path = "/"
                    });

                    return Ok(new ApiResponse<LoginResponse>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result.User
                    });
                }

                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }



        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("jwt_token");
            return Ok(new ApiResponse<object>
            {
                Status = true,
                Message = "Logged out successfully!",
                Result = null
            });
        }

        [AllowAnonymous]
        [HttpPost("register/customer")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RegisterCustomer([FromBody] RegisterCustomerRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<LoginResponse>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterCustomerAsync(dto);

                if (result.Success)
                {
                    return Ok(new ApiResponse<LoginResponse>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result.User
                    });
                }

                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [AllowAnonymous]
        [HttpPost("register/admin")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RegisterAdmin([FromBody] RegisterAdminRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<LoginResponse>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterAdminAsync(dto);

                if (result.Success)
                {
                    return Ok(new ApiResponse<LoginResponse>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result.User
                    });
                }

                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "Admin,SuperAdmin")]
        [HttpPost("register/employee")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RegisterEmployee([FromBody] RegisterEmployeeRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<LoginResponse>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterEmployeeAsync(dto);

                if (result.Success)
                {
                    return Ok(new ApiResponse<LoginResponse>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result.User
                    });
                }

                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [HttpPost("register/superadmin")]
        public async Task<ActionResult<ApiResponse<LoginResponse>>> RegisterSuperAdmin([FromBody] RegisterSuperAdminRequest dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new ApiResponse<LoginResponse>
                    {
                        Status = false,
                        Message = "Invalid registration data",
                        Result = null
                    });
                }

                var result = await _userService.RegisterSuperAdminAsync(dto);

                if (result.Success)
                {
                    return Ok(new ApiResponse<LoginResponse>
                    {
                        Status = true,
                        Message = result.Message,
                        Result = result.User
                    });
                }

                return BadRequest(new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<LoginResponse>
                {
                    Status = false,
                    Message = $"Error: {ex.Message}",
                    Result = null
                });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("approve-admin/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> ApproveAdmin(string id)
        {
            try
            {
                var success = await _userService.ApproveAdminAsync(id);
                if (success)
                {
                    return Ok(new ApiResponse<bool>
                    {
                        Status = true,
                        Message = "Admin approved successfully",
                        Result = true
                    });
                }
                return BadRequest(new ApiResponse<bool>
                {
                    Status = false,
                    Message = "Admin not found or already approved",
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

        [Authorize]
        [HttpPost("change-password")]
        public async Task<ActionResult<ApiResponse<string>>> ChangePassword(PasswordDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.ChangePasswordAsync(userId, dto);

            return result.Success
                ? Ok(new ApiResponse<string>
                {
                    Status = true,
                    Message = result.Message,
                    Result = null
                })
                : BadRequest(new ApiResponse<string>
                {
                    Status = false,
                    Message = result.Message,
                    Result = null
                });
        }

        // [AllowAnonymous]
        // [HttpPost("forgot-password")]
        // public async Task<ActionResult<ApiResponse<string>>> ForgotPassword(
        // PasswordDto dto)
        // {
        //     try
        //     {
        //         if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
        //         {
        //             return BadRequest(new ApiResponse<string>
        //             {
        //                 Status = false,
        //                 Message = "Email is required",
        //                 Result = null
        //             });
        //         }

        //         var result = await _userService.ForgotPasswordAsync(dto.Email);

        //         return Ok(new ApiResponse<string>
        //         {
        //             Status = result.Success,
        //             Message = result.Message,
        //             Result = null
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         return StatusCode(500, new ApiResponse<string>
        //         {
        //             Status = false,
        //             Message = $"Error: {ex.Message}",
        //             Result = null
        //         });
        //     }
        // }

    //     [AllowAnonymous]
    //     [HttpPost("reset-password")]
    //     public async Task<ActionResult<ApiResponse<string>>> ResetPassword(
    // [FromBody] PasswordDto dto)
    //     {
    //         try
    //         {
    //             if (dto == null)
    //             {
    //                 return BadRequest(new ApiResponse<string>
    //                 {
    //                     Status = false,
    //                     Message = "Invalid password data",
    //                     Result = null
    //                 });
    //             }

    //             var result = await _userService.ResetPasswordAsync(dto);

    //             if (!result.Success)
    //             {
    //                 return BadRequest(new ApiResponse<string>
    //                 {
    //                     Status = false,
    //                     Message = result.Message,
    //                     Result = null
    //                 });
    //             }

    //             return Ok(new ApiResponse<string>
    //             {
    //                 Status = true,
    //                 Message = result.Message,
    //                 Result = "Password reset successfully"
    //             });
    //         }
    //         catch (Exception ex)
    //         {
    //             return StatusCode(500, new ApiResponse<string>
    //             {
    //                 Status = false,
    //                 Message = $"Error: {ex.Message}",
    //                 Result = null
    //             });
    //         }
    //     }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("reject-admin/{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> RejectAdmin(string id)
        {
            try
            {
                var success = await _userService.RejectAdminAsync(id);
                if (success)
                {
                    return Ok(new ApiResponse<bool>
                    {
                        Status = true,
                        Message = "Admin rejected successfully",
                        Result = true
                    });
                }
                return BadRequest(new ApiResponse<bool>
                {
                    Status = false,
                    Message = "Admin not found or already rejected",
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

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<ApiResponse<PaginationDto<User>>>> GetAllUsers(
          int page = 1,
          int pageSize = 4)
        {
            try
            {
                var (data, totalCount) = await _userService.GetPagedUsersAsync(page, pageSize);
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

                return Ok(new ApiResponse<PaginationDto<User>>
                {
                    Status = true,
                    Message = "Users retrieved successfully",
                    Result = new PaginationDto<User>
                    {
                        Data = data,
                        CurrentPage = page,
                        PageSize = pageSize,
                        TotalCount = totalCount,
                        TotalPages = totalPages,
                        HasNextPage = page < totalPages,
                        HasPreviousPage = page > 1
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<PaginationDto<User>>
                {
                    Status = false,
                    Message = ex.Message,
                    Result = null
                });
            }
        }

        [Authorize]
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

        [Authorize]
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

        [Authorize]
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