using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SalonBackend.Models
{
    public class AdminServices
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string ServiceName { get; set; } = string.Empty;
        public int Duration { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public string SalonName { get; set; } = string.Empty;
    }
}