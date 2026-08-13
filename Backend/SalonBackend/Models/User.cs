using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SalonBackend.Models
{
    public enum UserRole
    {
        SuperAdmin = 1,
        Admin = 2,
        Employee = 3,
        Customer = 4
    }

    public enum ApprovalStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("FullName")]
        public string FullName { get; set; } = string.Empty;

        [BsonElement("Email")]
        [BsonRequired]
        public string Email { get; set; } = string.Empty;

        [BsonElement("PhoneNumber")]
        public string PhoneNumber { get; set; } = string.Empty;

        [BsonElement("PasswordHash")]
        public string PasswordHash { get; set; } = string.Empty;

        [BsonElement("SalonName")]
        public string SalonName { get; set; } = string.Empty;

        [BsonElement("SalonAddress")]
        public string SalonAddress { get; set; } = string.Empty;

        [BsonElement("Role")]
        [BsonRepresentation(BsonType.String)]
        public UserRole Role { get; set; } = UserRole.Customer;

        [BsonElement("ApprovalStatus")]
        [BsonRepresentation(BsonType.String)]
        public ApprovalStatus ApprovalStatus { get; set; } = ApprovalStatus.Approved;

        [BsonElement("IsActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("CompanyId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? CompanyId { get; set; }

        [BsonElement("CustomerProfileId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? CustomerProfileId { get; set; }

        [BsonElement("EmployeeProfileId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? EmployeeProfileId { get; set; }

        [BsonElement("Name")]
        public string? Name { get; set; }
    }
}