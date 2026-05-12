using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.RegularExpressions;

namespace SalonBackend.Models
{
    public enum UserRole
    {
        SuperAdmin = 1,
        Admin = 2,
        Employee = 3,
        Customer = 4
    }
    
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        private string _fullName = string.Empty;
        public string FullName
        {
            get => _fullName;
            set => _fullName = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
        }

        private string _email = string.Empty;
        [BsonRequired]
        public string Email
        {
            get => _email;
            set => _email = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
        }

        private string _phoneNumber = string.Empty;
        public string PhoneNumber
        {
            get => _phoneNumber;
            set => _phoneNumber = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
        }

        private string _passwordHash = string.Empty;
        public string PasswordHash
        {
            get => _passwordHash;
            set => _passwordHash = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
        }

        private string _salonName = string.Empty;
        public string SalonName 
        {
            get => _salonName;
            set => _salonName = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
     }

        private string _salonAddress = string.Empty;
        public string SalonAddress
        {
            get => _salonAddress;
            set => _salonAddress = string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : Regex.Replace(value, @"\s+", " ").Trim();
        }

        [BsonRepresentation(BsonType.String)]
        public UserRole Role { get; set; } = UserRole.Customer;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string? CompanyId { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string? CustomerProfileId { get; set; }

        [BsonRepresentation(BsonType.ObjectId)]
        public string? EmployeeProfileId { get; set; }
    }
}