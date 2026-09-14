using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SalonBackend.Models;
using SalonBackend.Models.Dtos;
using System.Security.Cryptography;

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
            public LoginResponse? User { get; set; }
        }

        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            var user = await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
            if (user == null)
                return new AuthResult { Success = false, Message = "Invalid email or password" };
            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return new AuthResult { Success = false, Message = "Invalid email or password" };
            if (user.Role == UserRole.Admin && user.ApprovalStatus != ApprovalStatus.Approved)
            {
                var msg = user.ApprovalStatus == ApprovalStatus.Rejected
                    ? "Your salon registration has been rejected."
                    : "Your salon registration is waiting for Super Admin approval.";
                return new AuthResult { Success = false, Message = msg };
            }

            if (!user.IsActive)
                return new AuthResult { Success = false, Message = "Account is deactivated" };
            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                User = new LoginResponse
                {
                    Token = token,
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    CompanyId = user.SalonName ?? string.Empty,
                    ExpiresAt = DateTime.UtcNow.AddDays(7)
                }
            };
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(
        string userId,
        PasswordDto dto)
        {
            var user = await GetUserByIdAsync(userId);

            if (user == null)
            {
                return (false, "User not found");
            }
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
            {
                return (false, "Current password is required");
            }
            if (string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return (false, "New password is required");
            }
            if (dto.NewPassword != dto.ConfirmPassword)
            {
                return (false, "New password and confirm password do not match");
            }

            var isPasswordValid = BCrypt.Net.BCrypt.Verify(
                dto.CurrentPassword,
                user.PasswordHash
            );
            if (!isPasswordValid)
            {
                return (false, "Current password is incorrect");
            }
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                dto.NewPassword
            );
            user.UpdatedAt = DateTime.UtcNow;
            await _users.ReplaceOneAsync(
                x => x.Id == userId,
                user
            );
            return (true, "Password changed successfully");
        }

        // public async Task<(bool Success, string Message)> ForgotPasswordAsync(string email)
        // {
        //     try
        //     {
        //         if (string.IsNullOrWhiteSpace(email))
        //         {
        //             return (false, "Email is required");
        //         }

        //         var user = await _users
        //             .Find(x => x.Email == email)
        //             .FirstOrDefaultAsync();

        //         if (user == null)
        //         {
        //             return (
        //                 true,
        //                 "If this email exists, a password reset link has been sent"
        //             );
        //         }

        //         var tokenBytes = RandomNumberGenerator.GetBytes(64);
        //         var token = Convert.ToBase64String(tokenBytes);

        //         user.ResetPasswordToken = token;
        //         user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(30);
        //         user.UpdatedAt = DateTime.UtcNow;

        //         var result = await _users.ReplaceOneAsync(
        //             x => x.Id == user.Id,
        //             user
        //         );

        //         if (!result.IsAcknowledged)
        //         {
        //             return (false, "Unable to generate password reset token");
        //         }

        //         if (result.ModifiedCount == 0)
        //         {
        //             return (false, "Password reset token was not saved");
        //         }

        //         return (
        //             true,
        //             "Password reset link has been generated"
        //         );
        //     }
        //     catch (Exception ex)
        //     {
        //         Console.WriteLine("FORGOT PASSWORD ERROR:");
        //         Console.WriteLine(ex.ToString());

        //         return (
        //             false,
        //             $"Forgot password error: {ex.Message}"
        //         );
        //     }
        // }
        //     public async Task<(bool Success, string Message)> ResetPasswordAsync(
        // PasswordDto dto)
        //     {
        //         if (string.IsNullOrWhiteSpace(dto.Token))
        //         {
        //             return (false, "Reset token is required");
        //         }

        //         if (string.IsNullOrWhiteSpace(dto.NewPassword))
        //         {
        //             return (false, "New password is required");
        //         }

        //         if (dto.NewPassword != dto.ConfirmPassword)
        //         {
        //             return (false, "New password and confirm password do not match");
        //         }

        //         var user = await _users
        //             .Find(x => x.ResetPasswordToken == dto.Token)
        //             .FirstOrDefaultAsync();

        //         if (user == null)
        //         {
        //             return (false, "Invalid reset token");
        //         }

        //         if (user.ResetPasswordTokenExpiry == null)
        //         {
        //             return (false, "Reset token is invalid");
        //         }

        //         if (user.ResetPasswordTokenExpiry < DateTime.UtcNow)
        //         {
        //             return (false, "Reset token has expired");
        //         }

        //         user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(
        //             dto.NewPassword
        //         );

        //         user.ResetPasswordToken = null;

        //         user.ResetPasswordTokenExpiry = null;

        //         user.UpdatedAt = DateTime.UtcNow;

        //         await _users.ReplaceOneAsync(
        //             x => x.Id == user.Id,
        //             user
        //         );

        //         return (
        //             true,
        //             "Password reset successfully"
        //         );
        //     }

        public async Task<AuthResult> RegisterCustomerAsync(RegisterCustomerRequest request)
        {
            return await RegisterUser(
                request.FullName,
                request.Email,
                request.PhoneNumber,
                "",
                "",
                request.Password,
                UserRole.Customer,
                ApprovalStatus.Approved
            );
        }

        public async Task<AuthResult> RegisterAdminAsync(RegisterAdminRequest request)
        {
            return await RegisterUser(
                request.FullName,
                request.Email,
                request.PhoneNumber,
                request.SalonName,
                request.SalonAddress,
                request.Password,
                UserRole.Admin,
                ApprovalStatus.Pending
            );
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
                UserRole.SuperAdmin,
                ApprovalStatus.Approved
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
                EmployeeProfileId = staff.Id,
                ApprovalStatus = ApprovalStatus.Approved
            };

            await _users.InsertOneAsync(user);
            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Message = "Employee registered successfully",
                Token = token,
                User = new LoginResponse
                {
                    Token = token,
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    CompanyId = string.Empty,
                    ExpiresAt = DateTime.UtcNow.AddDays(7)
                }
            };
        }

        private async Task<AuthResult> RegisterUser(
            string fullName,
            string email,
            string phoneNumber,
            string salonName,
            string salonAddress,
            string password,
            UserRole role,
            ApprovalStatus approvalStatus = ApprovalStatus.Approved)
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
                CreatedAt = DateTime.UtcNow,
                ApprovalStatus = approvalStatus
            };

            await _users.InsertOneAsync(user);
            var token = GenerateJwtToken(user);

            return new AuthResult
            {
                Success = true,
                Message = $"{role} registered successfully",
                Token = token,
                User = new LoginResponse
                {
                    Token = token,
                    UserId = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    CompanyId = user.SalonName ?? string.Empty,
                    ExpiresAt = DateTime.UtcNow.AddDays(7)
                }
            };
        }

        public async Task<bool> ApproveAdminAsync(string id)
        {
            var update = Builders<User>.Update
                .Set(x => x.ApprovalStatus, ApprovalStatus.Approved)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(
                x => x.Id == id && x.Role == UserRole.Admin,
                update
            );
            return result.ModifiedCount > 0;
        }

        public async Task<bool> RejectAdminAsync(string id)
        {
            var update = Builders<User>.Update
                .Set(x => x.ApprovalStatus, ApprovalStatus.Rejected)
                .Set(x => x.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(
                x => x.Id == id && x.Role == UserRole.Admin,
                update
            );
            return result.ModifiedCount > 0;
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            return await _users.Find(_ => true).ToListAsync();
        }

        public async Task<(List<User> Data, long TotalCount)> GetPagedUsersAsync(int page, int pageSize)
        {
            var totalCount = await _users.CountDocumentsAsync(_ => true);
            var data = await _users
                .Find(_ => true)
                .SortByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            return (data, totalCount);
        }

        public async Task<User?> GetUserByIdAsync(string id)
        {
            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<User?> GetByIdAsync(string id)
        {
            return await GetUserByIdAsync(id);
        }

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
                : (true, "User updated successfully");
        }

        public async Task<(bool Success, string Message)> DeleteUserAsync(string id)
        {
            var result = await _users.DeleteOneAsync(u => u.Id == id);
            return result.DeletedCount == 0
                ? (false, "User not found")
                : (true, "User deleted successfully");
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
                    new Claim("SalonName", user.SalonName ?? ""),
                    new Claim("UserId", user.Id)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
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