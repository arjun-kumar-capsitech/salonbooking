using Microsoft.AspNetCore.Mvc;
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
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _userService.LoginAsync(request.Email, request.Password);
            return result.Success ? Ok(result) : BadRequest(new { message = result.Message });
        }

        [HttpPost("register/customer")]
        public async Task<IActionResult> RegisterCustomer([FromBody] RegisterCustomerRequest dto)
        {
            var result = await _userService.RegisterCustomerAsync(dto);
            return result.Success ? Ok(result) : BadRequest(new { message = result.Message });
        }

        [HttpPost("register/admin")]
        public async Task<IActionResult> RegisterAdmin([FromBody] RegisterAdminRequest dto)
        {
            var result = await _userService.RegisterAdminAsync(dto);
            return result.Success ? Ok(result) : BadRequest(new { message = result.Message });
        }

        [HttpPost("register/employee")]
        public async Task<IActionResult> RegisterEmployee([FromBody] RegisterEmployeeRequest dto)
        {
            var result = await _userService.RegisterEmployeeAsync(dto);
            return result.Success ? Ok(result) : BadRequest(new { message = result.Message });
        }

        [HttpPost("register/superadmin")]
        public async Task<IActionResult> RegisterSuperAdmin([FromBody] RegisterSuperAdminRequest dto)
        {
            var result = await _userService.RegisterSuperAdminAsync(dto);
            return result.Success ? Ok(result) : BadRequest(new { message = result.Message });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(string id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            return user == null ? NotFound(new { message = "User not found" }) : Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest dto)
        {
            var result = await _userService.UpdateUserAsync(id, dto);
            return result.Success ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userService.DeleteUserAsync(id);
            return result.Success ? Ok(new { message = result.Message }) : BadRequest(new { message = result.Message });
        }
    }
}