using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SalonBackend.Models
{
    public class Company 
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonRequired]
        public string SalonName { get; set; } = string.Empty;

        [BsonRequired]
        public string OwnerName { get; set; } = string.Empty;

        [BsonRequired]
        public string Email { get; set; } = string.Empty;

        [BsonRequired]
        public string PhoneNumber { get; set; } = string.Empty;

        [BsonRequired]
        public string Address { get; set; } = string.Empty;

        [BsonRequired]
        public string Status { get; set; } = string.Empty;
    }
}