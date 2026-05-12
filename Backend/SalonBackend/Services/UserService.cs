using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;

namespace SalonBackend.Services
{
    public class UserService
    {
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<Staff> _staff;
        private readonly IConfiguration _configuration;

        public UserService(IConfiguration configuration, IMongoDatabase database)
        {
            _configuration = configuration;
            _users = database.GetCollection<User>("Users");
            _staff = database.GetCollection<Staff>("Staff");
        }

        public class AuthResult
        {
            public bool Success { get; set; }
            public string Message { get; set; } = string.Empty;
            public string? Token { get; set; }
            public object? User { get; set; }
        }

        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            var user = await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
            if (user == null) return new AuthResult { Success = false, Message = "User not found" };

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return new AuthResult { Success = false, Message = "Invalid password" };

            if (!user.IsActive)
                return new AuthResult { Success = false, Message = "Account is deactivated" };

            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true, 
                Message = "Login successful",
                Token = token,
                User = user
            };
        }
        public async Task<AuthResult> RegisterCustomerAsync(RegisterCustomerRequest request)
        {
            return await RegisterUser(request.FullName, request.Email, request.PhoneNumber, "", "", request.Password, UserRole.Customer);
        }
        public async Task<AuthResult> RegisterAdminAsync(RegisterAdminRequest request)
        {
            return await RegisterUser(request.FullName, request.Email, request.PhoneNumber, request.SalonName, request.SalonAddress, request.Password, UserRole.Admin);
        }
        public async Task<AuthResult> RegisterSuperAdminAsync(RegisterSuperAdminRequest request)
        {
            var exists = await _users.Find(u => u.Role == UserRole.SuperAdmin).AnyAsync();
            if (exists)
            {
                return new AuthResult
                {
                    Success = false,
                    Message = "SuperAdmin already exists"
                };
            }

            string fixedPassword = "Superadmin123";
             string fixedEmail = "Superadmin@gmail.com";

            return await RegisterUser(
                "SuperAdmin",
                fixedEmail,   
                "",
                "",
                "",
                fixedPassword,
                UserRole.SuperAdmin
            );
        }

        public async Task<AuthResult> RegisterEmployeeAsync(RegisterEmployeeRequest request)
        {
            var staff = await _staff.Find(s => s.Id == request.StaffId).FirstOrDefaultAsync();
            if (staff == null)
                return new AuthResult { Success = false, Message = "Staff not found" };

            var exists = await _users.Find(u => u.Email == staff.Email).AnyAsync();
            if (exists)
                return new AuthResult { Success = false, Message = "User already registered" };

            var user = new User
            {
                FullName = staff.Name,
                Email = staff.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(staff.Password),
                Role = UserRole.Employee,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                EmployeeProfileId = staff.Id
            };

            await _users.InsertOneAsync(user);
            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Message = "Employee registered successfully",
                Token = token,
                User = user
            };
        }

        private async Task<AuthResult> RegisterUser(string fullName, string email, string phoneNumber, string salonName, string salonAddress, string password, UserRole role)
        {
            var exists = await _users.Find(u => u.Email == email).AnyAsync();
            if (exists)
                return new AuthResult { Success = false, Message = "Email already exists" };

            var user = new User
            {
                FullName = fullName,
                Email = email,
                PhoneNumber = phoneNumber,
                SalonName = salonName,
                SalonAddress = salonAddress,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _users.InsertOneAsync(user);
            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Message = $"{role} registered successfully",
                Token = token,
                User = user
            };
        }

        public async Task<List<User>> GetAllUsersAsync() =>
            await _users.Find(_ => true).ToListAsync();

        public async Task<User?> GetUserByIdAsync(string id) =>
            await _users.Find(u => u.Id == id).FirstOrDefaultAsync();

        public async Task<User?> GetByIdAsync(string id) =>
            await GetUserByIdAsync(id);

        public async Task<(bool Success, string Message)> UpdateUserAsync(string id, UpdateUserRequest request)
        {
            var update = Builders<User>.Update
                .Set(u => u.FullName, request.FullName)
                .Set(u => u.Email, request.Email)
                .Set(u => u.PhoneNumber, request.PhoneNumber)
                .Set(u => u.SalonName, request.SalonName)
                .Set(u => u.SalonAddress, request.SalonAddress)
                .Set(u => u.Role, (UserRole)request.Role)
                .Set(u => u.IsActive, request.IsActive)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(u => u.Id == id, update);

            return result.ModifiedCount == 0
                ? (false, "User not updated")
                : (true, "User updated");
        }

        public async Task<(bool Success, string Message)> DeleteUserAsync(string id)
        {
            var result = await _users.DeleteOneAsync(u => u.Id == id);

            return result.DeletedCount == 0
                ? (false, "User not found")
                : (true, "User deleted");
        }

        private string GenerateJwtToken(User user)
        {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(
        _configuration["Jwt:Secret"] ?? "your-secret-key-minimum-32-characters-long-here"
        );

        var tokenDescriptor = new SecurityTokenDescriptor
        {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("SalonName", user.SalonName ?? "")
        }),
        Expires = DateTime.UtcNow.AddHours(5), 
        SigningCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature
        )
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
        }
    }
}